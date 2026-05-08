import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Legge un File browser e restituisce le righe come array di valori grezzi.
 * Preserva i tipi nativi (number, string) per permettere la normalizzazione
 * corretta di date seriali Excel e importi numerici.
 */
export async function parseFileToRows(file: File): Promise<unknown[][]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "csv") {
    return parseCsv(file);
  }

  if (ext === "xls" || ext === "xlsx") {
    return parseExcel(file);
  }

  throw new Error(
    `Formato file non supportato: .${ext}. Usa CSV, XLS o XLSX.`
  );
}

function parseCsv(file: File): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as unknown[][]);
      },
      error: (err) => {
        reject(new Error(`Errore parsing CSV: ${err.message}`));
      },
    });
  });
}

async function parseExcel(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    raw: true, // preserva numeri nativi (inclusi seriali data)
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Il file Excel non contiene fogli.");
  }

  const sheet = workbook.Sheets[sheetName];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  return rows;
}
