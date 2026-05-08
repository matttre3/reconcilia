/**
 * Converte un valore grezzo in centesimi interi.
 * Gestisce formati italiani ("1.234,56"), inglesi ("1234.56"),
 * numeri Excel già numerici, e simboli valuta.
 * Restituisce null se il valore non è parsabile.
 */
export function normalizeAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;

  // Numero già numerico (da Excel)
  if (typeof raw === "number") {
    if (!isFinite(raw)) return null;
    return Math.round(raw * 100);
  }

  if (typeof raw !== "string") return null;

  let s = raw.trim();
  if (s === "" || s === "-" || s === "–") return null;

  // Rimuovi simboli valuta e spazi
  s = s.replace(/[€$£\s]/g, "");

  if (s === "" || s === "-") return null;

  // Gestisci segno negativo in diverse posizioni
  const isNegative = s.startsWith("-") || s.endsWith("-");
  s = s.replace(/-/g, "");

  if (s === "") return null;

  // Determina formato: italiano (1.234,56) vs inglese (1,234.56) vs semplice
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  let normalized: string;

  if (hasComma && hasDot) {
    // Capire quale è il separatore decimale
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");

    if (lastComma > lastDot) {
      // Formato italiano: 1.234,56 → virgola è decimale
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato inglese: 1,234.56 → punto è decimale
      normalized = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // Solo virgola: può essere decimale (1234,56) o migliaia (1,234)
    const afterComma = s.split(",")[1] ?? "";
    if (afterComma.length === 3) {
      // Probabilmente migliaia: 1,234
      normalized = s.replace(",", "");
    } else {
      // Decimale italiano: 1234,56
      normalized = s.replace(",", ".");
    }
  } else if (!hasComma && hasDot) {
    // Solo punto: può essere decimale (1234.56) o migliaia (1.234)
    const afterDot = s.split(".")[1] ?? "";
    if (afterDot.length === 3) {
      // Probabilmente migliaia: 1.234
      normalized = s.replace(".", "");
    } else {
      // Decimale: 1234.56
      normalized = s;
    }
  } else {
    // Nessun separatore: numero intero
    normalized = s;
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return null;

  const cents = Math.round(parsed * 100);
  return isNegative ? -cents : cents;
}
