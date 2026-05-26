/*
 * pandoc-render — sidecar for workflow 07 (Proposal Generator)
 *
 * Endpoints:
 *   GET  /health
 *   POST /render    — legacy: render markdown+claude → PDF (kept for tests)
 *   POST /proposal  — end-to-end: fetch lead → Claude → PDF → Documenso → Krayin
 *
 * Both endpoints require X-Shared-Token header == env SHARED_TOKEN.
 *
 * The /proposal endpoint is the main thing. n8n's workflow 07 calls this
 * with { lead_id, sku, scope_notes } and gets back a single JSON response
 * indicating success/failure. All complex orchestration lives here, NOT in
 * n8n, because n8n's per-node templating + IF + cross-node lookup are too
 * fragile across version upgrades (see feedback_n8n_workflow_fragility
 * memory entry).
 */

const express     = require('express');
const fs          = require('fs');
const path        = require('path');
const yaml        = require('js-yaml');
const { spawnSync } = require('child_process');
const crypto      = require('crypto');
const mysql       = require('mysql2/promise');
const { Pool }    = require('pg');

const PORT   = process.env.PORT || 3000;
const TOKEN  = process.env.SHARED_TOKEN || '';
const DATA   = '/data';
const OUTDIR = '/tmp/proposals';

const TEMPLATES_DIR = path.join(DATA, 'templates', 'proposals');
const SKUS_PATH     = path.join(DATA, 'templates', 'skus.yml');
const PROMPT_PATH   = path.join(DATA, 'prompts', 'proposal-generation.md');

const KRAYIN_DB_CONFIG = {
  host:     process.env.KRAYIN_DB_HOST     || 'krayin-db',
  user:     process.env.KRAYIN_DB_USER     || 'krayin',
  password: process.env.KRAYIN_DB_PASSWORD || '',
  database: process.env.KRAYIN_DB_DATABASE || 'krayin',
  waitForConnections: true,
  connectionLimit: 4,
};

const WAREHOUSE_PG_CONFIG = {
  host:     process.env.WAREHOUSE_DB_HOST     || 'metrics-db',
  port:     parseInt(process.env.WAREHOUSE_DB_PORT || '5432', 10),
  user:     process.env.WAREHOUSE_DB_USER     || 'warehouse_admin',
  password: process.env.WAREHOUSE_DB_PASSWORD || '',
  database: process.env.WAREHOUSE_DB_DATABASE || 'warehouse',
  max: 4,
};

const ANTHROPIC_API_KEY    = process.env.ANTHROPIC_API_KEY || '';
const DOCUMENSO_API_KEY    = process.env.DOCUMENSO_API_KEY || '';
const DOCUMENSO_BASE_URL   = process.env.DOCUMENSO_BASE_URL || 'http://documenso:3000';
const KRAYIN_WEBHOOK_BASE  = process.env.KRAYIN_WEBHOOK_BASE  || 'http://krayin';
const KRAYIN_WEBHOOK_TOKEN = process.env.KRAYIN_WEBHOOK_TOKEN || '';

if (!TOKEN) { console.error('FATAL: SHARED_TOKEN env var not set'); process.exit(1); }

fs.mkdirSync(OUTDIR, { recursive: true });

const krayinPool    = mysql.createPool(KRAYIN_DB_CONFIG);
const warehousePool = new Pool(WAREHOUSE_PG_CONFIG);

const app = express();
app.use(express.json({ limit: '1mb' }));
const server = app.listen(PORT, () => console.log(`pandoc-render v2 listening on :${PORT}`));
server.setTimeout(60000);

// ───── shared helpers ────────────────────────────────────────────────

function requireToken(req, res) {
  if (req.get('X-Shared-Token') !== TOKEN) {
    res.status(401).json({ ok: false, step: 'auth', reason: 'unauthorized' });
    return false;
  }
  return true;
}

function loadCatalog() {
  return yaml.load(fs.readFileSync(SKUS_PATH, 'utf8'));
}

function loadTemplate(skuRecord) {
  const template = fs.readFileSync(path.join(TEMPLATES_DIR, skuRecord.template), 'utf8');
  const footer   = fs.readFileSync(path.join(TEMPLATES_DIR, '_shared-footer.md'), 'utf8');
  return { template, footer };
}

