import crypto from 'node:crypto';
import net from 'node:net';

export const TACHOS_RESEARCH_USER_AGENT = 'TachosTechnicalKB/1.0 (+https://tachos.co.uk/kb)';

const CHALLENGE_MARKERS = [
  'captcha',
  'cf-browser-verification',
  'one moment, please',
  'imunify360',
  'turnstile',
  'verify you are human',
  'checking your browser',
  'attention required! | cloudflare',
  'g-recaptcha',
  'hcaptcha',
  'altcha'
];

const WORK_AREA_QUERY_HINTS = Object.freeze({
  'project-delivery': 'data centre project delivery commissioning',
  'rack-stack': 'data centre rack stack power cooling containment',
  cabling: 'data centre structured cabling fibre OM4 OS2',
  'network-implementation': 'data centre network switching routing',
  'documentation-handover': 'data centre handover as-built documentation testing'
});

const NETWORKING_RFC_KEYWORDS = [
  'bgp', 'ospf', 'evpn', 'vxlan', 'ethernet', 'lldp', 'snmp', 'tls', 'ipv6', 'ipv4',
  'tcp', 'udp', 'dns', 'ntp', 'ptp', 'is-is', 'isis', 'mpls', 'bfd', 'lacp', 'vlan',
  'macsec', 'ipsec', 'ssh', 'quic', 'netconf', 'restconf', 'syslog', 'dhcp', 'rdma',
  'roce', 'ecmp', 'multicast', 'anycast', 'peering', 'rfc', 'routing', 'switching',
  'spanning tree', 'stp', 'rstp', 'mlag', 'arp', 'ndp', 'sflow', 'netflow', 'ipfix'
];

const TIER1_DOMAINS = new Set([
  'ietf.org',
  'datatracker.ietf.org',
  'rfc-editor.org',
  'ieee.org',
  'iso.org',
  'bicsi.org',
  'ashrae.org',
  'thefoa.org',
  'tiaonline.org'
]);

const TIER2_DOMAINS = new Set([
  'cisco.com',
  'datacenterdynamics.com',
  'apnic.net',
  'cloudflare.com',
  'juniper.net',
  'arista.com',
  'flukenetworks.com',
  'corning.com',
  'commscope.com',
  'uptimeinstitute.com',
  'ripe.net',
  'nanog.org'
]);

const TIER3_DOMAINS = new Set([
  'en.wikipedia.org',
  'wikipedia.org'
]);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data'
]);

const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.localdomain',
  '.home.arpa'
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'how', 'in',
  'is', 'it', 'of', 'on', 'or', 'should', 'that', 'the', 'to', 'we', 'what', 'when',
  'where', 'which', 'who', 'why', 'with', 'can', 'does', 'need', 'best', 'practice',
  'practices', 'guide', 'explain', 'between', 'difference', 'about', 'apply', 'using'
]);

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // multicast & reserved
  return false;
}

