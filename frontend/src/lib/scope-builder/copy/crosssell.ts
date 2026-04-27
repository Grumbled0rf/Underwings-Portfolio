import type { CategoryId } from '../cart';

export interface CrossSellRule {
  if_added: CategoryId;
  unless_in_cart: CategoryId[];
  suggest: CategoryId;
  reason: string;
}

export const CROSS_SELL: CrossSellRule[] = [
  { if_added: 'offensive', unless_in_cart: ['grc'], suggest: 'grc',
    reason: 'ISO 27001 requires evidence of penetration testing under control A.8.29.' },
  { if_added: 'grc',       unless_in_cart: ['offensive'], suggest: 'offensive',
    reason: 'ISO and NESA both require evidence of pen testing — pair them now.' },
  { if_added: 'cloud',     unless_in_cart: ['grc'], suggest: 'grc',
    reason: 'Cloud findings map cleanly to ISO 27017 evidence — saves you the manual mapping later.' },
  { if_added: 'cloud',     unless_in_cart: ['offensive'], suggest: 'offensive',
    reason: 'External pen test validates the cloud config from an attacker perspective.' },
];

export function pickCrossSell(addedCategory: CategoryId, currentCategories: CategoryId[]): CrossSellRule | null {
  for (const rule of CROSS_SELL) {
    if (rule.if_added !== addedCategory) continue;
    if (rule.unless_in_cart.some((c) => currentCategories.includes(c))) continue;
    return rule;
  }
  return null;
}
