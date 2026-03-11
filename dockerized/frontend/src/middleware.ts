import { defineMiddleware } from 'astro:middleware';
import crypto from 'node:crypto';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || 'https://underwings.org';
const ALLOWED_ORIGINS = [
  SITE_URL,
  'http://localhost:8080',
  'http://localhost:4321',
];

export const onRequest = defineMiddleware(async (context, next) => {
  // --- CSRF: Origin validation on state-changing requests ---
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(context.request.method)) {
    const origin = context.request.headers.get('origin');
    const referer = context.request.headers.get('referer');
    const checkValue = origin || (referer ? new URL(referer).origin : null);

    if (checkValue && !ALLOWED_ORIGINS.some(o => checkValue.startsWith(o))) {
      return new Response(JSON.stringify({ error: 'Forbidden: invalid origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // --- CSP: Generate nonce ---
  const nonce = crypto.randomBytes(16).toString('base64');
  context.locals.nonce = nonce;

  const response = await next();

  // Only add CSP to HTML responses (not API JSON, images, etc.)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' https://d3e54v103j8qbb.cloudfront.net https://cdn.prod.website-files.com https://js-eu1.hs-scripts.com https://js.hs-scripts.com https://js.hsforms.net https://js-eu1.hsforms.net https://js.hs-banner.com https://js.hs-analytics.net https://js.usemessages.com https://*.hsappstatic.net https://assets.calendly.com https://challenges.cloudflare.com`,
      `style-src 'self' 'unsafe-inline' https://assets.calendly.com https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https://cdn.brandfetch.io https://www.offsec.com https://track.hubspot.com https://assets.calendly.com`,
      `font-src 'self' data: https://assets.calendly.com https://fonts.gstatic.com`,
      `media-src 'self' blob:`,
      `connect-src 'self' https://api.hsforms.com https://api-eu1.hsforms.com https://forms.hsforms.com https://track.hubspot.com https://calendly.com https://api.anthropic.com https://challenges.cloudflare.com`,
      `frame-src 'self' https://calendly.com https://challenges.cloudflare.com https://*.hsforms.net https://*.hsforms.com https://*.hsappstatic.net`,
      `frame-ancestors 'self'`,
    ].join('; ');

    response.headers.set('Content-Security-Policy', csp);
  }

  return response;
});
