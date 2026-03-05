import type { APIRoute } from 'astro';

const HUBSPOT_PORTAL_ID = '147940148';
const HUBSPOT_FORM_GUID = '838aa154-ee64-47e0-a6bf-4d20c5408ca5';
const HUBSPOT_API_URL = `https://api-eu1.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const res = await fetch(HUBSPOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Submission failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
