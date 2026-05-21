#!/usr/bin/env node
/*
 * render-proposal.js
 *
 * Shelled out from n8n workflow 07-proposal-generator after Claude returns
 * validated JSON. Receives the n8n payload via env vars (set by n8n's
 * Execute Command node) or via stdin.
 *
 * Responsibilities:
 *   1. Substitute {{ field }} placeholders + {{#each}} blocks into the
 *      template markdown.
 *   2. Inline _shared-footer.md where {{> _shared-footer }} appears.
 *   3. Generate a stable proposal reference (UW-<lead_id>-<YYYYMMDD>-<seq>).
 *   4. Render to PDF via pandoc (must be installed in n8n container) with a
 *      basic-but-presentable LaTeX template.
 *   5. Write outputs to /data/proposals/<ref>/ and emit JSON to stdout that
 *      n8n's next node picks up.
 *
 * Inputs (read from $PAYLOAD or stdin):
 *   {
 *     "lead": { lead_id, organization_name, person_name, person_emails, ... },
 *     "sku_record": { sku, name, template, ... from skus.yml },
 *     "claude":     { client_context, scope_items, line_items, total_aed, start_date_suggestion, out_of_scope_specifics, ... },
 *     "template":   "the SKU template markdown (with {{ placeholders }})",
 *     "shared_footer": "the footer markdown",
 *     "today":      "YYYY-MM-DD"
 *   }
 *
 * Outputs (stdout JSON):
 *   {
 *     "proposal_ref":  "UW-42-20260521-001",
 *     "markdown_path": "/data/proposals/UW-42-20260521-001/proposal.md",
 *     "pdf_path":      "/data/proposals/UW-42-20260521-001/proposal.pdf"
 *   }
 *
 * Exit codes:
 *   0 = success
 *   1 = bad input (caller's fault)
 *   2 = pandoc / filesystem failure (server problem)
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function main() {
  const raw = process.env.PAYLOAD || fs.readFileSync(0, 'utf8');
  let p;
  try { p = JSON.parse(raw); }
  catch (e) { fail(1, 'invalid JSON input'); }

  if (!p.lead || !p.sku_record || !p.claude || !p.template) {
    fail(1, 'missing required keys: lead, sku_record, claude, template');
  }

  // Stable reference
  const today = (p.today || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const seq   = String(Date.now()).slice(-3);
  const ref   = `UW-${p.lead.lead_id}-${today}-${seq}`;

  // Build context for substitution
  const ctx = {
    client_company:        p.lead.organization_name || 'Client',
    proposal_date:         p.today,
    proposal_ref:          ref,
    client_context:        p.claude.client_context || '',
    start_date_suggestion: p.claude.start_date_suggestion || '',
    total_aed:             formatAed(p.claude.total_aed),
  };

  // Render template
  let md = p.template;

  // Inline shared footer
  md = md.replace(/{{>\s*_shared-footer\s*}}/g, p.shared_footer || '');

  // Simple {{ var }} substitution
  for (const [k, v] of Object.entries(ctx)) {
    md = md.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
  }

  // {{#scope_items}} ... {{/scope_items}} block
  md = renderList(md, 'scope_items', p.claude.scope_items || [], (it) => ({
    item: it.item || '', description: it.description || ''
  }));

  // {{#line_items}} ... {{/line_items}} block
  md = renderList(md, 'line_items', p.claude.line_items || [], (it) => ({
    description: it.description || '', aed: formatAed(it.aed)
  }));

  // {{#out_of_scope_specifics}} ... {{/out_of_scope_specifics}} (string array)
  md = renderStringList(md, 'out_of_scope_specifics', p.claude.out_of_scope_specifics || []);

  // Output paths
  const outDir = `/data/proposals/${ref}`;
  fs.mkdirSync(outDir, { recursive: true });
  const mdPath  = `${outDir}/proposal.md`;
  const pdfPath = `${outDir}/proposal.pdf`;

  fs.writeFileSync(mdPath, md, 'utf8');

  // PDF render — pandoc with eisvogel template if available, plain otherwise
  try {
    execSync(`pandoc "${mdPath}" -o "${pdfPath}" --pdf-engine=xelatex -V geometry:margin=2cm -V mainfont="DejaVu Sans" -V monofont="DejaVu Sans Mono"`, { stdio: 'inherit' });
  } catch (e) {
    fail(2, `pandoc failed: ${e.message}`);
  }

  process.stdout.write(JSON.stringify({
    proposal_ref:  ref,
    markdown_path: mdPath,
    pdf_path:      pdfPath
  }));
}

function renderList(md, name, items, mapper) {
  const re = new RegExp(`{{#${name}}}([\\s\\S]*?){{/${name}}}`, 'g');
  return md.replace(re, (_, block) => items.map(it => {
    let out = block;
    const mapped = mapper(it);
    for (const [k, v] of Object.entries(mapped)) {
      out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
    return out;
  }).join(''));
}

function renderStringList(md, name, items) {
  const re = new RegExp(`{{#${name}}}([\\s\\S]*?){{/${name}}}`, 'g');
  return md.replace(re, (_, block) => items.map(s =>
    block.replace(/{{\s*\.\s*}}/g, String(s))
  ).join(''));
}

function formatAed(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-AE').format(n);
}

function fail(code, msg) {
  process.stderr.write(`render-proposal: ${msg}\n`);
  process.exit(code);
}

main();
