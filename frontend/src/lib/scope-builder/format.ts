export function fmtAED(n: number): string {
  return 'AED ' + n.toLocaleString('en-AE');
}

export function fmtRange(low: number, high: number): string {
  return `AED ${low.toLocaleString('en-AE')} – ${high.toLocaleString('en-AE')}`;
}

export function fmtRangeShort(low: number, high: number): string {
  const k = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
  return `AED ${k(low)} – ${k(high)}`;
}
