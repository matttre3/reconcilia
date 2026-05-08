/**
 * Normalizza una data grezza in formato ISO YYYY-MM-DD.
 * Gestisce:
 * - Date testuali italiane: "07/05/2026", "7-5-2026"
 * - Formato ISO: "2026-05-07"
 * - Numeri seriali Excel (giorni dal 1/1/1900)
 * Restituisce null se non parsabile.
 */
export function normalizeDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  // Numero seriale Excel
  if (typeof raw === "number") {
    return excelSerialToIso(raw);
  }

  // Oggetto Date (alcuni parser lo restituiscono)
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return dateToIso(raw);
  }

  if (typeof raw !== "string") return null;

  const s = raw.trim();
  if (s === "") return null;

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // ISO con ora: YYYY-MM-DDTHH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return s.substring(0, 10);
  }

  // Italiano: DD/MM/YYYY o D/M/YYYY
  const itSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (itSlash) {
    const [, d, m, y] = itSlash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Italiano con trattino: DD-MM-YYYY
  const itDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (itDash) {
    const [, d, m, y] = itDash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Italiano con punto: DD.MM.YYYY
  const itDot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (itDot) {
    const [, d, m, y] = itDot;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function excelSerialToIso(serial: number): string | null {
  if (serial < 1) return null;

  // Excel considera erroneamente il 1900 come bisestile (+1 giorno di offset)
  // Base: 1 gennaio 1900 = seriale 1
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 30 dic 1899
  const msPerDay = 86400000;
  const date = new Date(excelEpoch.getTime() + serial * msPerDay);

  if (isNaN(date.getTime())) return null;
  return dateToIso(date);
}
