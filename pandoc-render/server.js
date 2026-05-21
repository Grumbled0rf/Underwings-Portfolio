/*
 * pandoc-render — HTTP sidecar for proposal generation
 *
 * Endpoints:
 *   GET  /health                  — liveness probe
 *   POST /render                  — render a proposal to PDF
 *     auth header: X-Shared-Token (must equal env SHARED_TOKEN)
 *     body: { sku, lead, claude, today }
 *     response: { ok, proposal_ref, markdown, pdf_base64 }
 *
 * Reads templates/skus.yml + templates/proposals/*.md + _shared-footer.md
 * from /data, mounted read-only by docker-compose.
 *
 * Returns the PDF as base64 in the response JSON (≤2 MB typical;
 * Documenso accepts up to 10 MB upload). Avoids needing a shared volume
 * between this container and n8n.
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const yaml    = require('js-yaml');
const { spawnSync } = require('child_process');
const crypto  = require('crypto');

const PORT   = process.env.PORT || 3000;
const TOKEN  = process.env.SHARED_TOKEN || '';
const DATA   = '/data';
const OUTDIR = '/tmp/proposals';
const TEMPLATES_DIR = path.join(DATA, 'templates', 'proposals');
const SKUS_PATH = path.join(DATA, 'templates', 'skus.yml');

if (!TOKEN) {
  console.error('FATAL: SHARED_TOKEN env var not set');
  process.exit(1);
}

fs.mkdirSync(OUTDIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '1mb' }));

// ─── liveness ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  // Confirm pandoc is reachable
  const r = spawnSync('pandoc', ['--version'], { encoding: 'utf8' });
  if (r.status !== 0) return res.status(503).json({ ok: false, reason: 'pandoc unavailable' });
  res.json({ ok: true, pandoc: r.stdout.split('\n')[0] });
});

// ─── render ───────────────────────────────────────────────────────────
app.post('/render', (req, res) => {
  if (req.get('X-Shared-Token') !== TOKEN) {
    return res.status(401).json({ ok: false, reason: 'unauthorized' });
  }

  try {
    const { sku, lead, claude, today } = req.body || {};
    if (!sku || !lead || !claude || !today) {
      return res.status(400).json({ ok: false, reason: 'missing sku, lead, claude, or today' });
    }

    // Load SKU + template + footer from /data (mounted read-only)
    const catalog = yaml.load(fs.readFileSync(SKUS_PATH, 'utf8'));
    const skuRecord = (catalog.skus || []).find(s => s.sku === sku);
    if (!skuRecord) return res.status(400).json({ ok: false, reason: `unknown SKU: ${sku}` });

    const template = fs.readFileSync(path.join(TEMPLATES_DIR, skuRecord.template), 'utf8');
    const footer   = fs.readFileSync(path.join(TEMPLATES_DIR, '_shared-footer.md'), 'utf8');

    // Stable proposal ref
    const refDate = today.replace(/-/g, '');
    const seq = crypto.randomBytes(2).toString('hex').toUpperCase();
    const ref = `UW-${lead.lead_id}-${refDate}-${seq}`;

    // Render markdown
    const ctx = {
      client_company:        lead.organization_name || 'Client',
      proposal_date:         today,
      proposal_ref:          ref,
      client_context:        claude.client_context || '',
      start_date_suggestion: claude.start_date_suggestion || '',
      total_aed:             formatAed(claude.total_aed),
    };

    let md = template;
    md = md.replace(/{{>\s*_shared-footer\s*}}/g, footer);
    for (const [k, v] of Object.entries(ctx)) {
      md = md.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
    md = renderList(md, 'scope_items',            claude.scope_items || [],     (it) => ({ item: it.item || '', description: it.description || '' }));
    md = renderList(md, 'line_items',             claude.line_items || [],      (it) => ({ description: it.description || '', aed: formatAed(it.aed) }));
    md = renderStringList(md, 'out_of_scope_specifics', claude.out_of_scope_specifics || []);

    // Write markdown + PDF
    const dir = path.join(OUTDIR, ref);
    fs.mkdirSync(dir, { recursive: true });
    const mdPath  = path.join(dir, 'proposal.md');
    const pdfPath = path.join(dir, 'proposal.pdf');
    fs.writeFileSync(mdPath, md, 'utf8');

    const pandocArgs = [
      mdPath,
      '-o', pdfPath,
      '--pdf-engine=xelatex',
      '-V', 'geometry:margin=2.2cm',
      '-V', 'mainfont=DejaVu Sans',
      '-V', 'monofont=DejaVu Sans Mono',
      '-V', 'colorlinks=true',
      '-V', 'linkcolor=blue',
      '--standalone',
    ];

    const pandoc = spawnSync('pandoc', pandocArgs, { encoding: 'utf8' });
    if (pandoc.status !== 0) {
      return res.status(500).json({
        ok: false,
        reason: 'pandoc failed',
        stderr: (pandoc.stderr || '').slice(0, 2000),
        markdown: md,
      });
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    res.json({
      ok: true,
      proposal_ref: ref,
      pdf_base64:   pdfBytes.toString('base64'),
      pdf_size:     pdfBytes.length,
      markdown:     md,
    });
  } catch (e) {
    res.status(500).json({ ok: false, reason: String(e.message || e) });
  }
});

// ─── helpers ──────────────────────────────────────────────────────────
function renderList(md, name, items, mapper) {
  const re = new RegExp(`{{#${name}}}([\\s\\S]*?){{/${name}}}`, 'g');
  return md.replace(re, (_, block) => items.map(it => {
    let out = block;
    for (const [k, v] of Object.entries(mapper(it))) {
      out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
    return out;
  }).join(''));
}

function renderStringList(md, name, items) {
  const re = new RegExp(`{{#${name}}}([\\s\\S]*?){{/${name}}}`, 'g');
  return md.replace(re, (_, block) => items.map(s => block.replace(/{{\s*\.\s*}}/g, String(s))).join(''));
}

function formatAed(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-AE').format(n);
}

app.listen(PORT, () => {
  console.log(`pandoc-render listening on :${PORT}`);
});
