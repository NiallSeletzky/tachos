import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStore, WORK_AREAS, WORKING_BASIS_NOTICE } from './store.mjs';
import { answerQuestion, getProviderInfo } from './llm.mjs';
import { createForumBridge } from './phpbb-bridge.mjs';
import { createMcpHandler, MCP_RESOURCES, MCP_SERVER_INFO, MCP_TOOLS } from './mcp.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_BODY_BYTES = 64 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STATIC_MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
});

function normalizeBasePath(raw) {
  if (raw === '' || raw === '/') return '';
  const cleaned = `/${String(raw || '/kb').replace(/^\/+|\/+$/g, '')}`;
  return cleaned === '/' ? '' : cleaned;
}

function stripBasePath(pathname, basePath) {
  if (!basePath) return pathname || '/';
  if (pathname === basePath || pathname === `${basePath}/`) return '/';
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }
  return pathname || '/';
}

function createRateLimiter({ windowMs = 3_600_000, max = 20 } = {}) {
  const buckets = new Map();

  function check(key) {
    const now = Date.now();
    if (buckets.size > 5000) {
      for (const [k, entry] of buckets.entries()) {
        if (now >= entry.resetAt) buckets.delete(k);
      }
    }
    let entry = buckets.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    entry.count += 1;
    return { allowed: true, remaining: Math.max(0, max - entry.count), retryAfterSeconds: 0 };
  }

  return { check };
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function timingSafeTokenEquals(provided, expected) {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        const err = new Error('Request payload too large.');
        err.statusCode = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error('Malformed JSON request body.');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', () => {
      if (settled) return;
      settled = true;
      const err = new Error('Failed to read request body.');
      err.statusCode = 400;
      reject(err);
    });
  });
}

export function buildLlmsTxt({
  publicOrigin = 'https://tachos.co.uk',
  basePath = '/kb',
  articles = []
} = {}) {
  const origin = String(publicOrigin).replace(/\/+$/, '');
  const prefix = `${origin}${normalizeBasePath(basePath)}`;
  const verified = articles.filter((a) => a.status === 'engineer_verified');
  const drafted = articles.filter((a) => a.status === 'ai_drafted');

  const lines = [
    '# TACHOS LTD — Technical Knowledge Base & Community',
    '',
    '> UK B2B data-centre and network infrastructure engineering reference grounded in the TACHOS Five Works methodology.',
    '> Company: TACHOS LTD (Company no. 17459934) · Contact: info@tachos.co.uk · Web: https://tachos.co.uk/',
    '',
    '## Working Basis & Honesty Notice',
    WORKING_BASIS_NOTICE,
    '',
    '## Five Works Reference Pages',
    ...WORK_AREAS.map((a) => `- ${a.label}: ${a.sourceUrl} — ${a.lead}`),
    '',
    '## HTTP API Endpoints',
    `- Service status: GET ${prefix}/api/v1/status`,
    `- List/search KB guides: GET ${prefix}/api/v1/articles?workArea=&status=&q=&limit=`,
    `- Read single KB guide: GET ${prefix}/api/v1/articles/:slug`,
    `- Ask citation-backed assistant: POST ${prefix}/api/v1/ask`,
    `- Browse technical forum boards: GET ${prefix}/api/v1/forum/boards`,
    `- Browse technical forum topics: GET ${prefix}/api/v1/forum/topics?boardId=&limit=`,
    `- Read forum topic posts: GET ${prefix}/api/v1/forum/topics/:topicId`,
    `- Submit site survey / project inquiry: POST ${prefix}/api/v1/inquiries`,
    '',
    `## Remote MCP Server (Streamable HTTP — ${MCP_SERVER_INFO.name} v${MCP_SERVER_INFO.version})`,
    `- Endpoint: ${prefix}/mcp (supports POST, GET, DELETE)`,
    '- Read-only Tools:',
    ...MCP_TOOLS.map((t) => `  - ${t.name}: ${t.description}`),
    '- Resources:',
    ...MCP_RESOURCES.map((r) => `  - ${r.uri}: ${r.description}`),
    '',
    `## Engineer-Verified Guides (${verified.length})`,
    ...verified.map((a) => `- [${a.slug}] ${a.title} (${a.workAreaLabel}) — ${prefix}/api/v1/articles/${a.slug}`),
    '',
    `## AI-Drafted Technical Checklists — Pending Engineer Verification (${drafted.length})`,
    ...drafted.map((a) => `- [${a.slug}] ${a.title} (${a.workAreaLabel}) — ${prefix}/api/v1/articles/${a.slug}`),
    ''
  ];

  return lines.join('\n');
}

