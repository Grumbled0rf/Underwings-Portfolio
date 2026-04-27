import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { supa } from '../../../../lib/scope-builder/server/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const token = params.token || '';
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return new Response('not found', { status: 404 });
  const { data: scope } = await supa.from('scopes').select('pdf_path, reference, expires_at').eq('token', token).maybeSingle();
  if (!scope || !scope.pdf_path) return new Response('not found', { status: 404 });
  if (new Date(scope.expires_at) < new Date()) return new Response('expired', { status: 410 });
  try {
    const pdf = await readFile(scope.pdf_path);
    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${scope.reference}.pdf"`,
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
};