function loadPrompt() {
  return fs.readFileSync(PROMPT_PATH, 'utf8');
}

function formatAed(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-AE').format(n);
}

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
  return md.replace(re, (_, block) =>
    items.map(s => block.replace(/{{\s*\.\s*}}/g, String(s))).join(''));
}

function renderMarkdown(template, footer, claude, lead, ref, today) {
  let md = template;
  md = md.replace(/{{>\s*_shared-footer\s*}}/g, footer);
  const ctx = {
    client_company:        lead.organization_name || 'Client',
    proposal_date:         today,
    proposal_ref:          ref,
    client_context:        claude.client_context || '',
    start_date_suggestion: claude.start_date_suggestion || '',
    total_aed:             formatAed(claude.total_aed),
  };
  for (const [k, v] of Object.entries(ctx)) {
    md = md.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
  }
  md = renderList(md, 'scope_items', claude.scope_items || [],
    (it) => ({ item: it.item || '', description: it.description || '' }));
  md = renderList(md, 'line_items', claude.line_items || [],
    (it) => ({ description: it.description || '', aed: formatAed(it.aed) }));
  md = renderStringList(md, 'out_of_scope_specifics', claude.out_of_scope_specifics || []);
  return md;
}

function makePdf(ref, md) {
  const dir = path.join(OUTDIR, ref);
  fs.mkdirSync(dir, { recursive: true });
  const mdPath  = path.join(dir, 'proposal.md');
  const pdfPath = path.join(dir, 'proposal.pdf');
  fs.writeFileSync(mdPath, md, 'utf8');

  const pandoc = spawnSync('pandoc', [
    mdPath, '-o', pdfPath,
    '--pdf-engine=xelatex',
    '-V', 'geometry:margin=2.2cm',
    '-V', 'mainfont=DejaVu Sans',
    '-V', 'monofont=DejaVu Sans Mono',
    '-V', 'colorlinks=true',
    '-V', 'linkcolor=blue',
    '--standalone',
  ], { encoding: 'utf8' });
  if (pandoc.status !== 0) {
    const err = new Error('pandoc failed');
    err.stderr = (pandoc.stderr || '').slice(0, 2000);
    throw err;
  }
  return pdfPath;
}

async function fetchKrayinLead(leadId) {
  const [rows] = await krayinPool.execute(
    `SELECT l.id AS lead_id, l.title, l.description, l.lead_value,
            l.lead_pipeline_id, l.lead_pipeline_stage_id, l.lead_source_id,
            p.name AS person_name, p.emails AS person_emails,
            o.id AS organization_id, o.name AS organization_name,
            src.name AS source_name
       FROM leads l
       LEFT JOIN persons p       ON p.id = l.person_id
       LEFT JOIN organizations o ON o.id = p.organization_id
       LEFT JOIN lead_sources src ON src.id = l.lead_source_id
      WHERE l.id = ?
      LIMIT 1`,
    [leadId]
  );
  if (!rows.length) throw new Error(`Krayin lead ${leadId} not found`);
  const r = rows[0];
  // emails column is JSON in Krayin
  let emails = r.person_emails;
  try {
    const arr = JSON.parse(emails);
    emails = Array.isArray(arr) && arr[0] ? arr[0].value : emails;
  } catch (_) { /* leave as raw string */ }
  return { ...r, person_emails: emails };
}

async function callClaude(systemBlocks, userMessage) {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemBlocks,
    messages: [{ role: 'user', content: userMessage }],
  });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body,
  });
  if (!r.ok) {
    const text = await r.text();
    const err = new Error(`Claude API ${r.status}`);
    err.body = text.slice(0, 500);
    throw err;
  }
  return r.json();
}