export function createTachosKbServer(options = {}) {
  const env = options.env ?? process.env;
  const basePath = normalizeBasePath(options.basePath ?? env.TACHOS_BASE_PATH ?? '/kb');
  const publicOrigin = options.publicOrigin ?? env.TACHOS_PUBLIC_ORIGIN ?? 'https://tachos.co.uk';
  const corsOrigin = options.corsOrigin ?? env.TACHOS_CORS_ORIGIN ?? '*';
  const adminToken = options.adminToken ?? env.TACHOS_ADMIN_TOKEN ?? '';
  const inquiryWebhookUrl = options.inquiryWebhookUrl ?? env.TACHOS_INQUIRY_WEBHOOK_URL ?? '';
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const publicDir = options.publicDir ?? path.join(__dirname, 'public');

  const ownsStore = !options.store;
  const store = options.store ?? createStore({ dbPath: options.dbPath ?? env.TACHOS_DB_PATH });

  const forumBridge = options.forumBridge ?? createForumBridge({
    store,
    forumBaseUrl: options.forumBaseUrl ?? env.TACHOS_FORUM_URL ?? 'https://tachos.co.uk/forum',
    aiBoardId: options.aiBoardId ?? env.TACHOS_AI_BOARD_ID ?? '',
    botUsername: options.botUsername ?? env.TACHOS_PHPBB_BOT_USER ?? '',
    botPassword: options.botPassword ?? env.TACHOS_PHPBB_BOT_PASS ?? '',
    cacheTtlMs: options.forumCacheTtlMs ?? 60_000,
    liveEnabled: options.liveEnabled,
    forumClientFactory: options.forumClientFactory,
    fetchImpl
  });

  const rateWindowMs = options.rateLimitWindowMs ?? 3_600_000;
  const askLimiter = createRateLimiter({
    windowMs: rateWindowMs,
    max: options.askRateLimitMax ?? (Number(env.TACHOS_ASK_RATE_LIMIT) || 20)
  });
  const inquiryLimiter = createRateLimiter({
    windowMs: rateWindowMs,
    max: options.inquiryRateLimitMax ?? (Number(env.TACHOS_INQUIRY_RATE_LIMIT) || 8)
  });
  const replyLimiter = createRateLimiter({
    windowMs: rateWindowMs,
    max: options.replyRateLimitMax ?? (Number(env.TACHOS_REPLY_RATE_LIMIT) || 10)
  });

  const baseHeaders = {
    'access-control-allow-origin': corsOrigin,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
    'access-control-expose-headers': 'Mcp-Session-Id',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'SAMEORIGIN'
  };

  function sendJson(res, statusCode, payload, extraHeaders = {}) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
      ...baseHeaders,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    });
    res.end(body);
  }

  function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
    res.writeHead(statusCode, {
      ...baseHeaders,
      'content-type': contentType,
      ...extraHeaders
    });
    res.end(text);
  }

  function requireAdminAuth(req, res) {
    if (!adminToken) {
      sendJson(res, 503, {
        error: 'admin_not_configured',
        message: 'Admin token is not configured on this server.'
      });
      return false;
    }
    const authHeader = String(req.headers.authorization || '');
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || !timingSafeTokenEquals(match[1].trim(), adminToken)) {
      sendJson(res, 401, {
        error: 'unauthorized',
        message: 'Valid Bearer authorization token required.'
      });
      return false;
    }
    return true;
  }

  function getLlmsTxt() {
    const articles = store.listArticles({});
    return buildLlmsTxt({ publicOrigin, basePath, articles });
  }

  const handleMcp = createMcpHandler({
    store,
    forumBridge,
    getLlmsTxt,
    basePath,
    env,
    fetchImpl
  });

  function tryServeStatic(routePath, res) {
    if (!fs.existsSync(publicDir)) return false;
    const rel = routePath === '/' ? 'index.html' : routePath.replace(/^\/+/, '');
    const ext = path.extname(rel).toLowerCase();
    if (!STATIC_MIME_TYPES[ext]) return false;

    const resolvedPublic = path.resolve(publicDir);
    const candidate = path.resolve(resolvedPublic, rel);
    if (!candidate.startsWith(`${resolvedPublic}${path.sep}`)) return false;

    try {
      const stat = fs.statSync(candidate);
      if (!stat.isFile()) return false;
      const content = fs.readFileSync(candidate);
      res.writeHead(200, {
        ...baseHeaders,
        'content-type': STATIC_MIME_TYPES[ext],
        'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
      });
      res.end(content);
      return true;
    } catch {
      return false;
    }
  }

  async function handleRequest(req, res) {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, baseHeaders);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url || '/', 'http://localhost');
      const routePath = stripBasePath(parsedUrl.pathname, basePath);

      // 10. GET /llms.txt
      if (req.method === 'GET' && routePath === '/llms.txt') {
        sendText(res, 200, getLlmsTxt(), 'text/plain; charset=utf-8', { 'cache-control': 'public, max-age=300' });
        return;
      }

      // 9. POST/GET/DELETE /mcp
      if (routePath === '/mcp') {
        await handleMcp(req, res, { readJsonBody, sendJson, corsHeaders: baseHeaders });
        return;
      }

      // 1. GET /api/v1/status
      if (req.method === 'GET' && routePath === '/api/v1/status') {
        sendJson(res, 200, {
          status: 'ok',
          service: 'TACHOS Technical Knowledge Base',
          provider: getProviderInfo(env),
          stats: store.getStats()
        });
        return;
      }

      // 2. GET /api/v1/articles
      if (req.method === 'GET' && routePath === '/api/v1/articles') {
        const workArea = parsedUrl.searchParams.get('workArea') || undefined;
        const status = parsedUrl.searchParams.get('status') || undefined;
        const q = parsedUrl.searchParams.get('q') || undefined;
        const limit = parsedUrl.searchParams.get('limit') || undefined;
        const articles = store.listArticles({ workArea, status, q, limit });
        sendJson(res, 200, { articles });
        return;
      }

      // 4. POST /api/v1/articles/:slug/verify
      const verifyMatch = routePath.match(/^\/api\/v1\/articles\/([^/]+)\/verify$/);
      if (req.method === 'POST' && verifyMatch) {
        if (!requireAdminAuth(req, res)) return;
        const slug = decodeURIComponent(verifyMatch[1]);
        const body = await readJsonBody(req);
        try {
          const updated = store.verifyArticle(slug, {
            verifiedBy: body.verifiedBy,
            status: body.status || 'engineer_verified',
            notes: body.notes
          });
          if (!updated) {
            sendJson(res, 404, { error: 'not_found', message: 'Article not found.' });
            return;
          }
          sendJson(res, 200, { article: updated });
        } catch (err) {
          sendJson(res, err.statusCode || 400, { error: 'invalid_request', message: err.message });
        }
        return;
      }

      // 3. GET /api/v1/articles/:slug
      const articleMatch = routePath.match(/^\/api\/v1\/articles\/([^/]+)$/);
      if (req.method === 'GET' && articleMatch) {
        const slug = decodeURIComponent(articleMatch[1]);
        const article = store.getArticleBySlug(slug);
        if (!article) {
          sendJson(res, 404, { error: 'not_found', message: 'Article not found.' });
          return;
        }
        sendJson(res, 200, { article });
        return;
      }

      // 5. POST /api/v1/ask
      if (req.method === 'POST' && routePath === '/api/v1/ask') {
        const ip = getClientIp(req);
        const rate = askLimiter.check(ip);
        if (!rate.allowed) {
          sendJson(
            res,
            429,
            {
              error: 'rate_limited',
              retryAfterSeconds: rate.retryAfterSeconds,
              message: 'Too many assistant queries from this address. Please try again shortly.'
            },
            { 'retry-after': String(rate.retryAfterSeconds) }
          );
          return;
        }

        const body = await readJsonBody(req);
        const question = typeof body.question === 'string' ? body.question.trim() : '';
        if (question.length < 5 || question.length > 600) {
          sendJson(res, 400, {
            error: 'invalid_question',
            message: 'Field "question" is required and must be between 5 and 600 characters.'
          });
          return;
        }
        const workArea = typeof body.workArea === 'string' ? body.workArea.trim() : '';
        const { articles, forumPosts } = store.searchKnowledge({ question, workArea });
        const result = await answerQuestion({
          question,
          workArea,
          articles,
          forumPosts,
          basePath,
          env,
          fetchImpl
        });
        sendJson(res, 200, result);
        return;
      }

      // 6. Forum endpoints
      if (req.method === 'GET' && routePath === '/api/v1/forum/boards') {
        const result = await forumBridge.listBoards();
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'GET' && routePath === '/api/v1/forum/topics') {
        const boardId = parsedUrl.searchParams.get('boardId') || '';
        const limit = parsedUrl.searchParams.get('limit') || 20;
        const result = await forumBridge.listTopics({ boardId, limit });
        sendJson(res, 200, result);
        return;
      }

      const forumReplyMatch = routePath.match(/^\/api\/v1\/forum\/topics\/([^/]+)\/reply$/);
      if (req.method === 'POST' && forumReplyMatch) {
        const ip = getClientIp(req);
        const rate = replyLimiter.check(ip);
        if (!rate.allowed) {
          sendJson(
            res,
            429,
            {
              error: 'rate_limited',
              retryAfterSeconds: rate.retryAfterSeconds,
              message: 'Too many forum reply requests. Please try again later.'
            },
            { 'retry-after': String(rate.retryAfterSeconds) }
          );
          return;
        }

        const topicId = decodeURIComponent(forumReplyMatch[1]);
        const body = await readJsonBody(req);
        try {
          const result = await forumBridge.replyToTopic({
            topicId,
            boardId: body.boardId ?? '',
            message: body.message ?? ''
          });
          sendJson(res, 201, result);
        } catch (err) {
          sendJson(res, err.statusCode || 500, {
            error: err.code || 'forum_reply_error',
            message: err.message || 'Unable to post reply.'
          });
        }
        return;
      }

      const forumTopicMatch = routePath.match(/^\/api\/v1\/forum\/topics\/([^/]+)$/);
      if (req.method === 'GET' && forumTopicMatch) {
        const topicId = decodeURIComponent(forumTopicMatch[1]);
        const result = await forumBridge.getTopic(topicId);
        if (!result.topic && (!result.posts || result.posts.length === 0)) {
          sendJson(res, 404, { error: 'not_found', message: 'Forum topic not found.' });
          return;
        }
        sendJson(res, 200, result);
        return;
      }

      // 7. POST /api/v1/inquiries
      if (req.method === 'POST' && routePath === '/api/v1/inquiries') {
        const ip = getClientIp(req);
        const rate = inquiryLimiter.check(ip);
        if (!rate.allowed) {
          sendJson(
            res,
            429,
            {
              error: 'rate_limited',
              retryAfterSeconds: rate.retryAfterSeconds,
              message: 'Too many inquiry submissions from this address. Please email info@tachos.co.uk directly.'
            },
            { 'retry-after': String(rate.retryAfterSeconds) }
          );
          return;
        }

        const body = await readJsonBody(req);
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const company = typeof body.company === 'string' ? body.company.trim().slice(0, 150) : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const region = typeof body.region === 'string' ? body.region.trim().slice(0, 120) : '';
        const scope = typeof body.scope === 'string' ? body.scope.trim() : '';
        const workAreas = Array.isArray(body.workAreas)
          ? body.workAreas.map((w) => String(w).trim()).filter(Boolean).slice(0, 10)
          : [];

        if (name.length < 2 || name.length > 120) {
          sendJson(res, 400, { error: 'invalid_name', message: 'Field "name" is required (2–120 characters).' });
          return;
        }
        if (!EMAIL_RE.test(email) || email.length > 200) {
          sendJson(res, 400, { error: 'invalid_email', message: 'A valid "email" address is required.' });
          return;
        }
        if (scope.length < 10 || scope.length > 3000) {
          sendJson(res, 400, { error: 'invalid_scope', message: 'Field "scope" is required (10–3000 characters).' });
          return;
        }

        const inquiry = store.createInquiry({
          name,
          company,
          email,
          workAreas,
          region,
          scope,
          clientIp: ip
        });

        // Non-blocking optional webhook notification
        if (inquiryWebhookUrl && typeof fetchImpl === 'function') {
          void fetchImpl(inquiryWebhookUrl, {
            method: 'POST',
            signal: AbortSignal.timeout(5000),
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              event: 'tachos.inquiry.created',
              inquiryId: inquiry.id,
              name: inquiry.name,
              company: inquiry.company,
              email: inquiry.email,
              workAreas: inquiry.workAreas,
              region: inquiry.region,
              scope: inquiry.scope,
              createdAt: inquiry.createdAt
            })
          }).catch(() => {
            // Never fail user inquiry or log webhook URL/credentials.
          });
        }

        sendJson(res, 201, {
          ok: true,
          inquiryId: inquiry.id,
          message: 'Inquiry logged. TACHOS engineering will respond via info@tachos.co.uk.'
        });
        return;
      }

      // 8. GET /api/v1/inquiries (Admin Bearer)
      if (req.method === 'GET' && routePath === '/api/v1/inquiries') {
        if (!requireAdminAuth(req, res)) return;
        const limit = parsedUrl.searchParams.get('limit') || 100;
        const inquiries = store.listInquiries({ limit });
        sendJson(res, 200, { inquiries });
        return;
      }

      // Optional static UI files in kb/public/
      if (req.method === 'GET' && tryServeStatic(routePath, res)) {
        return;
      }

      if (req.method === 'GET' && routePath === '/') {
        sendJson(res, 200, {
          service: 'TACHOS Technical Knowledge Base',
          basePath,
          endpoints: {
            status: `${basePath}/api/v1/status`,
            articles: `${basePath}/api/v1/articles`,
            ask: `${basePath}/api/v1/ask`,
            forumBoards: `${basePath}/api/v1/forum/boards`,
            forumTopics: `${basePath}/api/v1/forum/topics`,
            inquiries: `${basePath}/api/v1/inquiries`,
            mcp: `${basePath}/mcp`,
            llmsTxt: `${basePath}/llms.txt`
          }
        });
        return;
      }

      sendJson(res, 404, { error: 'not_found', message: 'Endpoint not found.' });
    } catch (err) {
      if (!res.headersSent) {
        sendJson(res, err.statusCode || 500, {
          error: err.code || 'internal_error',
          message: err.statusCode && err.statusCode < 500 ? err.message : 'Internal server error.'
        });
      }
    }
  }

  const server = http.createServer((req, res) => {
    void handleRequest(req, res);
  });

  function listen(port = Number(env.PORT) || 3100, host = env.HOST || '127.0.0.1') {
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        server.off('error', reject);
        resolve(server.address());
      });
    });
  }

  function close({ closeStore = ownsStore } = {}) {
    return new Promise((resolve) => {
      const finish = () => {
        if (closeStore) store.close();
        resolve();
      };
      if (server.listening) {
        server.close(finish);
      } else {
        finish();
      }
    });
  }

  return {
    server,
    handleRequest,
    store,
    forumBridge,
    basePath,
    listen,
    close
  };
}

// Start standalone HTTP server only when executed directly (`node server.mjs`)
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun && process.env.TACHOS_NO_AUTOSTART !== '1' && !process.execArgv.includes('--test')) {
  const app = createTachosKbServer();
  const port = Number(process.env.PORT) || 3100;
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host).then((addr) => {
    const boundPort = typeof addr === 'object' && addr ? addr.port : port;
    process.stdout.write(`TACHOS Technical Knowledge Base listening on http://${host}:${boundPort}${app.basePath}\n`);
  }).catch((err) => {
    process.stderr.write(`Failed to start TACHOS Technical Knowledge Base: ${err.message}\n`);
    process.exitCode = 1;
  });
}
