---
title: "Plane Onboarding Automation — Flow"
subtitle: "Signed proposal → Won → auto-created delivery project · 2026-05-27"
header-includes: |
  \usepackage{tikz}
  \usetikzlibrary{arrows.meta,positioning,fit,backgrounds}
  \usepackage{xcolor}
---

When a client signs the proposal in Documenso, the deal is moved to **Won** in
the CRM and a **Plane delivery project** is created automatically — seeded with
the standard 7-step engagement checklist — and the link is posted to
`#client-success`. All orchestration lives in the `pandoc-render` sidecar's
`/onboard` endpoint; n8n is just the thin webhook trigger.

\vspace{4mm}

```{=latex}
\begin{center}
\begin{tikzpicture}[
  node distance=6.5mm,
  every node/.style={font=\small},
  trig/.style={rectangle, rounded corners, draw=black!65, fill=green!12,
               text width=8.8cm, align=center, minimum height=8mm},
  flow/.style={rectangle, rounded corners, draw=black!65, fill=blue!6,
               text width=8.8cm, align=center, minimum height=8mm},
  won/.style={rectangle, rounded corners, draw=black!65, fill=orange!20,
              text width=8.8cm, align=center, minimum height=8mm, font=\small\bfseries},
  fin/.style={rectangle, rounded corners, draw=black!65, fill=green!16,
              text width=8.8cm, align=center, minimum height=8mm},
  sidebox/.style={rectangle, rounded corners, draw=black!45, fill=black!4,
                  text width=4.8cm, align=left, font=\footnotesize},
  notebox/.style={rectangle, rounded corners, draw=orange!60, fill=yellow!14,
                  text width=4.8cm, align=left, font=\footnotesize},
  arr/.style={-{Latex[length=2.4mm]}, thick, draw=black!70}
]
\node[trig] (a)                {CLIENT signs the proposal in \textbf{Documenso}};
\node[flow, below=of a] (b)    {\textbf{Documenso} fires \texttt{document.completed} webhook \\ \footnotesize (HMAC-signed)};
\node[flow, below=of b] (c)    {\textbf{n8n workflow 08} --- onboarding kickoff \\ \footnotesize verify HMAC $\cdot$ extract \texttt{lead\_id} from \texttt{proposal\_ref} $\cdot$ POST /onboard};
\node[flow, below=of c] (d)    {\textbf{sidecar} \texttt{/onboard} --- fetch Krayin lead};
\node[won,  below=of d] (e)    {Krayin: move lead to WON (stage 20)};
\node[flow, below=of e] (f)    {\texttt{createPlaneProject()} \\ \footnotesize create ``\{client\} Delivery'' project + seed 7 issues};
\node[flow, below=of f] (g)    {Slack $\rightarrow$ \texttt{\#client-success} (with Plane project link)};
\node[fin,  below=of g] (h)    {Team opens the Plane project and starts delivery};
\foreach \x/\y in {a/b,b/c,c/d,d/e,e/f,f/g,g/h} \draw[arr] (\x) -- (\y);

\node[sidebox, right=10mm of f] (chk) {\textbf{Seeded checklist (7 issues)}\\[1mm]
  1. Kickoff + signed RoE\\
  2. Confirm scope \& access\\
  3. Delivery / testing\\
  4. Draft report\\
  5. Report review with client\\
  6. Retest \& close findings\\
  7. Invoice \& collect};
\draw[arr, dashed] (f) -- (chk);

\node[notebox, right=10mm of c] (nf) {\textbf{Non-fatal:} if Plane is unreachable, WON + Slack still succeed and Slack says ``create the project manually''.};
\draw[arr, dashed, draw=orange!60] (nf) -- (chk);
\end{tikzpicture}
\end{center}
```

\vfill

*Built 2026-05-27. Source of this flow: `pandoc-render/server.js` (`/onboard`,
`createPlaneProject`) + `n8n/workflows/08-onboarding-kickoff.json`. Plane config
in gitignored `.env` (`PLANE_API_TOKEN`, `PLANE_WORKSPACE_SLUG=underwings`).*