function expandIpv6Groups(rawIp) {
  const clean = rawIp.split('%')[0].toLowerCase();
  if (!net.isIPv6(clean)) return null;

  // Handle embedded IPv4 suffix (e.g. ::ffff:127.0.0.1)
  let working = clean;
  const lastColon = working.lastIndexOf(':');
  if (lastColon !== -1 && working.slice(lastColon + 1).includes('.')) {
    const v4 = working.slice(lastColon + 1);
    if (!net.isIPv4(v4)) return null;
    const octets = v4.split('.').map(Number);
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    working = `${working.slice(0, lastColon)}:${hi}:${lo}`;
  }

  const halves = working.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':').filter(Boolean) : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':').filter(Boolean) : [];
  const missing = 8 - (left.length + right.length);
  if (halves.length === 1 && missing !== 0) return null;
  if (missing < 0) return null;

  const full = [...left, ...Array(missing).fill('0'), ...right];
  if (full.length !== 8) return null;
  const nums = full.map((g) => Number.parseInt(g, 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return nums;
}

function isPrivateIpv6(rawIp) {
  const groups = expandIpv6Groups(rawIp);
  if (!groups) return true;

  // :: (unspecified) and ::1 (loopback)
  const firstSevenZero = groups.slice(0, 7).every((g) => g === 0);
  if (firstSevenZero && (groups[7] === 0 || groups[7] === 1)) return true;

  // ::ffff:0:0/96 IPv4-mapped IPv6
  const isV4Mapped =
    groups[0] === 0 && groups[1] === 0 && groups[2] === 0 &&
    groups[3] === 0 && groups[4] === 0 && groups[5] === 0xffff;
  if (isV4Mapped) {
    const a = (groups[6] >> 8) & 0xff;
    const b = groups[6] & 0xff;
    const c = (groups[7] >> 8) & 0xff;
    const d = groups[7] & 0xff;
    return isPrivateIpv4(`${a}.${b}.${c}.${d}`);
  }

  // fc00::/7 (fc00:: - fdff:: unique local addresses)
  if ((groups[0] & 0xfe00) === 0xfc00) return true;

  // fe80::/10 (fe80:: - febf:: link-local)
  if ((groups[0] & 0xffc0) === 0xfe80) return true;

  // ff00::/8 (multicast)
  if ((groups[0] & 0xff00) === 0xff00) return true;

  return false;
}

/**
 * Strict SSRF guard for external web research URLs.
 * Allows ONLY http: or https: public hostnames/IPs.
 */
export function isSafePublicUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return false;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  let host = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if (!host) return false;

  // Strip IPv6 brackets if present
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }

  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;

  if (net.isIPv4(host)) {
    return !isPrivateIpv4(host);
  }

  if (net.isIPv6(host)) {
    return !isPrivateIpv6(host);
  }

  // Reject single-label hostnames (e.g. http://intranet or http://redis)
  if (!host.includes('.')) return false;

  // Reject numeric-only TLDs or malformed host labels
  const labels = host.split('.');
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9-]+$/.test(label))) {
    return false;
  }
  if (/^\d+$/.test(labels[labels.length - 1])) {
    return false;
  }

  return true;
}

export function getWebResearchCapabilities(env = process.env) {
  const configuredProviders = [];

  if (String(env.TAVILY_API_KEY || '').trim()) configuredProviders.push('tavily');
  if (String(env.BRAVE_SEARCH_API_KEY || '').trim()) configuredProviders.push('brave');
  if (String(env.SERPER_API_KEY || '').trim()) configuredProviders.push('serper');
  if (String(env.PERPLEXITY_API_KEY || '').trim()) configuredProviders.push('perplexity');
  if (String(env.XAI_API_KEY || '').trim() && String(env.TACHOS_XAI_LIVE_SEARCH ?? '1').trim() !== '0') {
    configuredProviders.push('xai_live_search');
  }
  if (String(env.TACHOS_CUSTOM_AI_URL || '').trim()) configuredProviders.push('custom_gateway');

  const distinctAiProviders = [
    String(env.ANTHROPIC_API_KEY || '').trim(),
    String(env.XAI_API_KEY || '').trim(),
    String(env.OPENAI_API_KEY || '').trim(),
    String(env.GEMINI_API_KEY || '').trim(),
    String(env.PERPLEXITY_API_KEY || '').trim(),
    String(env.TACHOS_CUSTOM_AI_URL || '').trim()
  ].filter(Boolean).length;

  const multiAiFlag = String(env.TACHOS_MULTI_AI || '').trim();
  const multiAiEnabled =
    multiAiFlag === '0'
      ? false
      : multiAiFlag === '1' || distinctAiProviders >= 2;

  return {
    configuredProviders,
    openWebFallback: true,
    multiAiEnabled
  };
}

function decodeHtmlEntities(input) {
  if (!input) return '';
  return String(input)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '…')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    });
}

