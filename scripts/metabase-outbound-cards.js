#!/usr/bin/env node
/*
 * metabase-outbound-cards.js — one-shot: create the "Outbound KPIs" Metabase
 * collection + cards + dashboard against the warehouse. Run inside a container
 * that can reach http://metabase:3000 (e.g. pandoc-render).
 *
 * Creds via env (NOT committed): MB_USER, MB_PASS. Optional MB_URL.
 * Idempotent-ish: re-running creates duplicate cards; intended as a one-shot.
 */
const MB = process.env.MB_URL || 'http://metabase:3000';
const USER = process.env.MB_USER, PASS = process.env.MB_PASS;
let session;

async function api(method, path, body) {
  const r = await fetch(MB + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session ? { 'X-Metabase-Session': session } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${t.slice(0, 300)}`);
  return j;
}

const CARDS = [
  { name: 'Outbound — emails sent per day', display: 'line',
    sql: "SELECT sent_at::date AS day, COUNT(*) AS sent FROM raw.uw_outbound_log WHERE channel='email' GROUP BY 1 ORDER BY 1" },
  { name: 'Outbound — email reply rate %', display: 'scalar',
    sql: "SELECT ROUND(100.0*COUNT(reply_at)/NULLIF(COUNT(*),0),1) AS reply_rate_pct FROM raw.uw_outbound_log WHERE channel='email'" },
  { name: 'Outbound — reply sentiment', display: 'row',
    sql: "SELECT COALESCE(reply_sentiment,'(no reply yet)') AS sentiment, COUNT(*) AS n FROM raw.uw_outbound_log WHERE channel='email' GROUP BY 1 ORDER BY 2 DESC" },
  { name: 'Outbound — draft review queue by status', display: 'row',
    sql: "SELECT status, COUNT(*) AS n FROM raw.uw_outbound_draft GROUP BY 1 ORDER BY 2 DESC" },
  { name: 'Outbound — drafts by source', display: 'row',
    sql: "SELECT COALESCE(source,'?') AS source, COUNT(*) AS n FROM raw.uw_outbound_draft GROUP BY 1 ORDER BY 2 DESC" },
  { name: 'Outbound-sourced leads by stage', display: 'row',
    sql: "SELECT s.name AS stage, COUNT(*) AS n FROM raw.leads l JOIN raw.lead_pipeline_stages s ON s.id=l.lead_pipeline_stage_id WHERE l.lead_source_id IN (11,12,13,14,15,16,17,35) GROUP BY 1 ORDER BY 2 DESC" },
  { name: 'Outbound — sends today per practitioner', display: 'table',
    sql: "SELECT practitioner, COUNT(*) AS sent_today FROM raw.uw_outbound_log WHERE channel='email' AND sent_at::date=CURRENT_DATE GROUP BY 1 ORDER BY 2 DESC" },
];

(async () => {
  if (!USER || !PASS) throw new Error('set MB_USER and MB_PASS env');
  session = (await api('POST', '/api/session', { username: USER, password: PASS })).id;
  console.log('session ok');

  const dbs = await api('GET', '/api/database');
  const list = Array.isArray(dbs) ? dbs : (dbs.data || []);
  const wh = list.find(d => /warehouse/i.test(d.name) || d.name === 'warehouse')
          || list.find(d => d.engine === 'postgres');
  if (!wh) throw new Error('warehouse database not found in Metabase: ' + list.map(d => d.name).join(', '));
  console.log('warehouse db id =', wh.id, '(' + wh.name + ')');

  const coll = await api('POST', '/api/collection', { name: 'Outbound KPIs', color: '#1d6f42' })
    .catch(async () => {
      const all = await api('GET', '/api/collection');
      return all.find(c => c.name === 'Outbound KPIs');
    });
  console.log('collection id =', coll.id);

  const dashcards = [];
  let i = 0;
  for (const c of CARDS) {
    const card = await api('POST', '/api/card', {
      name: c.name,
      collection_id: coll.id,
      dataset_query: { type: 'native', native: { query: c.sql }, database: wh.id },
      display: c.display,
      visualization_settings: {},
    });
    const col = (i % 2) * 12;
    const row = Math.floor(i / 2) * 5;
    const sizeX = c.display === 'scalar' ? 6 : 12;
    dashcards.push({ id: -1 - i, card_id: card.id, row, col, size_x: sizeX, size_y: 5 });
    console.log('card created:', card.id, c.name);
    i++;
  }

  const dash = await api('POST', '/api/dashboard', { name: 'Outbound', collection_id: coll.id });
  console.log('dashboard id =', dash.id);
  await api('PUT', `/api/dashboard/${dash.id}`, { dashcards });
  console.log('DONE: dashboard "Outbound" with', dashcards.length, 'cards');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