function parseClaudeJson(textRaw) {
  let text = textRaw.replace(/^```json\s*|\s*```$/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { const err = new Error('Claude returned invalid JSON'); err.preview = text.slice(0, 300); throw err; }
  return parsed;
}

function validateClaudeOutput(parsed, skuRecord) {
  if (parsed.needs_more_info) {
    const err = new Error('Claude flagged needs_more_info');
    err.missing_info = parsed.missing_info || [];
    err.recoverable = true;
    throw err;
  }
  const sumLines = (parsed.line_items || []).reduce((s, l) => s + (l.aed || 0), 0);
  if (sumLines !== parsed.total_aed) {
    const err = new Error(`Line items sum ${sumLines} != total_aed ${parsed.total_aed}`);
    throw err;
  }
  const [_pmin, pmax] = skuRecord.price_range_aed;
  if (parsed.total_aed > pmax) {
    const flagged = (parsed.rationale || '').toLowerCase().includes('scope larger') ||
                    (parsed.rationale || '').toLowerCase().includes('review price');
    if (!flagged) {
      const err = new Error(`total_aed ${parsed.total_aed} exceeds SKU max ${pmax} without scope-expansion flag`);
      throw err;
    }
  }
  return parsed;
}

async function createDocumensoEnvelope({ title, recipientName, recipientEmail, pdfPath }) {
  // Step 1: create the envelope (metadata only) → returns uploadUrl + documentId
  const meta = await fetch(`${DOCUMENSO_BASE_URL}/api/v1/documents`, {
    method: 'POST',
    headers: { 'Authorization': DOCUMENSO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      recipients: [{ name: recipientName, email: recipientEmail, role: 'SIGNER' }],
      meta: {
        subject: `Underwings proposal: ${title}`,
        message: `Please review and sign the attached proposal. Reply to this email if you have any questions before signing.`,
      },
    }),
  });
  if (!meta.ok) {
    const text = await meta.text();
    const err = new Error(`Documenso create ${meta.status}`); err.body = text.slice(0, 500); throw err;
  }
  const metaJson = await meta.json();
  const { uploadUrl, documentId } = metaJson;
  const recipientId = metaJson.recipients?.[0]?.recipientId;

  // Step 2: PUT the PDF bytes to the issued uploadUrl
  const pdfBytes = fs.readFileSync(pdfPath);
  const up = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: pdfBytes,
  });
  if (!up.ok) {
    const text = await up.text();
    const err = new Error(`Documenso upload ${up.status}`); err.body = text.slice(0, 500); throw err;
  }

  // Step 2b: add a signature field for the signer (required before send).
  // Placed bottom-left of page 1 — the client drops their signature there.
  if (recipientId) {
    const field = await fetch(`${DOCUMENSO_BASE_URL}/api/v1/documents/${documentId}/fields`, {
      method: 'POST',
      headers: { 'Authorization': DOCUMENSO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId,
        type: 'SIGNATURE',
        pageNumber: 1,
        pageX: 8,
        pageY: 85,
        pageWidth: 30,
        pageHeight: 8,
      }),
    });
    if (!field.ok) {
      const text = await field.text();
      console.error(`Documenso field-create ${field.status}: ${text.slice(0, 200)}`);
    }
  }

  // Step 3: send the envelope (emails the recipient)
  const send = await fetch(`${DOCUMENSO_BASE_URL}/api/v1/documents/${documentId}/send`, {
    method: 'POST',
    headers: { 'Authorization': DOCUMENSO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sendEmail: true, sendCompletionEmails: true }),
  });
  if (!send.ok) {
    const text = await send.text();
    // Don't fail the whole proposal if send fails — the envelope exists.
    console.error(`Documenso send ${send.status}: ${text.slice(0, 200)}`);
  }

  return { id: documentId, ...metaJson };
}

async function updateKrayinStage(leadId, stageId, note) {
  const r = await fetch(`${KRAYIN_WEBHOOK_BASE}/webhook-lead-update.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Token': KRAYIN_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({ lead_id: leadId, stage_id: stageId, note }),
  });
  if (!r.ok) {
    const text = await r.text();
    const err = new Error(`Krayin webhook ${r.status}`);
    err.body = text.slice(0, 200);
    throw err;
  }
  return r.json().catch(() => ({}));
}

async function logClaudeSpend({ workflow, model, usage, leadId, note }) {
  // Approx Sonnet 4.6 pricing: $3/M input, $15/M output. AED ≈ 3.67 USD.
  const inT = usage.input_tokens || 0;
  const outT = usage.output_tokens || 0;
  const usd = ((inT * 3 + outT * 15) / 1_000_000);
  const aed = usd * 3.67;
  await warehousePool.query(
    `INSERT INTO ops.claude_api_calls
       (workflow_name, model, input_tokens, output_tokens, cache_read_tokens, cache_create_tokens, cost_usd, cost_aed, related_lead_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [workflow, model, inT, outT, usage.cache_read_input_tokens || 0, usage.cache_creation_input_tokens || 0,
     usd.toFixed(4), aed.toFixed(4), leadId, note]
  );
}

// ───── /health ───────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  const r = spawnSync('pandoc', ['--version'], { encoding: 'utf8' });
  if (r.status !== 0) return res.status(503).json({ ok: false, reason: 'pandoc unavailable' });
  res.json({ ok: true, pandoc: r.stdout.split('\n')[0], v: '2.0.0' });
});

