import type { PricingEngine, PricingResult } from './types';

export type CloudScope = 'azure' | 'm365' | 'entra';

export interface CloudAnswers {
  scope: CloudScope[];
  azure_subs: 1 | 2 | 3;
  m365_users: 'xs' | 's' | 'm' | 'l';
  conditional_access: 'yes' | 'partial' | 'no';
  mfa: 'yes' | 'partial' | 'no';
  defender: 'yes' | 'no' | 'unsure';
  driver: 'cis' | 'iso17' | 'audit' | 'insurance' | 'cleanup';
}

const SCOPE_BASE: Record<CloudScope, [number, number]> = {
  azure: [9000, 20000],
  m365:  [7000, 18000],
  entra: [6000, 14000],
};
const M365_USER_MULT = { xs: 0.85, s: 1.0, m: 1.2, l: 1.45 } as const;
const AZURE_SUB_MULT = { 1: 1.0, 2: 1.15, 3: 1.35 } as const;

export const cloudEngine: PricingEngine<CloudAnswers> = {
  category: 'cloud',
  score(a) {
    let low = 0, high = 0;
    for (const s of a.scope) {
      const [bLow, bHigh] = SCOPE_BASE[s];
      let m = 1.0;
      if (s === 'azure') m *= AZURE_SUB_MULT[a.azure_subs];
      if (s === 'm365' || s === 'entra') m *= M365_USER_MULT[a.m365_users];
      low  += bLow  * m;
      high += bHigh * m;
    }
    const maturityPenalty = (a.conditional_access === 'no' ? 0.05 : 0) + (a.mfa === 'no' ? 0.05 : 0);
    low  *= (1 + maturityPenalty);
    high *= (1 + maturityPenalty);
    low  = Math.round(low  / 500) * 500;
    high = Math.round(high / 500) * 500;
    const summary = `Cloud Security · ${a.scope.join(' + ').toUpperCase()} · ${a.m365_users.toUpperCase()}`;
    return { low, high, leadTimeWeeks: { min: 2, max: 4 }, summary };
  },
};
