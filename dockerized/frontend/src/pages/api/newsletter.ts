import type { APIRoute } from 'astro';

export const prerender = false;

const HUBSPOT_PORTAL_ID = '147940148';
const HUBSPOT_FORM_GUID = '838aa154-ee64-47e0-a6bf-4d20c5408ca5';
const HUBSPOT_API_URL = `https://api-eu1.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`;
const TURNSTILE_SECRET = import.meta.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;

async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true;
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, lead_magnet } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify Turnstile CAPTCHA if configured
    if (TURNSTILE_SECRET) {
      const turnstileToken = body['cf-turnstile-response'];
      if (!await verifyTurnstile(turnstileToken)) {
        return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const helpText = lead_magnet
      ? `Lead Magnet: ${lead_magnet}`
      : 'Newsletter Subscription';

    const payload = {
      fields: [
        { name: 'email', value: email },
        { name: 'firstname', value: '' },
        { name: '0-2/name', value: '' },
        { name: 'what_can_we_help_with_', value: helpText },
      ],
      context: {
        pageUri: request.headers.get('referer') || 'https://underwings.org',
        pageName: lead_magnet ? `Lead Magnet: ${lead_magnet}` : 'Newsletter Signup',
      },
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: 'I agree to receive cybersecurity updates from Underwings Cybersecurity Solutions.',
        },
      },
    };

    const res = await fetch(HUBSPOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Subscription failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
