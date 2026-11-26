import { decodeHtmlEntities, stripHtml } from '../phpbb-bridge.mjs';

export const DEFAULT_RSS_FEEDS = Object.freeze([
  {
    id: 'dcd',
    name: 'Data Center Dynamics',
    url: 'https://www.datacenterdynamics.com/en/rss/'
  },
  {
    id: 'apnic',
    name: 'APNIC Blog',
    url: 'https://blog.apnic.net/feed/'
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Blog',
    url: 'https://blog.cloudflare.com/rss/'
  }
]);

const HN_SEARCH_URL =
  'https://hn.algolia.com/api/v1/search_by_date?query=data%20center%20OR%20fiber%20OR%20optical%20OR%20bgp%20OR%20ethernet&tags=story&hitsPerPage=12';

const WORK_AREA_KEYWORDS = Object.freeze([
  {
    workArea: 'cabling',
    keywords: [
      'fibre', 'fiber', 'om4', 'om5', 'os2', 'mpo', 'mtp', 'cabling', 'patch', 'otdr', 'olts',
      '11801', '14763', 'transceiver', 'optical', 'qsfp', 'osfp', 'connector', 'splice', 'cat6a'
    ]
  },
  {
    workArea: 'rack-stack',
    keywords: [
      'rack', 'cabinet', 'pdu', 'busway', 'cooling', 'liquid cooling', 'direct-to-chip', 'airflow',
      'containment', 'floor load', 'gpu cluster', 'ai rack', 'power density', 'ups', 'thermal'
    ]
  },
  {
    workArea: 'network',
    keywords: [
      'bgp', 'ethernet', '802.3', '400g', '800g', '1.6t', 'switch', 'router', 'spine', 'leaf',
      'evpn', 'vxlan', 'routing', 'peering', 'ixp', 'ipv6', 'dns', 'network', 'rollback', 'outage'
    ]
  },
  {
    workArea: 'documentation',
    keywords: [
      'as-built', 'handover', 'closeout', 'dcim', 'commissioning', 'snag', 'documentation', 'audit',
      'register', 'change record'
    ]
  },
  {
    workArea: 'project-delivery',
    keywords: [
      'data centre', 'data center', 'colocation', '22237', 'bicsi', 'readiness', 'construction',
      'programme', 'capacity', 'uk', 'slough', 'london', 'facility', 'power grid'
    ]
  }
]);

function unwrapCdata(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function extractTag(block, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(re);
  return match ? unwrapCdata(match[1]) : '';
}

function extractAtomLink(block) {
  const alt = block.match(/<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?>/i)
    || block.match(/<link\b[^>]*href="([^"]+)"[^>]*rel="alternate"[^>]*\/?>/i)
    || block.match(/<link\b[^>]*href="([^"]+)"[^>]*\/?>/i);
  if (alt) return decodeHtmlEntities(alt[1]);
  return stripHtml(extractTag(block, 'link'));
}

export function parseFeedXml(xml, sourceName = 'Feed') {
  if (!xml || typeof xml !== 'string') return [];
  const items = [];

  const rssBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const block of rssBlocks) {
    const title = stripHtml(extractTag(block, 'title'));
    const link = stripHtml(extractTag(block, 'link'));
    const rawDesc = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    const summary = stripHtml(rawDesc).slice(0, 400);
    const pubDate = stripHtml(extractTag(block, 'pubDate') || extractTag(block, 'dc:date'));
    if (!title || !link) continue;
    items.push({
      source: sourceName,
      title,
      url: link,
      summary,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null
    });
  }

  if (items.length > 0) return items;

  const atomBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of atomBlocks) {
    const title = stripHtml(extractTag(block, 'title'));
    const link = extractAtomLink(block);
    const rawDesc = extractTag(block, 'summary') || extractTag(block, 'content');
    const summary = stripHtml(rawDesc).slice(0, 400);
    const updated = stripHtml(extractTag(block, 'updated') || extractTag(block, 'published'));
    if (!title || !link) continue;
    let publishedAt = null;
    if (updated) {
      const parsed = new Date(updated);
      if (!Number.isNaN(parsed.getTime())) publishedAt = parsed.toISOString();
    }
    items.push({
      source: sourceName,
      title,
      url: link,
      summary,
      publishedAt
    });
  }

  return items;
}

