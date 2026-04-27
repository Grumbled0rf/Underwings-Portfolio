import type { LearnMoreContent } from './learnmore-types';

export const cloudContent: LearnMoreContent = {
  title: 'Cloud Security — Azure, Microsoft 365, Entra ID',
  range: 'AED 7,000 – 24,000',
  leadTime: '2 – 4 weeks',
  plain_english: 'We review your Azure tenant and Microsoft 365 setup against the CIS Benchmark and Microsoft\'s own best practices, then give you a prioritised list of what to fix. Conditional Access, MFA, Defender, Storage, NSGs, Entra roles — all of it.',
  need_this_if: [
    'You moved to Microsoft 365 / Azure in the last 2 years and never reviewed config',
    'You enabled Conditional Access partially and aren\'t sure what\'s enforced',
    'A breach in your industry made the board ask "are we configured properly?"',
    'You\'re working towards ISO 27017 / 27018 cloud-specific evidence',
    'Defender for Cloud / Office is licensed but not actually configured',
  ],
  what_you_get: [
    'CIS Benchmark scored report (Azure or M365) — pass / fail per control',
    'Conditional Access + MFA enforcement gap analysis',
    'Entra ID role hygiene review (privileged role exposure)',
    'Defender for Cloud / Office configuration review with quick wins',
    'Prioritised remediation list with effort estimates',
  ],
  skip_this_if: [
    'You haven\'t adopted M365 or Azure yet — wait until at least the basic tenant is built',
    'You already had this done in the last 6 months and Conditional Access hasn\'t changed',
  ],
  common_mistakes: [
    'Trusting the default M365 setup — Microsoft ships "open by default" for most controls',
    'Enabling MFA but leaving legacy auth enabled, which silently bypasses MFA',
    'Buying Defender licences but never enabling Defender for Cloud workload protection',
  ],
  how_long: 'Single-cloud review runs 2 – 3 weeks. Combined Azure + M365 + Entra runs 3 – 4 weeks including walkthrough.',
  pairs_with: [
    { category: 'GRC', reason: 'Maps directly to ISO 27017 control evidence — saves duplicate effort.' },
    { category: 'Offensive Security', reason: 'External pen test validates the cloud config from an attacker\'s view.' },
  ],
};