// ───── /render (legacy, used by tests + the deprecated 16-node workflow) ─

app.post('/render', (req, res) => {
  if (!requireToken(req, res)) return;
  try {
    const { sku, lead, claude, today } = req.body || {};
    if (!sku || !lead || !claude || !today) {
      return res.status(400).json({ ok: false, reason: 'missing sku, lead, claude, or today' });
    }
    const catalog = loadCatalog();
    const skuRecord = (catalog.skus || []).find(s => s.sku === sku);
    if (!skuRecord) return res.status(400).json({ ok: false, reason: `unknown SKU: ${sku}` });
    const { template, footer } = loadTemplate(skuRecord);
    const refDate = today.replace(/-/g, '');
    const seq = crypto.randomBytes(2).toString('hex').toUpperCase();
    const ref = `UW-${lead.lead_id}-${refDate}-${seq}`;
    const md = renderMarkdown(template, footer, claude, lead, ref, today);
    const pdfPath = makePdf(ref, md);
    const pdfBytes = fs.readFileSync(pdfPath);
    res.json({ ok: true, proposal_ref: ref, pdf_base64: pdfBytes.toString('base64'), pdf_size: pdfBytes.length, markdown: md });
  } catch (e) {
    res.status(500).json({ ok: false, reason: String(e.message || e), stderr: e.stderr });
  }
});

// ───── /proposal (the real thing) ────────────────────────────────────

