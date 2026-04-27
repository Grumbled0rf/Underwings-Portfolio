import type { APIRoute } from 'astro';
import DOMPurify from 'isomorphic-dompurify';
import { supa, nextReference } from '../../lib/scope-builder/server/supabase';
import { generateToken, expiryDate } from '../../lib/scope-builder/reference';
import { bundle } from '../../lib/scope-builder/bundle';
import { buildScopePdfHtml, renderPdf } from '../../lib/scope-builder/server/pdf';
import { sendBuyerEmail, sendTeamEmail } from '../../lib/scope-builder/server/email';
import { createScopeLead } from '../../lib/scope-builder/server/krayin';
import { notifyNewScope } from '../../lib/scope-builder/server/slack';
import type { CartItem } from '../../lib/scope-builder/cart';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'invalid_json' }, 400); }

  // Validate
  const cart = Array.isArray(body.cart) ? body.cart as CartItem[] : null;
  const lead = body.lead;
  if (!cart || cart.length === 0) return json({ error: 'cart_empty' }, 400);
  if (!lead?.name || !lead?.email || !lead?.company) return json({ error: 'lead_required' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(lead.email))) return json({ error: 'email_invalid' }, 400);

  // Sanitize free-text fields
  const cleanCart = cart.map((i) => ({ ...i, comments: i.comments ? sanitize(i.comments) : undefined, summary: sanitize(i.summary) }));
  const comments = {
    worry:    body.comments?.worry    ? sanitize(String(body.comments.worry))    : undefined,
    deadline: body.comments?.deadline ? sanitize(String(body.comments.deadline)) : undefined,
    existing: body.comments?.existing ? sanitize(String(body.comments.existing)) : undefined,
    other:    body.comments?.other    ? sanitize(String(body.comments.other))    : undefined,
  };
  const cleanLead = {
    name:        sanitize(String(lead.name)).slice(0, 200),
    email:       sanitize(String(lead.email)).slice(0, 200).toLowerCase(),
    company:     sanitize(String(lead.company)).slice(0, 200),
    phone:       lead.phone ? sanitize(String(lead.phone)).slice(0, 50) : undefined,
    whatsapp_ok: !!lead.whatsapp_ok,
    best_time:   lead.best_time ? sanitize(String(lead.best_time)).slice(0, 20) : undefined,
  };

  const founding_optin = !!body.founding_optin;
  const b = bundle(cleanCart);
  const token = generateToken();
  const reference = await nextReference();
  const expires = expiryDate(30);
  const origin = url.origin;

  // 1. Insert into Supabase
  const { data: scopeRow, error: dbErr } = await supa.from('scopes').insert({
    token,
    reference,
    cart: cleanCart,
    comments,
    founding_optin,
    range_low: b.adjusted.low,
    range_high: b.adjusted.high,
    bundle_savings: b.signal || null,
    lead_name: cleanLead.name,
    lead_email: cleanLead.email,
    lead_company: cleanLead.company,
    lead_phone: cleanLead.phone || null,
    whatsapp_ok: cleanLead.whatsapp_ok,
    best_time: cleanLead.best_time || null,
    expires_at: expires.toISOString(),
  }).select('id').single();
  if (dbErr || !scopeRow) return json({ error: 'db_failed', detail: dbErr?.message }, 500);

  // 2. Render PDF
  const html = buildScopePdfHtml({
    reference, token, cart: cleanCart, bundle: b, comments, founding_optin,
    lead: cleanLead, expires_at: expires,
  });
  let pdfBytes: Buffer;
  try { pdfBytes = await renderPdf(html); }
  catch (e) { return json({ error: 'pdf_failed', detail: String(e) }, 500); }

  // 3. Save PDF to disk
  const pdfDir = '/data/scopes';
  await mkdir(pdfDir, { recursive: true });
  const pdfPath = join(pdfDir, `${token}.pdf`);
  await writeFile(pdfPath, pdfBytes);
  await supa.from('scopes').update({ pdf_path: pdfPath }).eq('id', scopeRow.id);

  // 4. Krayin lead
  const krayin = await createScopeLead({
    reference, token,
    name: cleanLead.name, email: cleanLead.email, company: cleanLead.company, phone: cleanLead.phone,
    range_low: b.adjusted.low, range_high: b.adjusted.high,
    founding_optin,
    cart: cleanCart, comments,
    whatsapp_ok: cleanLead.whatsapp_ok,
  });
  if (krayin.lead_id) await supa.from('scopes').update({ krayin_lead_id: krayin.lead_id }).eq('id', scopeRow.id);

  // 5. Emails (parallel)
  const sendInput = {
    reference, token, cart: cleanCart, bundle: b, comments, founding_optin,
    lead: { ...cleanLead, whatsapp_ok: cleanLead.whatsapp_ok },
    pdfBytes, krayin_lead_id: krayin.lead_id ?? undefined, origin,
  };
  await Promise.allSettled([
    sendBuyerEmail(sendInput),
    sendTeamEmail(sendInput),
    notifyNewScope({
      reference,
      range_low: b.adjusted.low, range_high: b.adjusted.high,
      n_services: cleanCart.length, company: cleanLead.company,
      founding_optin,
      krayin_url: krayin.lead_id ? `https://crm.underwings.org/admin/leads/view/${krayin.lead_id}` : null,
      hosted_url: `${origin}/scope/${token}`,
    }),
  ]);

  return json({
    success: true,
    reference,
    token,
    range: { low: b.adjusted.low, high: b.adjusted.high },
    redirect: `/scope-builder/thanks/${reference}`,
  });
};

function sanitize(s: string): string { return DOMPurify.sanitize(s, { ALLOWED_TAGS: [] }); }
function json(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