function stripHtmlToText(html) {
  let working = String(html || '');
  // Remove comments and noisy layout/executable blocks
  working = working
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ');

  // Prefer <main> or <article> region if substantive
  const mainMatch = working.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (mainMatch && mainMatch[2]) {
    const candidate = decodeHtmlEntities(mainMatch[2].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    if (candidate.length >= 120) {
      return candidate;
    }
  }

  return decodeHtmlEntities(working.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function hasChallengeMarker(rawText) {
  const lower = String(rawText || '').toLowerCase();
  return CHALLENGE_MARKERS.some((marker) => lower.includes(marker));
}

async function readBoundedText(response, maxBytes) {
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let totalBytes = 0;
    let output = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        const remaining = maxBytes - totalBytes;
        if (remaining <= 0) {
          await reader.cancel().catch(() => {});
          break;
        }
        const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
        totalBytes += slice.byteLength;
        output += decoder.decode(slice, { stream: true });
        if (totalBytes >= maxBytes) {
          await reader.cancel().catch(() => {});
          break;
        }
      }
      output += decoder.decode();
      return output;
    } finally {
      reader.releaseLock?.();
    }
  }
  const text = await response.text();
  return text.slice(0, maxBytes);
}

/**
 * Safely fetch and extract up to 1,200 chars of clean readable text from a public URL.
 * Never bypasses anti-bot/CAPTCHA/challenge pages — returns null immediately on non-2xx or challenge HTML.
 */
export async function fetchReadableSnippet(
  url,
  { fetchImpl = globalThis.fetch, timeoutMs = 4500, maxBytes = 131072 } = {}
) {
  if (typeof fetchImpl !== 'function' || !isSafePublicUrl(url)) {
    return null;
  }

  try {
    let currentUrl = url;
    let res = null;
    const maxRedirects = 3;

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      res = await fetchImpl(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'user-agent': TACHOS_RESEARCH_USER_AGENT,
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1'
        }
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers?.get?.('location');
        if (!location || hop === maxRedirects) return null;
        let nextUrl;
        try {
          nextUrl = new URL(location, currentUrl).toString();
        } catch {
          return null;
        }
        if (!isSafePublicUrl(nextUrl)) return null;
        currentUrl = nextUrl;
        continue;
      }
      break;
    }

    if (!res || !res.ok || res.status < 200 || res.status >= 300) {
      return null;
    }

    const contentType = String(res.headers?.get?.('content-type') || '').toLowerCase();
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('xml')
    ) {
      return null;
    }

    const rawBody = await readBoundedText(res, maxBytes);
    if (!rawBody || hasChallengeMarker(rawBody)) {
      return null;
    }

    const cleaned = contentType.includes('text/plain')
      ? rawBody.replace(/\s+/g, ' ').trim()
      : stripHtmlToText(rawBody);

    if (!cleaned || cleaned.length < 20) {
      return null;
    }

    if (cleaned.length <= 1200) return cleaned;
    return `${cleaned.slice(0, 1199).trimEnd()}…`;
  } catch {
    return null;
  }
}

function extractDomain(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeUrlForDedup(rawUrl) {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const params = new URLSearchParams();
    for (const [k, v] of u.searchParams.entries()) {
      const lk = k.toLowerCase();
      if (lk.startsWith('utm_') || lk === 'fbclid' || lk === 'gclid' || lk === 'ref') continue;
      params.append(k, v);
    }
    params.sort();
    const qs = params.toString();
    const cleanPath = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : u.pathname;
    return `${u.protocol}//${host}${cleanPath}${qs ? `?${qs}` : ''}`;
  } catch {
    return String(rawUrl || '').trim();
  }
}

function truncateText(text, maxLen = 400) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function extractKeywords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9./-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function buildFocusedQuery(question, workArea = '') {
  const clean = String(question || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const lower = clean.toLowerCase();
  const hasDomainTerm = /(data\s*cent|rack|cabl|fibr|fiber|om3|om4|os2|mpo|bgp|evpn|vxlan|ospf|ieee|iso\/iec|tia-942|ashrae|bicsi|pue|pdu|ups|switch|router|handover|otdr|fluke|rfc\s*\d+)/i.test(lower);
  const hint = WORK_AREA_QUERY_HINTS[String(workArea || '').trim().toLowerCase()] || '';

  if (hasDomainTerm) {
    return clean.length <= 180 ? clean : clean.slice(0, 180).trim();
  }

  const suffix = hint || 'data centre infrastructure';
  const combined = `${clean} ${suffix}`;
  return combined.length <= 200 ? combined : combined.slice(0, 200).trim();
}

function detectRfcSearchTerm(question, workArea = '') {
  const lower = String(question || '').toLowerCase();
  const rfcNumMatch = lower.match(/\brfc\s*[-]?\s*(\d{3,5})\b/i);
  if (rfcNumMatch) {
    return { type: 'rfc_number', value: `rfc${rfcNumMatch[1]}` };
  }

  for (const kw of NETWORKING_RFC_KEYWORDS) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(lower)) {
      if (kw === 'rfc') continue;
      return { type: 'title', value: kw };
    }
  }

  if (String(workArea || '').trim().toLowerCase() === 'network-implementation') {
    const tokens = extractKeywords(question);
    if (tokens.length > 0) {
      return { type: 'title', value: tokens[0] };
    }
  }

  return null;
}

