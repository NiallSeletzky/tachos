const HTML_ENTITIES = Object.freeze({
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”'
});

export function decodeHtmlEntities(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|ndash|mdash|rsquo|lsquo|ldquo|rdquo|#39|#x27);/gi, (m) => {
      return HTML_ENTITIES[m.toLowerCase()] ?? m;
    })
    .replace(/&#(\d+);/g, (_, num) => {
      const code = Number(num);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    });
}

export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|blockquote|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutScripts)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeUrl(href, baseUrl) {
  if (!href) return baseUrl;
  const cleanHref = decodeHtmlEntities(href).replace(/&sid=[a-f0-9]+/gi, '').replace(/\?sid=[a-f0-9]+&?/i, '?').replace(/\?$/, '');
  try {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL(cleanHref, base).toString();
  } catch {
    return cleanHref;
  }
}

function extractQueryParam(href, key) {
  const decoded = decodeHtmlEntities(href || '');
  const re = new RegExp(`[?&]${key}=([0-9]+)`, 'i');
  const match = decoded.match(re);
  return match ? match[1] : null;
}

export function parsePhpbbBoards(html, baseUrl = 'https://tachos.co.uk/forum') {
  if (!html || typeof html !== 'string') return [];
  const boards = [];
  const seen = new Set();

  // Match prosilver board rows (<li class="row">...<a href="./viewforum.php?f=2" class="forumtitle">Name</a>...)
  const rowMatches = html.match(/<li\b[^>]*class="[^"]*\brow\b[^"]*"[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  for (const row of rowMatches) {
    const linkMatch = row.match(/<a\b[^>]*href="([^"]*viewforum\.php[^"]*)"[^>]*class="[^"]*forumtitle[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      || row.match(/<a\b[^>]*class="[^"]*forumtitle[^"]*"[^>]*href="([^"]*viewforum\.php[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const href = linkMatch[1];
    const id = extractQueryParam(href, 'f');
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = stripHtml(linkMatch[2]);
    let description = '';
    const descAfterLink = row.slice(row.indexOf(linkMatch[0]) + linkMatch[0].length);
    const brDesc = descAfterLink.match(/<br\s*\/?>\s*([\s\S]*?)<(?:div|\/dt|strong)/i);
    if (brDesc) {
      description = stripHtml(brDesc[1]);
    }
    const topicsMatch = row.match(/<dd\b[^>]*class="[^"]*topics[^"]*"[^>]*>\s*([0-9,]+)/i);
    const postsMatch = row.match(/<dd\b[^>]*class="[^"]*posts[^"]*"[^>]*>\s*([0-9,]+)/i);

    boards.push({
      id,
      name: name || `Board ${id}`,
      description,
      url: normalizeUrl(href, baseUrl),
      topicCount: topicsMatch ? Number(topicsMatch[1].replace(/,/g, '')) : 0,
      postCount: postsMatch ? Number(postsMatch[1].replace(/,/g, '')) : 0
    });
  }

  // Fallback anchor scan for custom themes without <li class="row">
  if (boards.length === 0) {
    const linkRe = /<a\b[^>]*href="([^"]*viewforum\.php\?[^"]*f=\d+[^"]*)"[^>]*class="[^"]*forumtitle[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      const id = extractQueryParam(m[1], 'f');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      boards.push({
        id,
        name: stripHtml(m[2]) || `Board ${id}`,
        description: '',
        url: normalizeUrl(m[1], baseUrl),
        topicCount: 0,
        postCount: 0
      });
    }
  }

  return boards;
}

