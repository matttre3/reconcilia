import type { ImportResult, Transaction, IgnoredRow, ImportWarning } from "@/types";
import { detectFileProfile } from "./detectFileProfile";
import { normalizeAmount } from "./normalizeAmount";
import { normalizeDate } from "./normalizeDate";
import { normalizeText } from "./normalizeText";
import { newTransactionId } from "@/lib/utils/ids";

const COL_DATA = ["pagamento", "data", "data pagamento"];
const COL_DESCRIZIONE = ["descrizione"];
const COL_ENTRATE = ["entrate"];
const COL_USCITE = ["uscite"];
const COL_SUBTOTALE = ["subtot.", "subtot", "subtotale"];
const COL_PROTOCOLLO = ["protocollo"];
const COL_DOCUMENTO = ["documento / pagamento", "documento"];

const SALDO_KEYWORDS = ["saldo iniziale", "saldo finale", "saldo al", "saldo"];
const PLACEHOLDER_VALUES = ["-", "–", "—", "−"];

export function importDanea(rows: unknown[][]): ImportResult {
  const detected = detectFileProfile(rows);

  if (detected.profile !== "danea") {
    return {
      profile: "unknown",
      transactions: [],
      ignoredRows: [],
      warnings: [{
        message: "Il file non è stato riconosciuto come export Danea.",
        severity: "error",
      }],
      detectedColumns: {},
    };
  }

  const { headerRowIndex, columnMap } = detected;
  const colIdx = resolveColumns(columnMap);

  const warnings: ImportWarning[] = [];
  const ignoredRows: IgnoredRow[] = [];
  const transactions: Transaction[] = [];

  if (colIdx.entrate === -1 && colIdx.uscite === -1) {
    warnings.push({
      message: "Non trovate colonne 'Entrate' o 'Uscite'. Il file potrebbe non avere dati validi.",
      severity: "error",
    });
  }

  const detectedColumns: Record<string, string> = {};
  Object.entries(colIdx).forEach(([key, idx]) => {
    if (idx !== -1) {
      const colName = Object.entries(columnMap).find(([, v]) => v === idx)?.[0] ?? "";
      detectedColumns[key] = colName;
    }
  });

  for (let rowIdx = headerRowIndex + 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rawObj = buildRawObject(columnMap, row);

    // 1. Riga vuota → ignora
    if (isEmptyRow(row)) {
      ignoredRows.push({ originalRowIndex: rowIdx, reason: "Riga vuota", raw: rawObj });
      continue;
    }

    const descrizione = normalizeText(getCell(row, colIdx.descrizione));

    // 2. Riga saldo → ignora
    if (isSaldoRow(descrizione)) {
      ignoredRows.push({
        originalRowIndex: rowIdx,
        reason: `Riga saldo ignorata: "${descrizione}"`,
        raw: rawObj,
      });
      continue;
    }

    // 3. Riga senza descrizione reale → ignora (cattura totalone, subtotali, ecc.)
    if (!descrizione || isPlaceholder(descrizione)) {
      ignoredRows.push({
        originalRowIndex: rowIdx,
        reason: "Riga senza descrizione ignorata",
        raw: rawObj,
      });
      continue;
    }

    // 4. Leggi entrate e uscite (subtotale ignorato del tutto)
    const entrateCents = normalizeAmount(getCell(row, colIdx.entrate));
    const usciteCents = normalizeAmount(getCell(row, colIdx.uscite));

    let amountCents: number;
    let direction: "in" | "out";

    if (entrateCents !== null && entrateCents !== 0) {
      amountCents = Math.abs(entrateCents);
      direction = "in";
    } else if (usciteCents !== null && usciteCents !== 0) {
      amountCents = -Math.abs(usciteCents);
      direction = "out";
    } else {
      ignoredRows.push({
        originalRowIndex: rowIdx,
        reason: "Riga senza Entrate né Uscite valorizzate",
        raw: rawObj,
      });
      continue;
    }

    const rawDate = getCell(row, colIdx.data);
    const dateStr = normalizeDate(rawDate);

    if (dateStr === null) {
      warnings.push({
        rowIndex: rowIdx,
        message: `Riga ${rowIdx}: data non parsabile ("${rawDate}"), importata senza data.`,
        severity: "warning",
      });
    }

    const tx: Transaction = {
      id: newTransactionId(),
      source: "danea",
      originalRowIndex: rowIdx,
      date: dateStr ?? "",
      amountCents,
      absAmountCents: Math.abs(amountCents),
      direction,
      description: descrizione,
      reference:
        normalizeText(getCell(row, colIdx.protocollo)) ??
        normalizeText(getCell(row, colIdx.documento)),
      raw: rawObj,
      meta: {
        protocol: normalizeText(getCell(row, colIdx.protocollo)),
        document: normalizeText(getCell(row, colIdx.documento)),
      },
    };

    transactions.push(tx);
  }

  return { profile: "danea", transactions, ignoredRows, warnings, detectedColumns };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ColIndices = {
  data: number;
  descrizione: number;
  entrate: number;
  uscite: number;
  subtotale: number;
  protocollo: number;
  documento: number;
};

function resolveColumns(columnMap: Record<string, number>): ColIndices {
  return {
    data: findCol(columnMap, COL_DATA),
    descrizione: findCol(columnMap, COL_DESCRIZIONE),
    entrate: findCol(columnMap, COL_ENTRATE),
    uscite: findCol(columnMap, COL_USCITE),
    subtotale: findCol(columnMap, COL_SUBTOTALE),
    protocollo: findCol(columnMap, COL_PROTOCOLLO),
    documento: findCol(columnMap, COL_DOCUMENTO),
  };
}

function findCol(columnMap: Record<string, number>, candidates: string[]): number {
  for (const name of candidates) {
    if (name in columnMap) return columnMap[name];
  }
  return -1;
}

function getCell(row: unknown[], idx: number): unknown {
  if (idx === -1) return undefined;
  return row[idx];
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((c) => c === null || c === undefined || String(c).trim() === "");
}

function isPlaceholder(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  const s = String(raw).trim();
  return s === "" || PLACEHOLDER_VALUES.includes(s);
}

function isSaldoRow(description?: string): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  return SALDO_KEYWORDS.some((kw) => lower.startsWith(kw));
}

function buildRawObject(
  columnMap: Record<string, number>,
  row: unknown[]
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [colName, idx] of Object.entries(columnMap)) {
    obj[colName] = row[idx];
  }
  return obj;
}
