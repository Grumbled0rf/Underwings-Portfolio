export interface PricingResult {
  low: number;
  high: number;
  leadTimeWeeks: { min: number; max: number };
  summary: string;
}

export interface PricingEngine<A> {
  category: 'offensive' | 'grc' | 'cloud';
  score(answers: A): PricingResult;
}