function buildWikiQuery(question) {
  const clean = String(question || '').replace(/[?]+/g, ' ').replace(/\s+/g, ' ').trim();
  const keywords = extractKeywords(clean);
  if (keywords.length === 0) return clean;
  return keywords.slice(0, 6).join(' ');
}

function domainAuthorityScore(domain) {
  const d = String(domain || '').toLowerCase();
  for (const t1 of TIER1_DOMAINS) {
    if (d === t1 || d.endsWith(`.${t1}`)) return 30;
  }
  for (const t2 of TIER2_DOMAINS) {
    if (d === t2 || d.endsWith(`.${t2}`)) return 20;
  }
  for (const t3 of TIER3_DOMAINS) {
    if (d === t3 || d.endsWith(`.${t3}`)) return 12;
  }
  return 0;
}

function rankAndTrimSources(sources, question, maxResults) {
  const byKey = new Map();

  for (const raw of sources) {
    if (!raw || !raw.url || !isSafePublicUrl(raw.url)) continue;
    const key = normalizeUrlForDedup(raw.url);
    const domain = raw.domain || extractDomain(raw.url);
    const entry = {
      title: truncateText(raw.title || domain || raw.url, 180),
      url: String(raw.url).trim(),
      snippet: truncateText(raw.snippet || '', 600),
      domain,
      sourceType: raw.sourceType || 'web',
      publishedAt: raw.publishedAt ? String(raw.publishedAt) : null
    };

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, entry);
    } else {
      // Merge richer title/snippet if duplicate came from a secondary provider
      if (entry.snippet.length > existing.snippet.length) {
        existing.snippet = entry.snippet;
      }
      if ((!existing.title || existing.title === existing.domain) && entry.title && entry.title !== entry.domain) {
        existing.title = entry.title;
      }
      if (!existing.publishedAt && entry.publishedAt) {
        existing.publishedAt = entry.publishedAt;
      }
    }
  }

  const queryTokens = extractKeywords(question);

  const scored = [...byKey.values()].map((item) => {
    const haystack = `${item.title} ${item.snippet} ${item.domain}`.toLowerCase();
    let keywordHits = 0;
    for (const token of queryTokens) {
      if (haystack.includes(token)) keywordHits += 1;
    }
    const authority = domainAuthorityScore(item.domain);
    const snippetQuality = item.snippet.length >= 120 ? 5 : item.snippet.length >= 40 ? 2 : 0;
    const providerBonus =
      item.sourceType === 'tavily' || item.sourceType === 'brave' || item.sourceType === 'serper'
        ? 6
        : item.sourceType === 'perplexity' || item.sourceType === 'xai_live_search'
          ? 5
          : item.sourceType === 'ietf_rfc'
            ? 4
            : 0;
    const score = authority + keywordHits * 6 + snippetQuality + providerBonus;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.item);
}

async function queryTavily({ query, maxResults, apiKey, fetchImpl, timeoutMs }) {
  const res = await fetchImpl('https://api.tavily.com/search', {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'content-type': 'application/json',
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: maxResults
    })
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  const payload = await res.json();
  const sources = (Array.isArray(payload?.results) ? payload.results : [])
    .filter((r) => r?.url && isSafePublicUrl(r.url))
    .map((r) => ({
      title: r.title || extractDomain(r.url),
      url: r.url,
      snippet: r.content || r.snippet || '',
      domain: extractDomain(r.url),
      sourceType: 'tavily',
      publishedAt: r.published_date || null
    }));
  const brief = typeof payload?.answer === 'string' ? payload.answer.trim() : '';
  return { sources, brief };
}

