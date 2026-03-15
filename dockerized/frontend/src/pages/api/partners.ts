import type { APIRoute } from 'astro';

export const prerender = false;

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || 'http://kong:8000';
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/partners?select=id,name,logo_url,website_url,display_order,invert_logo&is_visible=eq.true&order=display_order.asc`, {
      headers: {
        'apikey': SUPABASE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error('Partners API error:', res.status, await res.text());
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const partners = await res.json();
    return new Response(JSON.stringify(partners), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    console.error('Partners fetch error:', err);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
