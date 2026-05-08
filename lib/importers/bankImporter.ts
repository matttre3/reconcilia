import type { ImportResult, Transaction, IgnoredRow, ImportWarning } from "@/types";
import { detectFileProfile } from "./detectFileProfile";
import { normalizeAmount } from "./normalizeAmount";
import { normalizeDate } from "./normalizeDate";
import { normalizeText } from "./normalizeText";
import { newTransactionId } from "@/lib/utils/ids";

// Colonna data: varie denominazioni tra le banche
const COL_DATA = [
  "contabile",
  "data contabile",
  "data operazione",
  "data",
  "data mov.",
  "data movimento",
  "dt. operazione",
  "dt operazione",
];
const COL_VALUTA_DATA = ["valuta", "data valuta", "dt. valuta", "dt valuta"];

// Colonna descrizione
const COL_DESCRIZIONE = [
  "descrizione",
  "descrizione operazione",
  "dettagli",
  "note",
  "operazione",
];

// Importo come colonna unica con segno (positivo/negativo)
const COL_IMPORTO = [
  "importo",
  "importo (eur)",
  "importo eur",
  "importo €",
  "valore",
];

// Formato alternativo: colonne separate Dare / Avere
const COL_DARE = ["dare", "addebiti", "addebito"];
const COL_AVERE = ["avere", "accrediti", "accredito"];

const COL_VALUTA = ["div.", "div", "divisa", "valuta operazione"];
const COL_CAUSALE = ["caus.", "caus", "causale", "tipo operazione"];
const COL_ACCOUNT = ["rapporto", "banca", "società", "societa", "conto", "iban", "numero conto"];

export function importBank(rows: unknown[][]): ImportResult {
  const detected = detectFileProfile(rows);

  if (detected.profile !== "bank") {
    return {
      profile: "unknown",
      transactions: [],
      ignoredRows: [],
      warnings: [{
        message: "Il file non è stato riconosciuto come export bancario.",
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

  // Verifica disponibilità colonne importo
  const hasImporto = colIdx.importo !== -1;
  const hasDareAvere = colIdx.dare !== -1 || colIdx.avere !== -1;

  if (!hasImporto && !hasDareAvere) {
    warnings.push({
      message: "Nessuna colonna importo trovata (cercate: Importo, Dare, Avere). Nessun movimento importabile.",
      severity: "error",
    });
    return { profile: "bank", transactions: [], ignoredRows: [], warnings, detectedColumns: {} };
  }

  if (colIdx.data === -1) {
    warnings.push({
      message: "Colonna data non trovata. Le transazioni non avranno data.",
      severity: "warning",
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

    if (isEmptyRow(row)) {
      ignoredRows.push({ originalRowIndex: rowIdx, reason: "Riga vuota", raw: rawObj });
      continue;
    }

    // Calcola importo: formato Importo (con segno) o Dare/Avere separati
    let amountCents: number | null = null;

    if (hasImporto) {
      amountCents = normalizeAmount(getCell(row, colIdx.importo));
    } else {
      // Formato Dare/Avere: Dare = uscita (negativo), Avere = entrata (positivo)
      const dareCents = normalizeAmount(getCell(row, colIdx.dare));
      const avereCents = normalizeAmount(getCell(row, colIdx.avere));

      if (avereCents !== null && avereCents !== 0) {
        amountCents = Math.abs(avereCents);
      } else if (dareCents !== null && dareCents !== 0) {
        amountCents = -Math.abs(dareCents);
      }
    }

    if (amountCents === null) {
      ignoredRows.push({
        originalRowIndex: rowIdx,
        reason: "Importo non parsabile o assente",
        raw: rawObj,
      });
      continue;
    }

    if (amountCents === 0) {
      ignoredRows.push({
        originalRowIndex: rowIdx,
        reason: "Importo zero ignorato",
        raw: rawObj,
      });
      continue;
    }

    const direction: "in" | "out" = amountCents > 0 ? "in" : "out";

    const rawDate = getCell(row, colIdx.data);
    const dateStr = normalizeDate(rawDate);

    if (dateStr === null) {
      warnings.push({
        rowIndex: rowIdx,
        message: `Riga ${rowIdx}: data non parsabile ("${rawDate}"), importata senza data.`,
        severity: "warning",
      });
    }

    const descrizione = normalizeText(getCell(row, colIdx.descrizione))
      ?? normalizeText(getCell(row, colIdx.causale));
    const currency = normalizeText(getCell(row, colIdx.valuta));
    const account = normalizeText(getCell(row, colIdx.account));

    const tx: Transaction = {
      id: newTransactionId(),
      source: "bank",
      originalRowIndex: rowIdx,
      date: dateStr ?? "",
      amountCents,
      absAmountCents: Math.abs(amountCents),
      direction,
      description: descrizione,
      raw: rawObj,
      meta: {
        currency: currency ?? "EUR",
        account,
      },
    };

    transactions.push(tx);
  }

  return { profile: "bank", transactions, ignoredRows, warnings, detectedColumns };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ColIndices = {
  data: number;
  valutaData: number;
  descrizione: number;
  importo: number;
  dare: number;
  avere: number;
  valuta: number;
  causale: number;
  account: number;
};

function resolveColumns(columnMap: Record<string, number>): ColIndices {
  return {
    data: findCol(columnMap, COL_DATA),
    valutaData: findCol(columnMap, COL_VALUTA_DATA),
    descrizione: findCol(columnMap, COL_DESCRIZIONE),
    importo: findCol(columnMap, COL_IMPORTO),
    dare: findCol(columnMap, COL_DARE),
    avere: findCol(columnMap, COL_AVERE),
    valuta: findCol(columnMap, COL_VALUTA),
    causale: findCol(columnMap, COL_CAUSALE),
    account: findCol(columnMap, COL_ACCOUNT),
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
