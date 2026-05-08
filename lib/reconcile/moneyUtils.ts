export function centsToEuro(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

export function formatCentsPlain(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
