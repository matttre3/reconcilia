export function normalizeText(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const s = String(raw).trim();
  return s === "" ? undefined : s;
}

/** Similarità Dice coefficient tra due stringhe normalizzate (0–1) */
export function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const aBigrams = buildBigrams(a.toLowerCase());
  const bBigrams = buildBigrams(b.toLowerCase());

  let intersection = 0;
  const bCopy = [...bBigrams];

  for (const bg of aBigrams) {
    const idx = bCopy.indexOf(bg);
    if (idx !== -1) {
      intersection++;
      bCopy.splice(idx, 1);
    }
  }

  return (2 * intersection) / (aBigrams.length + bBigrams.length);
}

function buildBigrams(s: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s[i] + s[i + 1]);
  }
  return bigrams;
}