async function queryBrave({ query, maxResults, apiKey, fetchImpl, timeoutMs }) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${encodeURIComponent(String(maxResults))}`;
  const res = await fetchImpl(url, {
    method: 'GET',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'application/json',
      'x-subscription-token': apiKey,
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    }
  });
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const payload = await res.json();
  const results = Array.isArray(payload?.web?.results) ? payload.web.results : [];
  const sources = results
    .filter((r) => r?.url && isSafePublicUrl(r.url))
    .map((r) => ({
      title: r.title || extractDomain(r.url),
      url: r.url,
      snippet: r.description || (Array.isArray(r.extra_snippets) ? r.extra_snippets[0] : '') || '',
      domain: extractDomain(r.url),
      sourceType: 'brave',
      publishedAt: r.page_age || r.age || null
    }));
  return { sources, brief: '' };
}

async function querySerper({ query, maxResults, apiKey, fetchImpl, timeoutMs }) {
  const res = await fetchImpl('https://google.serper.dev/search', {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    },
    body: JSON.stringify({
      q: query,
      num: maxResults,
      gl: 'uk'
    })
  });
  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  const payload = await res.json();
  const organic = Array.isArray(payload?.organic) ? payload.organic : [];
  const sources = organic
    .filter((r) => r?.link && isSafePublicUrl(r.link))
    .map((r) => ({
      title: r.title || extractDomain(r.link),
      url: r.link,
      snippet: r.snippet || '',
      domain: extractDomain(r.link),
      sourceType: 'serper',
      publishedAt: r.date || null
    }));
  const brief = String(payload?.answerBox?.answer || payload?.answerBox?.snippet || '').trim();
  return { sources, brief };
}

async function queryPerplexity({ question, workArea, apiKey, model, fetchImpl, timeoutMs }) {
  const res = await fetchImpl('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    },
    body: JSON.stringify({
      model: model || 'sonar',
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content:
            'You are a technical research assistant for UK data-centre and network infrastructure engineers. Provide concise, factual technical findings citing authoritative standards and vendor documentation. Do not claim formal compliance or accreditation.'
        },
        {
          role: 'user',
          content: workArea
            ? `Technical research question (work area: ${workArea}): ${question}`
            : `Technical research question: ${question}`
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}`);
  const payload = await res.json();
  const brief = String(payload?.choices?.[0]?.message?.content || '').trim();

  const sources = [];
  if (Array.isArray(payload?.search_results)) {
    for (const item of payload.search_results) {
      if (item?.url && isSafePublicUrl(item.url)) {
        sources.push({
          title: item.title || extractDomain(item.url),
          url: item.url,
          snippet: item.snippet || '',
          domain: extractDomain(item.url),
          sourceType: 'perplexity',
          publishedAt: item.date || null
        });
      }
    }
  }
  if (Array.isArray(payload?.citations)) {
    for (const cite of payload.citations) {
      const url = typeof cite === 'string' ? cite : cite?.url;
      if (url && isSafePublicUrl(url)) {
        sources.push({
          title: (typeof cite === 'object' && cite?.title) || extractDomain(url),
          url,
          snippet: (typeof cite === 'object' && cite?.snippet) || '',
          domain: extractDomain(url),
          sourceType: 'perplexity',
          publishedAt: null
        });
      }
    }
  }
  return { sources, brief };
}

