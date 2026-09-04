const int = new Intl.NumberFormat("en-US");

export function formatInt(n: number): string {
  return int.format(Math.round(n));
}

export function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Signed percentage-point change, e.g. +12.3% / -4.0% / n/a. */
export function formatDelta(fraction: number | null, digits = 1): string {
  if (fraction === null || !Number.isFinite(fraction)) return "n/a";
  const sign = fraction > 0 ? "+" : "";
  return `${sign}${(fraction * 100).toFixed(digits)}%`;
}

export function formatUsd(n: number): string {
  return `$${int.format(Math.round(n))}`;
}

export const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
