export function formatMoney(amount: number, currency = "SGD"): string {
  const formatted = new Intl.NumberFormat("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  if (currency === "SGD") return `S$${formatted}`;
  return `${currency} ${formatted}`;
}

export function parseAmount(value: string): number {
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}
