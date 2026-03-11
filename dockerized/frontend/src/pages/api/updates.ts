import type { APIRoute } from 'astro';
import { XMLParser } from 'fast-xml-parser';

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

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
  processEntities: true,
});

function stripHtml(str: string): string {
  return typeof str === 'string' ? str.replace(/<[^>]+>/g, '').trim() : '';
}

function parseRSSItems(xml: string, source: string, sourceIcon: string): FeedItem[] {
  const parsed = xmlParser.parse(xml);
  const channel = parsed?.rss?.channel || parsed?.feed;
  if (!channel) return [];

  const rawItems = channel.item || channel.entry || [];
  const itemList = Array.isArray(rawItems) ? rawItems : [rawItems];

  const items: FeedItem[] = [];
  for (const item of itemList.slice(0, 10)) {
    const title = stripHtml(String(item.title || ''));
    const link = typeof item.link === 'string'
      ? item.link
      : item.link?.['@_href'] || String(item.guid || '');
    const rawDesc = stripHtml(String(item.description || item.summary || ''));
    const pubDate = String(item.pubDate || item.published || item.updated || '');

    if (!title || !link) continue;

    // Detect severity from title/description keywords
    let severity: string | undefined;
    const text = (title + ' ' + rawDesc).toLowerCase();
    if (text.includes('critical') || text.includes('emergency') || text.includes('actively exploited')) {
      severity = 'critical';
    } else if (text.includes('high') || text.includes('important') || text.includes('vulnerability')) {
      severity = 'high';
    } else if (text.includes('medium') || text.includes('moderate')) {
      severity = 'medium';
    }

    const cleanDesc = rawDesc.slice(0, 200) + (rawDesc.length > 200 ? '...' : '');

    items.push({ title, link, description: cleanDesc, pubDate, source, sourceIcon, severity });
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