export function classifyWorkArea(text) {
  const hay = String(text || '').toLowerCase();
  let bestArea = 'project-delivery';
  let bestScore = 0;

  for (const group of WORK_AREA_KEYWORDS) {
    let score = 0;
    for (const kw of group.keywords) {
      if (hay.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestArea = group.workArea;
    }
  }
  return { workArea: bestArea, relevanceScore: bestScore };
}

export function scoreFeedItem(item) {
  const combined = `${item.title || ''} ${item.summary || ''}`;
  const { workArea, relevanceScore } = classifyWorkArea(combined);
  return {
    ...item,
    workArea,
    relevanceScore
  };
}

async function fetchTextWithTimeout(url, { fetchImpl, timeoutMs, headers = {} }) {
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'user-agent': 'TACHOS-Technical-KB-Curator/1.0 (+https://tachos.co.uk/kb)',
      accept: 'application/rss+xml, application/atom+xml, application/xml, application/json, text/xml;q=0.9',
      ...headers
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

export async function fetchIndustryFeeds({
  feeds = DEFAULT_RSS_FEEDS,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  includeHackerNews = true,
  includeX = Boolean(process.env.X_BEARER_TOKEN),
  xBearerToken = process.env.X_BEARER_TOKEN || '',
  maxItems = 25
} = {}) {
  const items = [];
  const warnings = [];

  if (typeof fetchImpl !== 'function') {
    return { items: [], warnings: ['Fetch implementation unavailable'] };
  }

  // 1. RSS / Atom feeds
  for (const feed of feeds) {
    try {
      const xml = await fetchTextWithTimeout(feed.url, { fetchImpl, timeoutMs });
      const parsed = parseFeedXml(xml, feed.name);
      items.push(...parsed.slice(0, 8));
    } catch (err) {
      warnings.push(`${feed.name}: ${err.message}`);
    }
  }

  // 2. Hacker News networking / data-centre stories
  if (includeHackerNews) {
    try {
      const raw = await fetchTextWithTimeout(HN_SEARCH_URL, { fetchImpl, timeoutMs });
      const data = JSON.parse(raw);
      const hits = Array.isArray(data?.hits) ? data.hits : [];
      for (const hit of hits) {
        if (!hit?.title) continue;
        const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        items.push({
          source: 'Hacker News',
          title: String(hit.title).trim(),
          url,
          summary: String(hit.story_text || hit.title).replace(/<[^>]+>/g, ' ').trim().slice(0, 360),
          publishedAt: hit.created_at || null
        });
      }
    } catch (err) {
      warnings.push(`Hacker News: ${err.message}`);
    }
  }

  // 3. Optional X API v2 recent search (never log bearer token)
  if (includeX && xBearerToken) {
    try {
      const query = encodeURIComponent('("data center" OR "data centre" OR "OM4" OR "OS2" OR "liquid cooling" OR "400G" OR "800G") -is:retweet lang:en');
      const xUrl = `https://api.x.com/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=created_at,text`;
      const raw = await fetchTextWithTimeout(xUrl, {
        fetchImpl,
        timeoutMs,
        headers: { authorization: `Bearer ${xBearerToken}` }
      });
      const data = JSON.parse(raw);
      const tweets = Array.isArray(data?.data) ? data.data : [];
      for (const tweet of tweets) {
        if (!tweet?.id || !tweet?.text) continue;
        const clean = String(tweet.text).replace(/\s+/g, ' ').trim();
        items.push({
          source: 'X Industry Signal',
          title: clean.slice(0, 110),
          url: `https://x.com/i/web/status/${tweet.id}`,
          summary: clean.slice(0, 360),
          publishedAt: tweet.created_at || null
        });
      }
    } catch (err) {
      warnings.push(`X API v2: ${err.message}`);
    }
  }

  // Deduplicate by URL and rank by engineering relevance
  const seen = new Set();
  const ranked = [];
  for (const rawItem of items) {
    if (!rawItem.url || seen.has(rawItem.url)) continue;
    seen.add(rawItem.url);
    const scored = scoreFeedItem(rawItem);
    if (scored.relevanceScore > 0) {
      ranked.push(scored);
    }
  }

  ranked.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''));
  });

  return {
    items: ranked.slice(0, maxItems),
    warnings
  };
}
