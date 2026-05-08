import type { FileProfile } from "@/types";

const DANEA_MARKERS = [
  "entrate",
  "uscite",
  "saldo",
  "protocollo",
  "esercizio",
  "risorsa",
  "subtot",
  "subtot.",
  "pagamento",
];

const BANK_MARKERS = [
  "importo",
  "div.",
  "div",
  "contabile",
  "caus.",
  "caus",
  "causale",
  "rapporto",
  "società",
  "societa",
  // varianti xlsx bancari italiani
  "dare",
  "avere",
  "addebiti",
  "accrediti",
  "data operazione",
  "data valuta",
  "numero conto",
  "iban",
  "valuta operazione",
  "operazione",
];

export type DetectResult = {
  profile: FileProfile;
  headerRowIndex: number;
  columnMap: Record<string, number>; // nome normalizzato → indice colonna
};

export function detectFileProfile(rows: unknown[][]): DetectResult {
  const limit = Math.min(rows.length, 20);

  for (let rowIdx = 0; rowIdx < limit; rowIdx++) {
    const row = rows[rowIdx];
    const cells = row.map((c) => normalizeCell(c));

    const daneaHits = countMarkers(cells, DANEA_MARKERS);
    const bankHits = countMarkers(cells, BANK_MARKERS);

    if (daneaHits >= 3 && daneaHits > bankHits) {
      return {
        profile: "danea",
        headerRowIndex: rowIdx,
        columnMap: buildColumnMap(cells),
      };
    }

    if (bankHits >= 2 && bankHits > daneaHits) {
      return {
        profile: "bank",
        headerRowIndex: rowIdx,
        columnMap: buildColumnMap(cells),
      };
    }
  }

  return {
    profile: "unknown",
    headerRowIndex: 0,
    columnMap: {},
  };
}

function normalizeCell(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim().toLowerCase();
}

function countMarkers(cells: string[], markers: string[]): number {
  return cells.filter((c) => markers.includes(c)).length;
}

function buildColumnMap(headerCells: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerCells.forEach((cell, idx) => {
    if (cell !== "") {
      map[cell] = idx;
    }
  });
  return map;
}