app.post('/proposal', async (req, res) => {
  if (!requireToken(req, res)) return;
  const body = req.body || {};
  // Accept fields under any plausible key (n8n form-trigger output format
  // varies — sends human-label keys like 'Krayin lead ID'; other callers
  // may send snake_case). This makes the sidecar robust to caller format.
  const lead_id     = body.lead_id     ?? body['Krayin lead ID'] ?? body.leadId ?? body.krayin_lead_id;
  const sku         = body.sku         ?? body['SKU'];
  const scope_notes = body.scope_notes ?? body['Scope notes (everything from the call, freeform)'] ?? body.scopeNotes ?? body.scope;
  console.log(`[/proposal] lead_id=${JSON.stringify(lead_id)} sku=${JSON.stringify(sku)} scope_len=${scope_notes ? String(scope_notes).trim().length : 0}`);

  // Validate input shape
  if (!lead_id || !sku || !scope_notes) {
    return res.status(400).json({ ok: false, step: 'input', reason: 'missing lead_id, sku, or scope_notes' });
  }
  if (String(scope_notes).trim().length < 100) {
    return res.status(200).json({ ok: false, step: 'validate', reason: 'scope_notes too short',
      detail: `need ≥100 chars; got ${String(scope_notes).trim().length}` });
  }

  let step = 'init';
  let claudeJson = null;
  let usage = null;
  try {
    // Step 1: SKU lookup
    step = 'sku-lookup';
    const catalog = loadCatalog();
    const skuRecord = (catalog.skus || []).find(s => s.sku === sku);
    if (!skuRecord) return res.status(400).json({ ok: false, step, reason: `unknown SKU: ${sku}` });

    // Step 2: Krayin lead fetch
    step = 'krayin-fetch';
    const lead = await fetchKrayinLead(lead_id);

    // Step 3: load template + footer + prompt
    step = 'template-load';
    const { template, footer } = loadTemplate(skuRecord);
    const promptSource = loadPrompt();

    // Step 4: call Claude
    step = 'claude-call';
    const today = new Date().toISOString().slice(0, 10);
    const systemBlock1 = promptSource.split('## System prompt (cached)')[1]
      .split('## User message')[0]
      .replace(/^```|```$/gm, '')
      .trim();
    const systemBlock2 = `Template:\n${template}\n\nFooter (do not modify):\n${footer}\n\nSKU:\n${JSON.stringify(skuRecord, null, 2)}`;
    const userMessage =
      `Inputs:\n- SKU: ${sku}\n` +
      `- Client company: ${lead.organization_name || 'Unknown'}\n` +
      `- Today (Asia/Dubai): ${today}\n` +
      `- Lead context: ${lead.title}\n` +
      `- Discovery call notes:\n${scope_notes}\n\nReply with JSON only.`;
    const claudeResp = await callClaude(
      [
        { type: 'text', text: systemBlock1 },
        { type: 'text', text: systemBlock2, cache_control: { type: 'ephemeral' } },
      ],
      userMessage
    );
    usage = claudeResp.usage || {};

    // Step 5: parse + validate Claude JSON
    step = 'claude-parse';
    const textOut = claudeResp.content?.[0]?.text || '';
    claudeJson = parseClaudeJson(textOut);

    step = 'claude-validate';
    try {
      validateClaudeOutput(claudeJson, skuRecord);
    } catch (e) {
      // Log Claude cost even on validation failure (we paid for the call)
      logClaudeSpend({ workflow: '07-proposal', model: 'claude-sonnet-4-6', usage,
                       leadId: lead.lead_id, note: `halted at ${step}: ${e.message}` })
        .catch(err => console.error('spend-log failed:', err.message));
      if (e.recoverable) {
        return res.status(200).json({ ok: false, step: 'claude-validate',
          reason: 'needs_more_info', missing_info: e.missing_info });
      }
      throw e;
    }

    // Step 6: render markdown + PDF
    step = 'render';
    const refDate = today.replace(/-/g, '');
    const seq = crypto.randomBytes(2).toString('hex').toUpperCase();
    const ref = `UW-${lead.lead_id}-${refDate}-${seq}`;
    const md = renderMarkdown(template, footer, claudeJson, lead, ref, today);
    const pdfPath = makePdf(ref, md);

    // Step 7: create Documenso envelope
    step = 'documenso-create';
    let documensoEnvelope = null;
    try {
      documensoEnvelope = await createDocumensoEnvelope({
        title: ref,
        recipientName: lead.person_name || 'Client',
        recipientEmail: lead.person_emails || 'unknown@example.com',
        pdfPath,
      });
    } catch (e) {
      // Documenso failure is recoverable — log and continue without envelope.
      // Founder can manually create the envelope later from the PDF on disk.
      console.error(`documenso-create failed: ${e.message} (body: ${e.body || ''})`);
    }

    // Step 8: update Krayin stage → Proposal Sent (stage_id 18 per krayin-ids-reference)
    step = 'krayin-update';
    try {
      await updateKrayinStage(lead.lead_id, 18, `Proposal ${ref} drafted${documensoEnvelope ? ` + Documenso envelope ${documensoEnvelope.id || '?'}` : ' (Documenso failed; manual envelope needed)'}`);
    } catch (e) {
      // Krayin update failure is recoverable — log, return success with warning.
      console.error(`krayin-update failed: ${e.message}`);
    }

    // Step 9: log Claude spend
    step = 'spend-log';
    logClaudeSpend({ workflow: '07-proposal', model: 'claude-sonnet-4-6', usage,
                     leadId: lead.lead_id, note: `${ref}: ${claudeJson.total_aed} AED` })
      .catch(err => console.error('spend-log failed:', err.message));

    res.json({
      ok: true,
      proposal_ref: ref,
      total_aed: claudeJson.total_aed,
      client_company: lead.organization_name,
      client_email: lead.person_emails,
      documenso_envelope_id: documensoEnvelope?.id || null,
      documenso_status: documensoEnvelope ? 'created' : 'failed (PDF on disk; manual envelope needed)',
      pdf_path: pdfPath,
    });
  } catch (e) {
    console.error(`/proposal failed at step ${step}:`, e.message, e.body || e.stderr || '');
    res.status(500).json({ ok: false, step, reason: e.message, body: e.body, stderr: e.stderr });
  }
});

// ───── helpers (above) ──────────────────────────────────────────────
