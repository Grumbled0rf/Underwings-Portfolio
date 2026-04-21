// Scan all blog post markdown bodies for external URLs and report
// which ones are broken (4xx / 5xx / timeout / DNS error).
//
// Usage (from frontend/):
//   PUBLIC_SUPABASE_URL=... PUBLIC_SUPABASE_ANON_KEY=... \
//     node scripts/scan-blog-links.mjs
//
// Exit 0 always; report is printed to stdout. Redirect to file:
//   node scripts/scan-blog-links.mjs > blog-link-report.txt

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TIMEOUT_MS = 8000;
const CONCURRENCY = 10;
const UA = 'Mozilla/5.0 (compatible; UnderwingsLinkChecker/1.0)';

// Domains we never flag — they block bots but the links are fine for humans.
const SKIP_DOMAINS = new Set([
  'www.linkedin.com', 'linkedin.com',
  'twitter.com', 'x.com',
  'www.instagram.com', 'instagram.com',
  'www.facebook.com', 'facebook.com',
]);

function extractUrls(markdown) {
  if (!markdown) return [];
  const urls = new Set();
  // [text](url) and <url> in markdown, plus raw https:// URLs
  const patterns = [
    /\]\((https?:\/\/[^\s)]+)\)/g,
    /<(https?:\/\/[^>\s]+)>/g,
    /(?<![\w("'=])https?:\/\/[^\s)"'<>\]]+/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(markdown)) !== null) {
      urls.add((m[1] || m[0]).replace(/[.,;:!?)]+$/, ''));
    }
  }
  return [...urls];
}

async function checkUrl(url) {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return { url, status: 'INVALID_URL' }; }
  if (SKIP_DOMAINS.has(host)) return { url, status: 'SKIP', note: 'social platform' };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // HEAD first; fall back to GET for servers that reject HEAD.
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    }
    clearTimeout(t);
    return { url, status: res.status, finalUrl: res.url !== url ? res.url : null };
  } catch (err) {
    clearTimeout(t);
    return { url, status: 'ERR', note: err.name === 'AbortError' ? 'timeout' : err.message };
  }
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

function isBroken(r) {
  if (r.status === 'SKIP') return false;
  if (r.status === 'ERR' || r.status === 'INVALID_URL') return true;
  return typeof r.status === 'number' && r.status >= 400;
}

async function main() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, content')
    .order('published_at', { ascending: false });

  if (error) { console.error('DB error:', error.message); process.exit(1); }
  if (!posts?.length) { console.log('No posts found.'); return; }

  console.log(`Scanning ${posts.length} posts…\n`);

  const perPost = [];
  for (const post of posts) {
    const urls = extractUrls(post.content);
    if (!urls.length) continue;
    const results = await mapLimit(urls, CONCURRENCY, checkUrl);
    const broken = results.filter(isBroken);
    perPost.push({ post, total: urls.length, broken });
  }

  let totalBroken = 0;
  for (const { post, total, broken } of perPost) {
    if (!broken.length) continue;
    totalBroken += broken.length;
    console.log(`\n── /blog/${post.slug}  (${broken.length}/${total} broken)`);
    for (const r of broken) {
      const status = typeof r.status === 'number' ? r.status : `${r.status}${r.note ? ` (${r.note})` : ''}`;
      console.log(`  [${status}]  ${r.url}`);
    }
  }

  console.log(`\n==========  ${totalBroken} broken links across ${perPost.filter(p => p.broken.length).length} posts  ==========`);
}

main().catch(err => { console.error(err); process.exit(1); });
