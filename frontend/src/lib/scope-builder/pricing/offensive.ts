import type { PricingEngine, PricingResult } from './types';

export interface OffensiveAnswers {
  services: Array<'network_ext' | 'network_int' | 'web' | 'mobile_one' | 'mobile_both' | 'api' | 'cloud' | 'phishing' | 'va_only'>;
  size: 'xs' | 's' | 'm' | 'l';
  authenticated: boolean;
  retest: boolean;
  phishing_count?: number;
  driver: 'audit' | 'board' | 'breach' | 'exploring';
}

const PRICES = {
  network_ext:   { low: 15000, high: 36000 },
  network_int:   { low: 26000, high: 52000 },
  web:           { low: 12000, high: 32000 },
  mobile_one:    { low: 14000, high: 28000 },
  mobile_both:   { low: 22000, high: 44000 },
  api:           { low: 12000, high: 28000 },
  cloud:         { low:  9000, high: 20000 },
  phishing:      { low:  3500, high: 12000 },
  va_only:       { low:  3500, high: 10000 },
} as const;
const SIZE_MULT = { xs: 0.85, s: 1.0, m: 1.15, l: 1.3 } as const;

export const offensiveEngine: PricingEngine<OffensiveAnswers> = {
  category: 'offensive',
  score(a) {
    const m = SIZE_MULT[a.size];
    let low = 0, high = 0;
    for (const s of a.services) {
      const p = PRICES[s as keyof typeof PRICES];
      if (!p) continue;
      low  += Math.round(p.low  * m);
      high += Math.round(p.high * m);
    }
    if (a.authenticated) { low *= 1.05; high *= 1.10; }
    if (a.retest)        { low *= 1.05; high *= 1.05; }
    low = Math.round(low / 500) * 500;
    high = Math.round(high / 500) * 500;
    const summary = `Offensive · ${a.services.length} service(s) · ${a.size.toUpperCase()}${a.authenticated ? ' · authenticated' : ''}`;
    return { low, high, leadTimeWeeks: { min: 2, max: 4 }, summary };
  },
};
