import crypto from 'node:crypto';
import { WORK_AREAS } from './store.mjs';
import { answerQuestion } from './llm.mjs';
import { researchWeb } from './research/web-researcher.mjs';

export const MCP_SERVER_INFO = Object.freeze({
  name: 'tachos-technical-kb',
  version: '1.1.0'
});

export const MCP_PROTOCOL_VERSION = '2025-03-26';

export const MCP_TOOLS = Object.freeze([
  {
    name: 'search_knowledge_base',
    description:
      'Search TACHOS LTD data-centre and network infrastructure Knowledge Base guides by keyword, Five Works area, or verification status (engineer_verified / ai_drafted).',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          description: 'Search terms (e.g. ISO/IEC 14763-3, OM4 polarity, rack elevation, rollback, handover).'
        },
        workArea: {
          type: 'string',
          enum: WORK_AREAS.map((a) => a.id),
          description: 'Optional Five Works filter.'
        },
        status: {
          type: 'string',
          enum: ['engineer_verified', 'ai_drafted'],
          description: 'Optional verification status filter.'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Maximum number of articles to return (default 10).'
        }
      }
    }
  },
  {
    name: 'read_kb_article',
    description:
      'Read the full text, standards references, deliverables, checklist, and working-basis notice of a TACHOS Knowledge Base article by slug.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['slug'],
      properties: {
        slug: {
          type: 'string',
          description: 'Article slug (e.g. cabling-patch-management).'
        }
      }
    }
  },
  {
    name: 'ask_tachos_assistant',
    description:
      'Ask a data-centre or network infrastructure technical question and receive a citation-backed answer grounded in TACHOS Knowledge Base guides and synced community forum threads.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['question'],
      properties: {
        question: {
          type: 'string',
          minLength: 5,
          maxLength: 600,
          description: 'Technical question to answer from TACHOS guides and forum posts.'
        },
        workArea: {
          type: 'string',
          enum: WORK_AREAS.map((a) => a.id),
          description: 'Optional Five Works scope focus.'
        }
      }
    }
  },
  {
    name: 'list_forum_topics',
    description:
      'List recent technical discussions from the TACHOS phpBB community forum (with local SQLite cache fallback).',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        boardId: {
          type: 'string',
          description: 'Optional phpBB board ID to filter topics.'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Maximum number of topics to return (default 15).'
        }
      }
    }
  },
  {
    name: 'read_forum_topic',
    description:
      'Read posts from a specific TACHOS technical community forum topic by topicId.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['topicId'],
      properties: {
        topicId: {
          type: 'string',
          description: 'Numeric phpBB topic ID.'
        }
      }
    }
  },
  {
    name: 'search_technical_documents',
    description:
      'Search indexed TACHOS Technical Document Library chunks (Google Drive technical manuals, SOPs, standards notes, and engineering PDFs/DOCX/MD) by keyword and optional Five Works area.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          maxLength: 400,
          description: 'Search terms (e.g. MPO polarity, OTDR trace, PDU phase balance, BGP EVPN).'
        },
        workArea: {
          type: 'string',
          enum: WORK_AREAS.map((a) => a.id),
          description: 'Optional Five Works filter.'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: 'Maximum number of document chunks to return (default 6).'
        }
      }
    }
  },
  {
    name: 'deep_technical_research',
    description:
      'Run hybrid deep technical research across TACHOS Knowledge Base guides, indexed Technical Document Library, community forum discussions, and live authoritative web sources.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['question'],
      properties: {
        question: {
          type: 'string',
          minLength: 5,
          maxLength: 600,
          description: 'Technical question to research deeply across KB guides, Technical Library, forum, and live web.'
        },
        workArea: {
          type: 'string',
          enum: WORK_AREAS.map((a) => a.id),
          description: 'Optional Five Works scope focus.'
        }
      }
    }
  }
]);

export const MCP_RESOURCES = Object.freeze([
  {
    uri: 'tachos://kb/index',
    name: 'TACHOS Knowledge Base Index',
    description: 'JSON index of TACHOS Five Works methodology guides and AI-drafted technical checklists.',
    mimeType: 'application/json'
  },
  {
    uri: 'tachos://llms.txt',
    name: 'TACHOS AI Discovery Guide (llms.txt)',
    description: 'Plain-text discovery guide for TACHOS Technical Knowledge Base, HTTP API, and MCP server.',
    mimeType: 'text/plain'
  }
]);

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id: id ?? null, error };
}

