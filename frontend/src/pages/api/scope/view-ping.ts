import type { APIRoute } from 'astro';
import { supa } from '../../../lib/scope-builder/server/supabase';
import { logScopeView } from '../../../lib/scope-builder/server/krayin';
import { notifyView } from '../../../lib/scope-builder/server/slack';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: any;
  try { body = await request.json(); } catch { return new Response('bad', { status: 400 }); }
  const token = String(body.token || '');
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return new Response('bad', { status: 400 });

  const { data: scope } = await supa.from('scopes').select('id, reference, expires_at').eq('token', token).maybeSingle();
  if (!scope) return new Response('not found', { status: 404 });
  if (new Date(scope.expires_at) < new Date()) return new Response('expired', { status: 410 });

  const ua = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const ip = clientAddress || '';

  await supa.from('scope_views').insert({
    scope_id: scope.id,
    ip: ip || null,
    user_agent: ua || null,
    referer: referer || null,
  });

  // Count views for Slack message
  const { count } = await supa.from('scope_views').select('*', { count: 'exact', head: true }).eq('scope_id', scope.id);

  await Promise.allSettled([
    logScopeView({ scope_token: token, ip, user_agent: ua, referer }),
    notifyView({ reference: scope.reference, view_count: count ?? 0 }),
  ]);

  return new Response('ok', { status: 200 });
};