export function parsePhpbbTopics(html, boardId = '', baseUrl = 'https://tachos.co.uk/forum') {
  if (!html || typeof html !== 'string') return [];
  const topics = [];
  const seen = new Set();

  const rowMatches = html.match(/<li\b[^>]*class="[^"]*\brow\b[^"]*"[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  for (const row of rowMatches) {
    const linkMatch = row.match(/<a\b[^>]*href="([^"]*viewtopic\.php[^"]*)"[^>]*class="[^"]*topictitle[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      || row.match(/<a\b[^>]*class="[^"]*topictitle[^"]*"[^>]*href="([^"]*viewtopic\.php[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const href = linkMatch[1];
    const id = extractQueryParam(href, 't');
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const resolvedBoardId = String(boardId || extractQueryParam(href, 'f') || '');
    const title = stripHtml(linkMatch[2]);
    const authorMatch = row.match(/class="[^"]*topic-poster[^"]*"[\s\S]*?<(?:a|span)\b[^>]*class="[^"]*username[^"]*"[^>]*>([\s\S]*?)<\/(?:a|span)>/i)
      || row.match(/<(?:a|span)\b[^>]*class="[^"]*username[^"]*"[^>]*>([\s\S]*?)<\/(?:a|span)>/i);
    const repliesMatch = row.match(/<dd\b[^>]*class="[^"]*posts[^"]*"[^>]*>\s*([0-9,]+)/i);
    const viewsMatch = row.match(/<dd\b[^>]*class="[^"]*views[^"]*"[^>]*>\s*([0-9,]+)/i);
    const timeMatches = [...row.matchAll(/<time\b[^>]*datetime="([^"]+)"[^>]*>/gi)];
    const lastPostAt = timeMatches.length > 0 ? timeMatches[timeMatches.length - 1][1] : null;

    topics.push({
      id,
      boardId: resolvedBoardId,
      title: title || `Topic #${id}`,
      author: authorMatch ? stripHtml(authorMatch[1]) : '',
      url: normalizeUrl(href, baseUrl),
      replies: repliesMatch ? Number(repliesMatch[1].replace(/,/g, '')) : 0,
      views: viewsMatch ? Number(viewsMatch[1].replace(/,/g, '')) : 0,
      lastPostAt,
      excerpt: ''
    });
  }

  return topics;
}

export function parsePhpbbTopicPosts(html, topicId, boardId = '', baseUrl = 'https://tachos.co.uk/forum') {
  if (!html || typeof html !== 'string') {
    return { topic: null, posts: [] };
  }

  const titleMatch = html.match(/<h2\b[^>]*class="[^"]*topic-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)
    || html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
    || html.match(/<title>([\s\S]*?)<\/title>/i);
  const topicTitle = titleMatch ? stripHtml(titleMatch[1]).replace(/\s*-\s*TACHOS.*$/i, '').trim() : `Topic #${topicId}`;

  let resolvedBoardId = String(boardId || '');
  if (!resolvedBoardId) {
    const crumbMatches = [...html.matchAll(/href="[^"]*viewforum\.php\?[^"]*f=(\d+)[^"]*"/gi)];
    if (crumbMatches.length > 0) {
      resolvedBoardId = crumbMatches[crumbMatches.length - 1][1];
    }
  }

  const posts = [];
  // Split around post containers id="p123"
  const postStartRe = /<div\b[^>]*id="p(\d+)"[^>]*class="[^"]*\bpost\b[^"]*"[^>]*>|<div\b[^>]*class="[^"]*\bpost\b[^"]*"[^>]*id="p(\d+)"[^>]*>/gi;
  const starts = [];
  let match;
  while ((match = postStartRe.exec(html)) !== null) {
    starts.push({ id: match[1] || match[2], index: match.index });
  }

  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const endIdx = i + 1 < starts.length ? starts[i + 1].index : html.length;
    const chunk = html.slice(start.index, endIdx);

    const authorMatch = chunk.match(/<(?:a|span)\b[^>]*class="[^"]*username(?:-coloured)?[^"]*"[^>]*>([\s\S]*?)<\/(?:a|span)>/i);
    const timeMatch = chunk.match(/<time\b[^>]*datetime="([^"]+)"[^>]*>/i);
    const contentMatch = chunk.match(/<div\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const body = contentMatch ? stripHtml(contentMatch[1]) : '';
    const author = authorMatch ? stripHtml(authorMatch[1]) : 'Community Member';
    const isAiAssistant = /tachos\s*ai\s*technical\s*assistant/i.test(author) || /\[TACHOS AI Technical Assistant/i.test(body);

    posts.push({
      id: String(start.id),
      topicId: String(topicId),
      boardId: resolvedBoardId,
      author,
      postedAt: timeMatch ? timeMatch[1] : null,
      body,
      url: normalizeUrl(`./viewtopic.php?t=${encodeURIComponent(topicId)}#p${encodeURIComponent(start.id)}`, baseUrl),
      isAiAssistant
    });
  }

  const topic = {
    id: String(topicId),
    boardId: resolvedBoardId,
    title: topicTitle,
    author: posts[0]?.author || '',
    url: normalizeUrl(`./viewtopic.php?t=${encodeURIComponent(topicId)}`, baseUrl),
    replies: Math.max(0, posts.length - 1),
    views: 0,
    lastPostAt: posts.length > 0 ? posts[posts.length - 1].postedAt : null,
    excerpt: posts[0]?.body ? posts[0].body.slice(0, 240) : ''
  };

  return { topic, posts };
}

export function parsePhpbbFormFields(html) {
  const fields = {};
  if (!html || typeof html !== 'string') return fields;
  const inputRe = /<input\b[^>]*type="hidden"[^>]*>/gi;
  let m;
  while ((m = inputRe.exec(html)) !== null) {
    const tag = m[0];
    const nameMatch = tag.match(/\bname="([^"]+)"/i);
    const valueMatch = tag.match(/\bvalue="([^"]*)"/i);
    if (nameMatch) {
      fields[nameMatch[1]] = decodeHtmlEntities(valueMatch ? valueMatch[1] : '');
    }
  }
  return fields;
}

function updateCookieJar(cookieJar, headers) {
  if (!headers) return;
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie')] : []);
  for (const raw of setCookies) {
    if (!raw) continue;
    const firstPart = raw.split(';')[0];
    const eqIdx = firstPart.indexOf('=');
    if (eqIdx > 0) {
      const key = firstPart.slice(0, eqIdx).trim();
      const val = firstPart.slice(eqIdx + 1).trim();
      cookieJar.set(key, val);
    }
  }
}

function serializeCookieJar(cookieJar) {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

export function createPhpbbClient({
  forumBaseUrl = process.env.TACHOS_FORUM_URL || 'https://tachos.co.uk/forum',
  botUsername = process.env.TACHOS_PHPBB_BOT_USER || '',
  botPassword = process.env.TACHOS_PHPBB_BOT_PASS || '',
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  formDelayMs = 1500
} = {}) {
  const baseUrl = String(forumBaseUrl).replace(/\/+$/, '');
  const userAgent = 'TACHOS-Technical-KB/1.0 (+https://tachos.co.uk/kb)';

  async function requestText(url, options = {}) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('Fetch implementation unavailable');
    }
    const res = await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': userAgent,
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`phpBB HTTP ${res.status}`);
    }
    return { res, text };
  }

  return {
    baseUrl,
    hasWriteCredentials() {
      return Boolean(botUsername && botPassword);
    },

    async fetchBoards() {
      const { text } = await requestText(`${baseUrl}/index.php`);
      return parsePhpbbBoards(text, baseUrl);
    },

    async fetchTopics(boardId, { limit = 20 } = {}) {
      const url = boardId
        ? `${baseUrl}/viewforum.php?f=${encodeURIComponent(boardId)}`
        : `${baseUrl}/search.php?search_id=active_topics`;
      const { text } = await requestText(url);
      return parsePhpbbTopics(text, boardId, baseUrl).slice(0, limit);
    },

    async fetchTopic(topicId, { boardId = '' } = {}) {
      const url = `${baseUrl}/viewtopic.php?t=${encodeURIComponent(topicId)}`;
      const { text } = await requestText(url);
      return parsePhpbbTopicPosts(text, topicId, boardId, baseUrl);
    },

    async replyToTopic({ topicId, boardId, message }) {
      if (!botUsername || !botPassword) {
        const err = new Error('Forum bot credentials are not configured.');
        err.statusCode = 503;
        err.code = 'forum_posting_unavailable';
        throw err;
      }

      const cookieJar = new Map();

      // 1. Load login page to obtain session cookies and CSRF hidden fields
      const loginGet = await requestText(`${baseUrl}/ucp.php?mode=login`);
      updateCookieJar(cookieJar, loginGet.res.headers);
      const loginHidden = parsePhpbbFormFields(loginGet.text);

      const loginParams = new URLSearchParams({
        ...loginHidden,
        username: botUsername,
        password: botPassword,
        login: 'Login'
      });

      const loginPost = await fetchImpl(`${baseUrl}/ucp.php?mode=login`, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'user-agent': userAgent,
          'content-type': 'application/x-www-form-urlencoded',
          cookie: serializeCookieJar(cookieJar)
        },
        body: loginParams.toString()
      });
      updateCookieJar(cookieJar, loginPost.headers);

      // 2. Load reply form for topic
      const replyUrl = `${baseUrl}/posting.php?mode=reply&f=${encodeURIComponent(boardId)}&t=${encodeURIComponent(topicId)}`;
      const replyGet = await requestText(replyUrl, {
        headers: { cookie: serializeCookieJar(cookieJar) }
      });
      updateCookieJar(cookieJar, replyGet.res.headers);
      const replyHidden = parsePhpbbFormFields(replyGet.text);
      if (!replyHidden.form_token || !replyHidden.creation_time) {
        const err = new Error('Unable to obtain phpBB posting form token (check bot login/permissions).');
        err.statusCode = 502;
        err.code = 'forum_post_failed';
        throw err;
      }

      if (formDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, formDelayMs));
      }

      const postParams = new URLSearchParams({
        ...replyHidden,
        message: String(message),
        post: 'Submit'
      });

      const replyPost = await fetchImpl(replyUrl, {
        method: 'POST',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'user-agent': userAgent,
          'content-type': 'application/x-www-form-urlencoded',
          cookie: serializeCookieJar(cookieJar)
        },
        body: postParams.toString()
      });
      if (!replyPost.ok) {
        const err = new Error(`phpBB reply failed with HTTP ${replyPost.status}`);
        err.statusCode = 502;
        err.code = 'forum_post_failed';
        throw err;
      }

      const now = new Date().toISOString();
      return {
        id: `live_${Date.now()}`,
        topicId: String(topicId),
        boardId: String(boardId),
        author: 'TACHOS AI Technical Assistant',
        postedAt: now,
        body: String(message),
        url: `${baseUrl}/viewtopic.php?t=${encodeURIComponent(topicId)}`,
        isAiAssistant: true
      };
    }
  };
}