async function queryXaiLiveSearch({ question, workArea, maxResults, apiKey, model, baseUrl, fetchImpl, timeoutMs }) {
  const endpoint = `${String(baseUrl || 'https://api.x.ai/v1').replace(/\/+$/, '')}/chat/completions`;
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    },
    body: JSON.stringify({
      model: model || 'grok-3-mini',
      temperature: 0.1,
      max_tokens: 600,
      search_parameters: {
        mode: 'on',
        return_citations: true,
        max_search_results: maxResults
      },
      messages: [
        {
          role: 'system',
          content:
            'You are a technical research assistant for UK data-centre and network infrastructure engineers. Summarise verified technical references concisely in British English.'
        },
        {
          role: 'user',
          content: workArea
            ? `Research question (work area: ${workArea}): ${question}`
            : `Research question: ${question}`
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`xAI Live Search HTTP ${res.status}`);
  const payload = await res.json();
  const brief = String(payload?.choices?.[0]?.message?.content || '').trim();

  const sources = [];
  if (Array.isArray(payload?.citations)) {
    for (const cite of payload.citations) {
      const url = typeof cite === 'string' ? cite : cite?.url;
      if (url && isSafePublicUrl(url)) {
        sources.push({
          title: (typeof cite === 'object' && cite?.title) || extractDomain(url),
          url,
          snippet: (typeof cite === 'object' && cite?.snippet) || '',
          domain: extractDomain(url),
          sourceType: 'xai_live_search',
          publishedAt: null
        });
      }
    }
  }
  return { sources, brief };
}

async function queryIetfDatatracker({ question, workArea, fetchImpl, timeoutMs }) {
  const term = detectRfcSearchTerm(question, workArea);
  if (!term) return [];

  const apiUrl =
    term.type === 'rfc_number'
      ? `https://datatracker.ietf.org/api/v1/doc/document/?format=json&type=rfc&name=${encodeURIComponent(term.value)}&limit=4`
      : `https://datatracker.ietf.org/api/v1/doc/document/?format=json&type=rfc&title__icontains=${encodeURIComponent(term.value)}&limit=4`;

  const res = await fetchImpl(apiUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'application/json',
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    }
  });
  if (!res.ok) throw new Error(`IETF Datatracker HTTP ${res.status}`);
  const payload = await res.json();
  const objects = Array.isArray(payload?.objects) ? payload.objects : [];

  return objects
    .filter((obj) => obj?.name)
    .map((obj) => {
      const rfcName = String(obj.name).toLowerCase();
      const docUrl = `https://datatracker.ietf.org/doc/html/${encodeURIComponent(rfcName)}`;
      const label = rfcName.toUpperCase().replace(/^RFC(\d+)/, 'RFC $1');
      return {
        title: obj.title ? `${label}: ${obj.title}` : label,
        url: docUrl,
        snippet: truncateText(obj.abstract || obj.title || '', 450),
        domain: 'datatracker.ietf.org',
        sourceType: 'ietf_rfc',
        publishedAt: obj.time || null
      };
    });
}

async function queryWikipedia({ question, fetchImpl, timeoutMs }) {
  const srsearch = buildWikiQuery(question);
  if (!srsearch) return [];

  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(srsearch)}&format=json&srlimit=4`;
  const res = await fetchImpl(apiUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'application/json',
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    }
  });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const payload = await res.json();
  const items = Array.isArray(payload?.query?.search) ? payload.query.search : [];

  return items
    .filter((item) => item?.title)
    .map((item) => {
      const slug = encodeURIComponent(String(item.title).replace(/\s+/g, '_'));
      const url = `https://en.wikipedia.org/wiki/${slug}`;
      const cleanSnippet = decodeHtmlEntities(String(item.snippet || '').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
      return {
        title: String(item.title),
        url,
        snippet: cleanSnippet,
        domain: 'en.wikipedia.org',
        sourceType: 'wikipedia',
        publishedAt: item.timestamp || null
      };
    });
}

async function queryDuckDuckGoInstant({ query, fetchImpl, timeoutMs }) {
  const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetchImpl(apiUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'application/json',
      'user-agent': TACHOS_RESEARCH_USER_AGENT
    }
  });
  if (!res.ok) throw new Error(`DuckDuckGo Instant HTTP ${res.status}`);
  const payload = await res.json();

  const sources = [];
  if (payload?.AbstractURL && isSafePublicUrl(payload.AbstractURL) && payload?.AbstractText) {
    sources.push({
      title: payload.Heading || extractDomain(payload.AbstractURL),
      url: payload.AbstractURL,
      snippet: String(payload.AbstractText).trim(),
      domain: extractDomain(payload.AbstractURL),
      sourceType: 'duckduckgo',
      publishedAt: null
    });
  }

  const pushRelated = (list) => {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      if (Array.isArray(entry?.Topics)) {
        pushRelated(entry.Topics);
        continue;
      }
      if (entry?.FirstURL && isSafePublicUrl(entry.FirstURL) && entry?.Text) {
        const text = String(entry.Text).trim();
        const titlePart = text.includes(' - ') ? text.split(' - ')[0] : truncateText(text, 80);
        sources.push({
          title: titlePart,
          url: entry.FirstURL,
          snippet: text,
          domain: extractDomain(entry.FirstURL),
          sourceType: 'duckduckgo',
          publishedAt: null
        });
      }
      if (sources.length >= 4) break;
    }
  };
  pushRelated(payload?.RelatedTopics);

  return sources.slice(0, 4);
}

