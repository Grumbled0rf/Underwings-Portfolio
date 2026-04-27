import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supa } from '../../../lib/scope-builder/server/supabase';

export const prerender = false;

const SECRET = process.env.KRAYIN_REVERSE_SECRET || '';

export const POST: APIRoute = async ({ request }) => {
  if (!SECRET) return new Response('disabled', { status: 503 });
  const raw = await request.text();
  const sig = request.headers.get('x-krayin-signature') || '';
  const expected = createHmac('sha256', SECRET).update(raw).digest('hex');
  let valid = false;
  try { valid = sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch {}
  if (!valid) return new Response('forbidden', { status: 403 });

  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response('bad', { status: 400 }); }
  const token = String(body.scope_token || '');
  const status = String(body.status || '');
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return new Response('bad', { status: 400 });
  if (!['won', 'lost', 'quoted', 'negotiating'].includes(status)) return new Response('bad', { status: 400 });

  const { error } = await supa.from('scopes').update({ status, updated_at: new Date().toISOString() }).eq('token', token);
  if (error) return new Response('db', { status: 500 });

  return new Response('ok', { status: 200 });
};