function toolSuccess(payload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: false
  };
}

function toolError(message) {
  return {
    content: [{ type: 'text', text: message }],
    isError: true
  };
}

export function createMcpHandler({
  store,
  forumBridge,
  getLlmsTxt,
  basePath = '/kb',
  env = process.env,
  fetchImpl = globalThis.fetch
}) {
  const sessions = new Map();

  function pruneSessions() {
    if (sessions.size <= 500) return;
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [id, meta] of sessions.entries()) {
      if (meta.lastSeen < cutoff) sessions.delete(id);
    }
  }

  async function callTool(name, args = {}) {
    const input = args && typeof args === 'object' ? args : {};

    switch (name) {
      case 'search_knowledge_base': {
        const limit = Number.isInteger(Number(input.limit))
          ? Math.max(1, Math.min(Number(input.limit), 50))
          : 10;
        const articles = store.listArticles({
          q: typeof input.query === 'string' ? input.query : undefined,
          workArea: typeof input.workArea === 'string' ? input.workArea : undefined,
          status: typeof input.status === 'string' ? input.status : undefined,
          limit
        });
        return toolSuccess({
          count: articles.length,
          articles: articles.map((a) => ({
            slug: a.slug,
            title: a.title,
            workArea: a.workArea,
            workAreaLabel: a.workAreaLabel,
            status: a.status,
            summary: a.summary,
            standards: a.standards,
            sourceUrl: a.sourceUrl,
            verifiedBy: a.verifiedBy,
            updatedAt: a.updatedAt
          }))
        });
      }

      case 'read_kb_article': {
        const slug = typeof input.slug === 'string' ? input.slug.trim() : '';
        if (!slug) return toolError('Parameter "slug" is required.');
        const article = store.getArticleBySlug(slug);
        if (!article) return toolError(`Knowledge Base article "${slug}" was not found.`);
        return toolSuccess({ article });
      }

      case 'ask_tachos_assistant': {
        const question = typeof input.question === 'string' ? input.question.trim() : '';
        if (question.length < 5 || question.length > 600) {
          return toolError('Parameter "question" must be between 5 and 600 characters.');
        }
        const workArea = typeof input.workArea === 'string' ? input.workArea.trim() : '';
        const { articles, documents, forumPosts } = store.searchKnowledge({ question, workArea });
        const result = await answerQuestion({
          question,
          workArea,
          articles,
          documents,
          forumPosts,
          basePath,
          env,
          fetchImpl
        });
        return toolSuccess(result);
      }

      case 'list_forum_topics': {
        const boardId = typeof input.boardId === 'string' ? input.boardId.trim() : '';
        const limit = Number.isInteger(Number(input.limit))
          ? Math.max(1, Math.min(Number(input.limit), 50))
          : 15;
        const result = await forumBridge.listTopics({ boardId, limit });
        return toolSuccess(result);
      }

      case 'read_forum_topic': {
        const topicId = input.topicId !== undefined && input.topicId !== null ? String(input.topicId).trim() : '';
        if (!topicId) return toolError('Parameter "topicId" is required.');
        const result = await forumBridge.getTopic(topicId);
        if (!result.topic && (!result.posts || result.posts.length === 0)) {
          return toolError(`Forum topic "${topicId}" was not found.`);
        }
        return toolSuccess(result);
      }

      case 'search_technical_documents': {
        const query = typeof input.query === 'string' ? input.query.trim() : '';
        if (query.length < 2 || query.length > 400) {
          return toolError('Parameter "query" must be between 2 and 400 characters.');
        }
        const workArea = typeof input.workArea === 'string' ? input.workArea.trim() : '';
        const limit = Number.isInteger(Number(input.limit))
          ? Math.max(1, Math.min(Number(input.limit), 20))
          : 6;
        const chunks = store.searchDocumentChunks(query, { workArea, limit });
        return toolSuccess({
          query,
          workArea: workArea || null,
          count: chunks.length,
          documents: chunks.map((c) => ({
            chunkId: c.chunkId,
            documentId: c.documentId,
            title: c.title,
            folderName: c.folderName,
            workArea: c.workArea,
            source: c.source,
            sourceUrl: c.sourceUrl,
            heading: c.heading,
            snippet: c.snippet,
            content: c.content,
            score: c.score
          }))
        });
      }

      case 'deep_technical_research': {
        const question = typeof input.question === 'string' ? input.question.trim() : '';
        if (question.length < 5 || question.length > 600) {
          return toolError('Parameter "question" must be between 5 and 600 characters.');
        }
        const workArea = typeof input.workArea === 'string' ? input.workArea.trim() : '';
        const { articles, documents, forumPosts } = store.searchKnowledge({
          question,
          workArea,
          articleLimit: 5,
          documentLimit: 6,
          postLimit: 4
        });

        let webSources = [];
        let aiWebBrief = '';
        let webProvidersUsed = [];
        let webCached = false;
        try {
          const research = await researchWeb({
            question,
            workArea,
            maxResults: 8,
            env,
            fetchImpl,
            store
          });
          webSources = Array.isArray(research?.webSources) ? research.webSources : [];
          aiWebBrief = typeof research?.aiWebBrief === 'string' ? research.aiWebBrief : '';
          webProvidersUsed = Array.isArray(research?.providersUsed) ? research.providersUsed : [];
          webCached = Boolean(research?.cached);
        } catch {
          // Degrade cleanly to local KB + Technical Library + Forum synthesis
        }

        const result = await answerQuestion({
          question,
          workArea,
          articles,
          documents,
          forumPosts,
          webSources,
          aiWebBrief,
          deepResearch: true,
          basePath,
          env,
          fetchImpl
        });

        const providersUsed = [...new Set([
          ...(Array.isArray(result.providersUsed) ? result.providersUsed : []),
          ...webProvidersUsed
        ].filter(Boolean))];

        return toolSuccess({
          ...result,
          question,
          workArea: workArea || null,
          researchMode: 'deep',
          webSearchUsed: true,
          webCached,
          documentHits: documents.length,
          webHits: webSources.length,
          webSources,
          providersUsed
        });
      }

      default:
        return null;
    }
  }

  function readResource(uri) {
    if (uri === 'tachos://kb/index') {
      const articles = store.listArticles({});
      const payload = {
        service: 'TACHOS Technical Knowledge Base',
        company: 'TACHOS LTD (Company no. 17459934)',
        contact: 'info@tachos.co.uk',
        workAreas: WORK_AREAS,
        articles: articles.map((a) => ({
          slug: a.slug,
          title: a.title,
          workArea: a.workArea,
          workAreaLabel: a.workAreaLabel,
          status: a.status,
          summary: a.summary,
          sourceUrl: a.sourceUrl,
          verifiedBy: a.verifiedBy,
          updatedAt: a.updatedAt
        }))
      };
      return {
        contents: [
          {
            uri: 'tachos://kb/index',
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2)
          }
        ]
      };
    }

    if (uri === 'tachos://llms.txt') {
      return {
        contents: [
          {
            uri: 'tachos://llms.txt',
            mimeType: 'text/plain',
            text: getLlmsTxt()
          }
        ]
      };
    }

    return null;
  }

  async function processRpcMessage(msg, sessionId) {
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return { response: jsonRpcError(msg?.id ?? null, -32600, 'Invalid JSON-RPC 2.0 request.') };
    }

    const isNotification = msg.id === undefined;
    const { method, params = {}, id } = msg;

    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return { response: null };
    }

    if (method === 'ping') {
      return { response: isNotification ? null : jsonRpcResult(id, {}) };
    }

    if (method === 'initialize') {
      pruneSessions();
      const newSessionId = sessionId || crypto.randomUUID();
      sessions.set(newSessionId, { createdAt: Date.now(), lastSeen: Date.now() });
      const clientVersion = typeof params?.protocolVersion === 'string' ? params.protocolVersion : MCP_PROTOCOL_VERSION;
      const negotiatedVersion = ['2025-03-26', '2024-11-05'].includes(clientVersion)
        ? clientVersion
        : MCP_PROTOCOL_VERSION;

      return {
        sessionId: newSessionId,
        response: isNotification
          ? null
          : jsonRpcResult(id, {
              protocolVersion: negotiatedVersion,
              serverInfo: MCP_SERVER_INFO,
              capabilities: {
                tools: { listChanged: false },
                resources: { subscribe: false, listChanged: false }
              }
            })
      };
    }

    if (method === 'tools/list') {
      return {
        response: isNotification ? null : jsonRpcResult(id, { tools: MCP_TOOLS })
      };
    }

    if (method === 'tools/call') {
      const toolName = typeof params?.name === 'string' ? params.name : '';
      const result = await callTool(toolName, params?.arguments);
      if (result === null) {
        return {
          response: isNotification ? null : jsonRpcError(id, -32601, `Unknown tool: ${toolName}`)
        };
      }
      return {
        response: isNotification ? null : jsonRpcResult(id, result)
      };
    }

    if (method === 'resources/list') {
      return {
        response: isNotification ? null : jsonRpcResult(id, { resources: MCP_RESOURCES })
      };
    }

    if (method === 'resources/read') {
      const uri = typeof params?.uri === 'string' ? params.uri : '';
      const result = readResource(uri);
      if (!result) {
        return {
          response: isNotification ? null : jsonRpcError(id, -32602, `Unknown resource URI: ${uri}`)
        };
      }
      return {
        response: isNotification ? null : jsonRpcResult(id, result)
      };
    }

    return {
      response: isNotification ? null : jsonRpcError(id, -32601, `Method not found: ${method}`)
    };
  }

  return async function handleMcp(req, res, { readJsonBody, sendJson, corsHeaders }) {
    const incomingSessionId = String(req.headers['mcp-session-id'] || '').trim();
    if (incomingSessionId && sessions.has(incomingSessionId)) {
      sessions.get(incomingSessionId).lastSeen = Date.now();
    }

    if (req.method === 'GET') {
      const accept = String(req.headers.accept || '').toLowerCase();
      const info = {
        protocol: 'mcp',
        transport: 'streamable-http',
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: MCP_SERVER_INFO,
        tools: MCP_TOOLS.map((t) => t.name),
        resources: MCP_RESOURCES.map((r) => r.uri)
      };
      if (accept.includes('text/event-stream')) {
        res.writeHead(200, {
          ...corsHeaders,
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          ...(incomingSessionId ? { 'mcp-session-id': incomingSessionId } : {})
        });
        res.write(`event: server_info\ndata: ${JSON.stringify(info)}\n\n`);
        res.end();
        return;
      }
      sendJson(res, 200, info, incomingSessionId ? { 'mcp-session-id': incomingSessionId } : {});
      return;
    }

    if (req.method === 'DELETE') {
      const existed = incomingSessionId ? sessions.delete(incomingSessionId) : false;
      sendJson(res, 200, {
        ok: true,
        terminated: true,
        sessionId: incomingSessionId || null,
        existed
      });
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'method_not_allowed', allow: ['GET', 'POST', 'DELETE'] }, { allow: 'GET, POST, DELETE' });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      sendJson(res, err.statusCode || 400, jsonRpcError(null, -32700, err.message || 'Invalid JSON payload.'));
      return;
    }

    if (Array.isArray(body)) {
      if (body.length === 0) {
        sendJson(res, 400, jsonRpcError(null, -32600, 'Empty JSON-RPC batch.'));
        return;
      }
      const responses = [];
      let assignedSessionId = incomingSessionId;
      for (const item of body) {
        const outcome = await processRpcMessage(item, assignedSessionId);
        if (outcome.sessionId) assignedSessionId = outcome.sessionId;
        if (outcome.response) responses.push(outcome.response);
      }
      const extraHeaders = assignedSessionId ? { 'mcp-session-id': assignedSessionId } : {};
      if (responses.length === 0) {
        res.writeHead(202, { ...corsHeaders, ...extraHeaders });
        res.end();
        return;
      }
      sendJson(res, 200, responses, extraHeaders);
      return;
    }

    const outcome = await processRpcMessage(body, incomingSessionId);
    const assignedSessionId = outcome.sessionId || incomingSessionId;
    const extraHeaders = assignedSessionId ? { 'mcp-session-id': assignedSessionId } : {};

    if (!outcome.response) {
      res.writeHead(202, { ...corsHeaders, ...extraHeaders });
      res.end();
      return;
    }

    sendJson(res, 200, outcome.response, extraHeaders);
  };
}
