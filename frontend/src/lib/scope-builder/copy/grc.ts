import type { LearnMoreContent } from './learnmore-types';

export const grcContent: LearnMoreContent = {
  title: 'GRC — Governance, Risk & Compliance',
  range: 'AED 11,000 – 88,000',
  leadTime: '4 – 24 weeks depending on framework + engagement',
  plain_english: 'We help you actually achieve a security framework — ISO 27001, NESA, UAE PDPL, ADHICS, Dubai ISR, PCI DSS — instead of producing more advice. Gap assessment to find where you are, implementation to get you there, audit support to keep you there.',
  need_this_if: [
    'A client, regulator, or auditor has requested ISO / NESA / PDPL evidence',
    'You\'ve started an ISMS and stalled before audit',
    'You hold UAE personal data and aren\'t sure what PDPL requires',
    'Your insurer is asking for a controls maturity score',
    'You\'re bidding for government work that needs ADHICS / NESA / Dubai ISR',
  ],
  what_you_get: [
    'Gap report against the chosen framework with controls scored 0 – 4',
    'Prioritised 90-day / 6-month / 12-month remediation roadmap',
    'For implementation: full policies, SoA, risk register, internal audit',
    'Audit-ready evidence pack indexed to the framework controls',
    'Free certification-body interview support during external audit',
  ],
  skip_this_if: [
    'You only need one policy template — that\'s a 1-day engagement, not a GRC project',
    'You\'re not sure which framework yet — start with our 30-min scoping call instead',
  ],
  common_mistakes: [
    'Skipping the gap assessment and jumping straight to implementation — you don\'t know what to remediate',
    'Treating the risk register as a one-time deliverable instead of a living artefact',
    'Outsourcing the entire ISMS — auditors expect to see your team owning it',
  ],
  how_long: 'Gap assessments run 3 – 6 weeks. Full ISO 27001 implementations run 4 – 6 months end-to-end including external audit prep. Surveillance audits run 2 – 4 weeks.',
  pairs_with: [
    { category: 'Offensive Security', reason: 'ISO 27001 control A.8.29 requires evidence of pen testing — get it scoped together.' },
    { category: 'Cloud Security', reason: 'M365/Azure findings map directly to ISO 27017 evidence — saves duplicate scoping.' },
  ],
};
