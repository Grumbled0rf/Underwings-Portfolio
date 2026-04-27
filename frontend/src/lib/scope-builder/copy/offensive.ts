import type { LearnMoreContent } from './learnmore-types';

export const offensiveContent: LearnMoreContent = {
  title: 'Offensive Security — Penetration Testing & VAPT',
  range: 'AED 3,500 – 48,000',
  leadTime: '2 – 4 weeks per engagement',
  plain_english: 'We try to break your systems the same way an attacker would. Manual exploitation, not automated scanning. Networks, web apps, mobile apps, cloud, phishing — pick what matters and we\'ll test it like an adversary.',
  need_this_if: [
    'You\'re launching a new product and have never had a pen test',
    'Your auditor / regulator / client asked for a pen-test report',
    'You suspect drift since your last test was 6+ months ago',
    'You want a real-world test, not a CVE list from a scanner',
  ],
  what_you_get: [
    'Risk-rated findings report with CVSS scoring (PDF)',
    'Step-by-step reproduction notes per finding',
    'Remediation guidance per finding, not just headlines',
    'Free retest within 60 days of the original report',
    'Optional executive 1-pager for the board',
  ],
  skip_this_if: [
    'You had a pen test in the last 6 months and nothing has changed',
    'Your application isn\'t deployed anywhere yet — start with a code review instead',
  ],
  common_mistakes: [
    'Ordering only an automated scan because it\'s cheap — auditors increasingly reject scan-only reports',
    'Picking external testing only when most breaches start internally — internal tests find lateral movement that external never sees',
    'Skipping the retest — without it you have a finding list, not proof of fix',
  ],
  how_long: 'Calendar time is 2 – 4 weeks: 1 week scoping + paperwork, 1–2 weeks active testing, 3 – 5 days reporting and walkthrough.',
  pairs_with: [
    { category: 'GRC', reason: 'ISO 27001 / NESA / PDPL all require evidence of pen testing — bundle to avoid duplicate scoping.' },
    { category: 'Training & Awareness', reason: 'Pen test findings turn into a phishing simulation that proves the fixes stick.' },
  ],
};
