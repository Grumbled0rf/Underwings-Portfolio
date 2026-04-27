import type { PricingEngine, PricingResult } from './types';

export type GRCFramework = 'iso27001' | 'nesa' | 'pdpl' | 'adhics' | 'dubai_isr' | 'pci' | 'risk_register';
export type GRCEngagement = 'gap' | 'implementation' | 'surveillance';

export interface GRCAnswers {
  frameworks: GRCFramework[];
  engagement: Record<GRCFramework, GRCEngagement>;
  size: 'xs' | 's' | 'm' | 'l';
  locations: 1 | 2 | 3;
  sector: 'banking' | 'healthcare' | 'government' | 'sme' | 'it' | 'retail' | 'other';
  data_volume: 'low' | 'med' | 'high';
  timeline: 'hard_deadline' | 'six_months' | 'twelve_months' | 'roadmap';
  done: Array<'risk_register' | 'soa' | 'policies' | 'internal_audit' | 'asset_register'>;
}

const BASE: Record<GRCFramework, { gap: [number, number]; implementation: [number, number] }> = {
  iso27001:      { gap: [14000, 28000], implementation: [36000, 88000] },
  nesa:          { gap: [14000, 35000], implementation: [40000, 95000] },
  pdpl:          { gap: [11000, 24000], implementation: [22000, 55000] },
  adhics:        { gap: [18000, 38000], implementation: [45000, 100000] },
  dubai_isr:     { gap: [16000, 32000], implementation: [38000, 80000] },
  pci:           { gap: [18000, 36000], implementation: [45000, 95000] },
  risk_register: { gap: [14000, 30000], implementation: [14000, 30000] },
};
const SIZE_MULT = { xs: 0.85, s: 1.0, m: 1.2, l: 1.45 } as const;
const SECTOR_MULT = { banking: 1.2, healthcare: 1.15, government: 1.15, it: 1.0, retail: 1.0, sme: 0.9, other: 1.0 } as const;
const TIMELINE_MULT = { hard_deadline: 1.15, six_months: 1.0, twelve_months: 0.95, roadmap: 0.9 } as const;

export const grcEngine: PricingEngine<GRCAnswers> = {
  category: 'grc',
  score(a) {
    const m = SIZE_MULT[a.size] * SECTOR_MULT[a.sector] * TIMELINE_MULT[a.timeline];
    let low = 0, high = 0;
    for (const fw of a.frameworks) {
      const eng = a.engagement[fw] === 'implementation' ? 'implementation' : 'gap';
      const [bLow, bHigh] = BASE[fw][eng];
      low  += bLow  * m;
      high += bHigh * m;
    }
    const credits = Math.min(0.15, a.done.length * 0.03);
    low  *= (1 - credits);
    high *= (1 - credits);
    low  = Math.round(low  / 500) * 500;
    high = Math.round(high / 500) * 500;
    const fwLabel = a.frameworks.map((f) => f.replace('_', ' ')).join(', ');
    const summary = `GRC · ${fwLabel} · ${a.size.toUpperCase()}${a.timeline === 'hard_deadline' ? ' · deadline' : ''}`;
    const leadMax = a.frameworks.some((f) => a.engagement[f] === 'implementation') ? 24 : 8;
    return { low, high, leadTimeWeeks: { min: 4, max: leadMax }, summary };
  },
};
