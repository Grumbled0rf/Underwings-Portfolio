---
title: "Underwings Sales Automation — Plan & Status"
subtitle: "Build complete · prepared 27 May 2026"
header-includes: |
  \usepackage{tikz}
  \usetikzlibrary{arrows.meta,positioning,fit,backgrounds}
  \usepackage{xcolor}
---

## Where we are in one line

The sales-automation machine is **built and running end to end** — from a website
enquiry all the way to a signed, Won client and post-sale success reminders — and
our own PDPL compliance posture is live. Everything that can be built before we
have a paying client is done. The only work remaining is **human** (founder
outreach) or **deliberately gated** on the first paying client.

## The automated revenue loop

\newpage

```{=latex}
\begin{center}
\begin{tikzpicture}[
  node distance=7mm,
  every node/.style={font=\small},
  stage/.style={rectangle, rounded corners, draw=black!65, fill=blue!6,
                text width=8.4cm, align=center, minimum height=9mm},
  trig/.style={rectangle, rounded corners, draw=black!65, fill=green!10,
               text width=8.4cm, align=center, minimum height=9mm},
  won/.style={rectangle, rounded corners, draw=black!65, fill=orange!18,
              text width=8.4cm, align=center, minimum height=9mm, font=\small\bfseries},
  side/.style={rectangle, rounded corners, draw=black!45, fill=black!5,
               text width=4.3cm, align=center, minimum height=8mm, font=\footnotesize},
  arr/.style={-{Latex[length=2.4mm]}, thick, draw=black!70}
]
% --- main vertical chain ---
\node[trig]  (a)               {Inbound enquiry \\ \footnotesize website form · email · phone};
\node[stage, below=of a] (b)   {\textbf{01} Capture $\rightarrow$ create Krayin lead \emph{(New)}};
\node[stage, below=of b] (c)   {\textbf{02 / 03} Enrich + AI score $\rightarrow$ \emph{MQL}};
\node[stage, below=of c] (d)   {\textbf{04 / 05} Cal.com booking + auto pre-call brief};
\node[stage, below=of d] (e)   {Discovery call $\rightarrow$ \emph{Scoping}};
\node[stage, below=of e] (f)   {\textbf{07} Proposal generator \\ \footnotesize Claude draft $\rightarrow$ PDF $\rightarrow$ Documenso e-sign \emph{(Proposal Sent)}};
\node[stage, below=of f] (g)   {\textbf{08} Signature webhook $\rightarrow$ stage = \emph{Won}};
\node[won,   below=of g] (h)   {WON — paying client \\ \footnotesize Phase E: day 7 / 30 / 90 success reminders};
\foreach \x/\y in {a/b,b/c,c/d,d/e,e/f,f/g,g/h} \draw[arr] (\x) -- (\y);

% --- supporting always-on layers (right column) ---
\node[side, right=12mm of a] (meas) {\textbf{Phase B} — nightly ETL $\rightarrow$ warehouse $\rightarrow$ Metabase dashboards};
\node[side, below=of meas]   (rec)  {\textbf{Phase A} — Monday reconciliation ritual $\rightarrow$ \#ops};
\node[side, below=of rec]    (ops)  {\textbf{14} — daily ops summary $\rightarrow$ \#ops 08:00};
\node[side, below=of ops]    (risk) {\textbf{Phase G} — nightly encrypted backups + drift export};
\node[side, below=of risk]   (pdpl) {\textbf{Phase F} — PDPL retention + DSAR erasure};
\begin{scope}[on background layer]
  \node[draw=black!30, dashed, rounded corners, fit=(meas)(rec)(ops)(risk)(pdpl),
        inner sep=3mm, label={[font=\footnotesize\bfseries, black!55]above:Supporting layers (always on)}] {};
\end{scope}
\end{tikzpicture}
\end{center}
```

\newpage

## What we have done

| Phase | What it delivers | Status |
|---|---|---|
| 0–3c, 9 | Inbound capture, enrichment/scoring, booking, pre-call brief, weekly report | **LIVE** |
| **A** | Monday reconciliation ritual → `#ops` | **LIVE** |
| **B** | metrics-db warehouse + Metabase + 5 dashboards + nightly ETL | **LIVE** |
| **C** | Proposal generator: form → Claude → PDF → Documenso → Proposal Sent | **LIVE** |
| **C-tail** | Workflow 08 — signature → Won (sidecar-first rewrite) | **LIVE** |
| **D** | Go-to-market kit: outreach templates, 2 hosted one-pagers, lead sources + tracker, 8 content pillars | **LIVE** (assets) |
| **E** (core) | Day 7 / 30 / 90 customer-success reminders | **LIVE** |
| **F** | PDPL hardening: RoPA, retention policy + enforcement, DSAR runbook + erasure, breach plan, DPO mailbox, rewritten privacy policy | **LIVE** |
| **G** | Nightly encrypted DB backups + n8n workflow drift export | **LIVE** |
| **14** | Daily ops summary → `#ops` 08:00 Asia/Dubai | **ACTIVE** |

**Live components:** 10 n8n workflows (all active) · 5 systemd timers (backups,
drift export, touchpoints, Monday reconciliation, PDPL retention) · pandoc-render
sidecar (proposals, onboarding, touchpoints) · Documenso e-sign · Metabase
analytics · self-hosted mail with `dpo@` / `privacy@`.

## What is still pending

**Gated on the first paying client** (deliberate — plan §5; don't open the
outbound firehose before we can deliver):

- **Phase H** — outbound prerequisites (Apollo, PhantomBuster, email warmup)
- **Phase I** — outbound automation (harvest, scoring/drafting, reply detector)
- **Phase J** — cross-pipeline upsell + Trial-Active ops + client auto-email
- **Phase K** — continuous tuning (also needs ≥3 months of dashboard data)

**Human, not build** — the actual gate on everything above:

- The ~45 warm founding-client messages — not sent yet
- Partner / audit-firm conversations — not initiated yet
- LinkedIn posting cadence — assets ready, nothing published yet
- **First paying client** — none yet; unlocks Phases H–K and the first case study

**Minor / optional, not on the revenue path:**

- Plane delivery-project automation — blocked only on a `PLANE_API_TOKEN`

## Bottom line

There is no remaining buildable work on the automation side that is worth doing
before we have a client. The next move is human: the founders' outreach. The
machine is ready to receive whatever it generates.

*Single source of truth: `UNDERWINGS-MASTER-PLAN.md`. Compliance pack:
`docs/compliance/`.*
