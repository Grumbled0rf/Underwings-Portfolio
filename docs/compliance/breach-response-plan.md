# Personal-Data Breach Response Plan

**Owner:** DPO (Manoj) + Ops · **Last updated:** 2026-05-27 · **Review:** annual + after any incident
**Legal basis:** UAE PDPL — personal-data breaches must be notified to the UAE
Data Office (and, in defined cases, to affected individuals) within the timeline
set by the Executive Regulations. **Confirm the current notification window and
required content from the published regulations at the time of any incident —
do not rely on memory or this document for the deadline.**

A breach is any event that compromises the confidentiality, integrity, or
availability of personal data we control — not only "hackers". A laptop lost, an
email sent to the wrong recipient, a misconfigured bucket, a ransomware event, or
a sub-processor (Brevo/Cloudflare/Anthropic) notifying us of *their* breach all
count.

## Roles
- **Incident lead:** DPO (Manoj). Owns the decision to notify.
- **Technical lead:** Vinoth (infra/network) / Nelson (offensive) as relevant.
- **Comms:** whoever the DPO designates for requester/client communication.

## The process

### 1. Detect & contain (immediately)
- Stop the bleeding: isolate the affected system, revoke credentials, pull the
  misconfigured access. Containment beats completeness.
- **Preserve evidence** — don't wipe; snapshot logs. We're a security firm; our
  own forensics should be exemplary.

### 2. Triage & record (hour 0)
- Open an incident record: what happened, when discovered, systems + data
  categories involved, rough number of data subjects, and whether the data was
  encrypted/pseudonymised (which may reduce the risk and the obligation).

### 3. Assess risk to individuals
- Low risk (e.g. data was encrypted and the key is safe) vs high risk (clear-text
  personal or sensitive data exposed). This drives whether **individuals** must be
  told, not just the Data Office.

### 4. Notify
- **UAE Data Office:** notify within the regulatory window once the breach is a
  reportable personal-data breach. Include nature of the breach, categories and
  approximate numbers, likely consequences, and measures taken/proposed.
- **Affected individuals:** where the breach is likely to result in high risk to
  their rights, notify them in clear language with steps they can take.
- **Affected clients:** if the breach involves *their* data we process, notify per
  the engagement contract — usually faster than the regulatory clock.

### 5. Remediate & learn
- Fix root cause. Update controls. Record lessons. If the incident reveals a gap
  in the RoPA or retention policy, update those documents in the same week.

## Contacts to have ready (fill in)
- UAE Data Office reporting channel: _______________________
- Sub-processor incident contacts: Brevo ____, Cloudflare ____, Anthropic ____
- Cyber-insurance notification line (if/when held): ____

## Drill
Run a tabletop exercise of this plan at least annually (a "lost laptop with the
CRM export" scenario is a good first one). A plan never rehearsed fails on the day.
