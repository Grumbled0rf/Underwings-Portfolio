import type { APIRoute } from 'astro';

export const prerender = false;

// =============================================
// CYBERSECURITY UPDATES API
// Fetches and aggregates public RSS feeds
// =============================================

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceIcon: string;
  severity?: string;
}

// Simple in-memory cache (refreshes every 30 minutes)
let cache: { data: FeedItem[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const FEEDS = [
  {
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    source: 'CISA',
    sourceIcon: 'cisa',
  },
  {
    url: 'https://feeds.feedburner.com/TheHackersNews',
    source: 'The Hacker News',
    sourceIcon: 'thn',
  },
  {
    url: 'https://www.bleepingcomputer.com/feed/',
    source: 'BleepingComputer',
    sourceIcon: 'bleeping',
  },
];

function extractTextContent(xml: string, tag: string): string {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

function parseRSSItems(xml: string, source: string, sourceIcon: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
    const itemXml = match[1];
    const title = extractTextContent(itemXml, 'title');
    const link = extractTextContent(itemXml, 'link') || extractTextContent(itemXml, 'guid');
    const description = extractTextContent(itemXml, 'description');
    const pubDate = extractTextContent(itemXml, 'pubDate');

    if (title && link) {
      // Detect severity from title/description keywords
      let severity: string | undefined;
      const text = (title + ' ' + description).toLowerCase();
      if (text.includes('critical') || text.includes('emergency') || text.includes('actively exploited')) {
        severity = 'critical';
      } else if (text.includes('high') || text.includes('important') || text.includes('vulnerability')) {
        severity = 'high';
      } else if (text.includes('medium') || text.includes('moderate')) {
        severity = 'medium';
      }

      // Truncate description
      const cleanDesc = description
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/<[^>]+>/g, '')
        .slice(0, 200);

      items.push({
        title,
        link,
        description: cleanDesc + (description.length > 200 ? '...' : ''),
        pubDate,
        source,
        sourceIcon,
        severity,
      });
    }
  }

  return items;
}

async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Underwings-Updates/1.0' },
        });
        clearTimeout(timeout);

        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSSItems(xml, feed.source, feed.sourceIcon);
      } catch {
        clearTimeout(timeout);
        return [];
      }
    })
  );

  const allItems: FeedItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  // Sort by date (newest first)
  allItems.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime() || 0;
    const dateB = new Date(b.pubDate).getTime() || 0;
    return dateB - dateA;
  });

  return allItems.slice(0, 30); // Return top 30
}

export const GET: APIRoute = async () => {
  try {
    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cache.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }

    const items = await fetchAllFeeds();
    cache = { data: items, timestamp: Date.now() };

    return new Response(JSON.stringify(items), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch updates' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