export function createForumBridge({
  store,
  forumBaseUrl = process.env.TACHOS_FORUM_URL || 'https://tachos.co.uk/forum',
  aiBoardId = process.env.TACHOS_AI_BOARD_ID || '',
  botUsername = process.env.TACHOS_PHPBB_BOT_USER || '',
  botPassword = process.env.TACHOS_PHPBB_BOT_PASS || '',
  cacheTtlMs = 60_000,
  liveEnabled,
  forumClientFactory,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedAiBoardId = aiBoardId !== undefined && aiBoardId !== null ? String(aiBoardId).trim() : '';
  const allowLive = typeof liveEnabled === 'boolean'
    ? liveEnabled
    : (Boolean(forumClientFactory) || Boolean(store && store.dbPath !== ':memory:'));

  const cache = new Map();
  let clientInstance = null;

  function getClient() {
    if (!clientInstance) {
      clientInstance = typeof forumClientFactory === 'function'
        ? forumClientFactory({ forumBaseUrl, aiBoardId: normalizedAiBoardId, botUsername, botPassword, fetchImpl })
        : createPhpbbClient({ forumBaseUrl, botUsername, botPassword, fetchImpl });
    }
    return clientInstance;
  }

  function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  function setCached(key, value) {
    cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
  }

  return {
    aiBoardId: normalizedAiBoardId || null,
    allowLive,

    clearCache() {
      cache.clear();
    },

    async listBoards() {
      const cacheKey = 'boards';
      const cached = getCached(cacheKey);
      if (cached) {
        return { boards: cached, source: 'cache', aiBoardId: normalizedAiBoardId || null };
      }

      if (allowLive) {
        try {
          const liveBoards = await getClient().fetchBoards();
          const enriched = liveBoards.map((b) => ({
            ...b,
            isAiBoard: normalizedAiBoardId ? String(b.id) === normalizedAiBoardId : false
          }));
          if (store && enriched.length > 0) {
            store.upsertForumBoards(enriched, normalizedAiBoardId);
          }
          setCached(cacheKey, enriched);
          return { boards: enriched, source: 'live', aiBoardId: normalizedAiBoardId || null };
        } catch {
          // Fall back cleanly to SQLite cache.
        }
      }

      const fallbackBoards = store ? store.listForumBoards() : [];
      return {
        boards: fallbackBoards,
        source: allowLive ? 'sqlite_fallback' : 'sqlite',
        aiBoardId: normalizedAiBoardId || null
      };
    },

    async listTopics({ boardId = '', limit = 20 } = {}) {
      const normalizedBoardId = boardId ? String(boardId).trim() : '';
      const parsedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
      const cacheKey = `topics:${normalizedBoardId || 'all'}:${parsedLimit}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return { topics: cached, source: 'cache', boardId: normalizedBoardId || null };
      }

      if (allowLive) {
        try {
          const client = getClient();
          let liveTopics = [];
          if (normalizedBoardId) {
            liveTopics = await client.fetchTopics(normalizedBoardId, { limit: parsedLimit });
          } else {
            const boardsRes = await this.listBoards();
            const targetBoards = (boardsRes.boards || []).slice(0, 5);
            if (targetBoards.length > 0) {
              for (const b of targetBoards) {
                const boardTopics = await client.fetchTopics(b.id, { limit: parsedLimit });
                liveTopics.push(...boardTopics);
              }
            } else {
              liveTopics = await client.fetchTopics('', { limit: parsedLimit });
            }
          }
          const deduped = [];
          const seen = new Set();
          for (const topic of liveTopics) {
            if (!topic?.id || seen.has(String(topic.id))) continue;
            seen.add(String(topic.id));
            deduped.push(topic);
          }
          const sliced = deduped.slice(0, parsedLimit);
          if (store && sliced.length > 0) {
            store.upsertForumTopics(sliced);
          }
          setCached(cacheKey, sliced);
          return { topics: sliced, source: 'live', boardId: normalizedBoardId || null };
        } catch {
          // Fall back cleanly to SQLite cache.
        }
      }

      const fallbackTopics = store ? store.listForumTopics({ boardId: normalizedBoardId || undefined, limit: parsedLimit }) : [];
      return {
        topics: fallbackTopics,
        source: allowLive ? 'sqlite_fallback' : 'sqlite',
        boardId: normalizedBoardId || null
      };
    },

    async getTopic(topicId) {
      const normalizedId = String(topicId || '').trim();
      if (!normalizedId) return { topic: null, posts: [], source: 'sqlite' };

      const cacheKey = `topic:${normalizedId}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return { ...cached, source: 'cache' };
      }

      if (allowLive) {
        try {
          const existing = store ? store.getForumTopic(normalizedId) : null;
          const result = await getClient().fetchTopic(normalizedId, { boardId: existing?.boardId || '' });
          if (result && (result.topic || (result.posts && result.posts.length > 0))) {
            if (store) {
              if (result.topic) store.upsertForumTopics([result.topic]);
              if (Array.isArray(result.posts) && result.posts.length > 0) {
                store.upsertForumPosts(result.posts);
              }
            }
            const payload = { topic: result.topic, posts: result.posts || [] };
            setCached(cacheKey, payload);
            return { ...payload, source: 'live' };
          }
        } catch {
          // Fall back to SQLite.
        }
      }

      const topic = store ? store.getForumTopic(normalizedId) : null;
      const posts = store ? store.listForumPosts(normalizedId) : [];
      return {
        topic,
        posts,
        source: allowLive ? 'sqlite_fallback' : 'sqlite'
      };
    },

    async replyToTopic({ topicId, boardId = '', message = '' } = {}) {
      const normalizedTopicId = String(topicId || '').trim();
      if (!normalizedTopicId) {
        const err = new Error('topicId is required.');
        err.statusCode = 400;
        err.code = 'invalid_request';
        throw err;
      }

      // Resolve boardId from caller or persisted/live topic record before enforcing guard.
      let resolvedBoardId = boardId ? String(boardId).trim() : '';
      if (!resolvedBoardId && store) {
        const storedTopic = store.getForumTopic(normalizedTopicId);
        if (storedTopic?.boardId) {
          resolvedBoardId = String(storedTopic.boardId);
        }
      }
      if (!resolvedBoardId && allowLive) {
        try {
          const liveTopicRes = await this.getTopic(normalizedTopicId);
          if (liveTopicRes?.topic?.boardId) {
            resolvedBoardId = String(liveTopicRes.topic.boardId);
          }
        } catch {
          // Keep empty so guard rejects safely.
        }
      }

      // Strict relay guard: only allow posting when TACHOS_AI_BOARD_ID is configured AND matches boardId.
      if (!normalizedAiBoardId || !resolvedBoardId || resolvedBoardId !== normalizedAiBoardId) {
        const err = new Error('Posting is restricted to the designated TACHOS AI technical board.');
        err.statusCode = 403;
        err.code = 'read_only_board';
        throw err;
      }

      const cleanMessage = String(message || '').trim();
      if (cleanMessage.length < 5 || cleanMessage.length > 4000) {
        const err = new Error('Reply message must be between 5 and 4000 characters.');
        err.statusCode = 400;
        err.code = 'invalid_message';
        throw err;
      }

      if (!allowLive) {
        const err = new Error('Live forum posting is disabled in offline mode.');
        err.statusCode = 503;
        err.code = 'forum_posting_unavailable';
        throw err;
      }

      const post = await getClient().replyToTopic({
        topicId: normalizedTopicId,
        boardId: resolvedBoardId,
        message: cleanMessage
      });

      if (store && post) {
        store.upsertForumPosts([post]);
      }
      cache.delete(`topic:${normalizedTopicId}`);
      for (const key of cache.keys()) {
        if (key.startsWith('topics:')) cache.delete(key);
      }

      return {
        ok: true,
        topicId: normalizedTopicId,
        boardId: resolvedBoardId,
        post
      };
    }
  };
}
