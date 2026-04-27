import type { CartItem } from './cart';

export interface BundleResult {
  subtotal: { low: number; high: number };
  adjusted: { low: number; high: number };
  savings_pct: number;
  signal: string;
}

export function bundle(items: CartItem[]): BundleResult {
  const subLow  = items.reduce((s, i) => s + i.range.low,  0);
  const subHigh = items.reduce((s, i) => s + i.range.high, 0);
  const n = items.length;
  let pct = 0;
  if (n === 2) pct = 5;
  else if (n === 3) pct = 10;
  else if (n >= 4) pct = 15;
  const adjLow  = Math.round((subLow  * (1 - pct / 100)) / 500) * 500;
  const adjHigh = Math.round((subHigh * (1 - pct / 100)) / 500) * 500;
  const signal = pct === 0
    ? ''
    : `Bundle saves ~${pct}% — discussed in scoping call`;
  return { subtotal: { low: subLow, high: subHigh }, adjusted: { low: adjLow, high: adjHigh }, savings_pct: pct, signal };
}
