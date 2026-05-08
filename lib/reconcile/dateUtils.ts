const MS_PER_DAY = 86400000;

export function dateDiffDays(a: string, b: string): number {
  if (!a || !b) return Infinity;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return Infinity;
  return Math.abs(da - db) / MS_PER_DAY;
}

export function isWithinWindow(
  dateA: string,
  dateB: string,
  windowDays: number
): boolean {
  return dateDiffDays(dateA, dateB) <= windowDays;
}