/**
 * Live Web Scouring & Authoritative Open-Web Technical Research Engine.
 */
export async function researchWeb({
  question,
  workArea = '',
  maxResults = 5,
  env = process.env,
  fetchImpl = globalThis.fetch,
  store = null
} = {}) {
  const cleanQuestion = String(question || '').trim();
  const limit = Math.max(1, Math.min(12, Number(maxResults) || 5));

  if (!cleanQuestion) {
    return {
      query: '',
      providersUsed: [],
      webSources: [],
      aiWebBrief: '',
      cached: false
    };
  }

  const query = buildFocusedQuery(cleanQuestion, workArea);
  const cacheKey = crypto
    .createHash('sha256')
    .update(`${String(workArea || '').toLowerCase()}::${query.toLowerCase()}::${limit}`)
    .digest('hex')
    .slice(0, 32);

  // Check store cache (15-min TTL)
  if (typeof store?.getCachedWebResearch === 'function') {
    try {
      const cached = await store.getCachedWebResearch(cacheKey);
      if (cached && typeof cached === 'object') {
        return {
          ...cached,
          cached: true
        };
      }
    } catch {
      // Proceed without failing if cache read errors.
    }
  }

  const providersUsed = [];
  const collectedSources = [];
  const briefSegments = [];
  const timeoutMs = Number(env.TACHOS_WEB_RESEARCH_TIMEOUT_MS) || 6500;

  const tavilyKey = String(env.TAVILY_API_KEY || '').trim();
  const braveKey = String(env.BRAVE_SEARCH_API_KEY || '').trim();
  const serperKey = String(env.SERPER_API_KEY || '').trim();
  const perplexityKey = String(env.PERPLEXITY_API_KEY || '').trim();
  const xaiKey = String(env.XAI_API_KEY || '').trim();
  const xaiLiveEnabled = Boolean(xaiKey && String(env.TACHOS_XAI_LIVE_SEARCH ?? '1').trim() !== '0');

  const hasDedicatedSearchKey = Boolean(tavilyKey || braveKey || serperKey || perplexityKey || xaiLiveEnabled);

  // 1. Configured search & live web-AI providers in priority order
  if (tavilyKey) {
    try {
      const r = await queryTavily({ query, maxResults: limit, apiKey: tavilyKey, fetchImpl, timeoutMs });
      if (r.sources.length > 0 || r.brief) {
        providersUsed.push('tavily');
        collectedSources.push(...r.sources);
        if (r.brief) briefSegments.push(r.brief);
      }
    } catch {
      // Continue cleanly with remaining providers.
    }
  }

  if (braveKey && collectedSources.length < limit) {
    try {
      const r = await queryBrave({ query, maxResults: limit, apiKey: braveKey, fetchImpl, timeoutMs });
      if (r.sources.length > 0) {
        providersUsed.push('brave');
        collectedSources.push(...r.sources);
      }
    } catch {
      // Continue cleanly.
    }
  }

  if (serperKey && collectedSources.length < limit) {
    try {
      const r = await querySerper({ query, maxResults: limit, apiKey: serperKey, fetchImpl, timeoutMs });
      if (r.sources.length > 0 || r.brief) {
        providersUsed.push('serper');
        collectedSources.push(...r.sources);
        if (r.brief) briefSegments.push(r.brief);
      }
    } catch {
      // Continue cleanly.
    }
  }

  if (perplexityKey) {
    try {
      const r = await queryPerplexity({
        question: cleanQuestion,
        workArea,
        apiKey: perplexityKey,
        model: String(env.PERPLEXITY_MODEL || 'sonar').trim(),
        fetchImpl,
        timeoutMs: Math.max(timeoutMs, 10_000)
      });
      if (r.sources.length > 0 || r.brief) {
        providersUsed.push('perplexity');
        collectedSources.push(...r.sources);
        if (r.brief) briefSegments.push(r.brief);
      }
    } catch {
      // Continue cleanly.
    }
  }

  if (xaiLiveEnabled && (!perplexityKey || collectedSources.length < limit)) {
    try {
      const r = await queryXaiLiveSearch({
        question: cleanQuestion,
        workArea,
        maxResults: limit,
        apiKey: xaiKey,
        model: String(env.XAI_MODEL || 'grok-3-mini').trim(),
        baseUrl: String(env.XAI_BASE_URL || 'https://api.x.ai/v1').trim(),
        fetchImpl,
        timeoutMs: Math.max(timeoutMs, 10_000)
      });
      if (r.sources.length > 0 || r.brief) {
        providersUsed.push('xai_live_search');
        collectedSources.push(...r.sources);
        if (r.brief) briefSegments.push(r.brief);
      }
    } catch {
      // Continue cleanly.
    }
  }

  // 2. Zero-key Authoritative Technical Open-Web Scourer
  const uniqueSoFar = new Set(collectedSources.filter((s) => s?.url && isSafePublicUrl(s.url)).map((s) => normalizeUrlForDedup(s.url)));
  if (!hasDedicatedSearchKey || uniqueSoFar.size < limit) {
    const openTimeout = Math.min(timeoutMs, 4500);
    const [ietfRes, wikiRes, ddgRes] = await Promise.allSettled([
      queryIetfDatatracker({ question: cleanQuestion, workArea, fetchImpl, timeoutMs: openTimeout }),
      queryWikipedia({ question: cleanQuestion, fetchImpl, timeoutMs: openTimeout }),
      queryDuckDuckGoInstant({ query: buildWikiQuery(cleanQuestion) || query, fetchImpl, timeoutMs: openTimeout })
    ]);

    if (ietfRes.status === 'fulfilled' && ietfRes.value.length > 0) {
      providersUsed.push('ietf_datatracker');
      collectedSources.push(...ietfRes.value);
    }
    if (wikiRes.status === 'fulfilled' && wikiRes.value.length > 0) {
      providersUsed.push('wikipedia');
      collectedSources.push(...wikiRes.value);
    }
    if (ddgRes.status === 'fulfilled' && ddgRes.value.length > 0) {
      providersUsed.push('duckduckgo');
      collectedSources.push(...ddgRes.value);
    }
  }

  // 3. Deduplicate, rank authoritative technical/standards domains higher, and trim
  const webSources = rankAndTrimSources(collectedSources, cleanQuestion, limit);

  // 4. Optional snippet enrichment on top 2 unique safe URLs when snippets are short
  if (String(env.TACHOS_WEB_ENRICH ?? '1').trim() !== '0' && webSources.length > 0) {
    const toEnrich = webSources.filter((src) => !src.snippet || src.snippet.length < 160).slice(0, 2);
    if (toEnrich.length > 0) {
      await Promise.allSettled(
        toEnrich.map(async (src) => {
          const enriched = await fetchReadableSnippet(src.url, { fetchImpl, timeoutMs: 3500 });
          if (enriched && enriched.length > src.snippet.length) {
            src.snippet = truncateText(enriched, 600);
          }
        })
      );
    }
  }

  const aiWebBrief = briefSegments.filter(Boolean).join('\n\n').trim();
  const payload = {
    query,
    providersUsed,
    webSources,
    aiWebBrief,
    cached: false
  };

  // Save to store cache with 15-minute (900s) TTL
  if (typeof store?.setCachedWebResearch === 'function') {
    try {
      await store.setCachedWebResearch(cacheKey, payload, 900);
    } catch {
      // Cache persistence is best-effort.
    }
  }

  return payload;
}
