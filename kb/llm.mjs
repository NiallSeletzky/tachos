import { WORKING_BASIS_NOTICE } from './store.mjs';

export const TACHOS_DISCLAIMER =
  'AI-assisted technical reference based on TACHOS guides and community threads. Verify against approved client designs, site standards, and manufacturer instructions.';

export const TACHOS_CTA = Object.freeze({
  label: 'Request a TACHOS Site Survey / Quote',
  email: 'info@tachos.co.uk'
});

const SYSTEM_PROMPT = [
  'You are the TACHOS LTD Technical Knowledge Base Assistant for UK B2B data-centre and network infrastructure engineering.',
  'Tone: concise, practical, commercially credible British English (e.g. data centres, fibre, standardisation, handover).',
  'Rules:',
  '- Ground every answer strictly in the provided numbered sources: TACHOS Knowledge Base guides, Technical Library (Google Drive) excerpts, synced phpBB community forum posts, and Live Web research findings.',
  '- Cite sources inline cleanly using bracketed numbers like [1], [2] that match the numbered source list.',
  '- Explicitly distinguish Engineer-Verified TACHOS guides from AI-Drafted checklists, Technical Library documents, community forum posts, and external live web references.',
  '- NEVER claim formal standards compliance, accreditation, or certifications; frame standards (ISO/IEC 22237, ISO/IEC 11801, ISO/IEC 14763-3, IEEE 802.3, BICSI 1st ed. 2019, TIA-942, ASHRAE TC 9.9, IETF RFCs) honestly as working-basis technical references subject to approved client designs, site specifications, and manufacturer instructions.',
  '- Never fabricate test thresholds, serial numbers, or vendor part numbers not present in the context.',
  '- Keep answers crisp and actionable (short paragraphs or bullet points).'
].join('\n');

const SECONDARY_CONSULT_PROMPT = [
  'You are a senior UK data-centre and network infrastructure engineering peer reviewer for TACHOS LTD.',
  'Review the user question and available context briefly in British English.',
  'Rules:',
  '- Provide a concise technical cross-check (max 200 words) highlighting critical engineering checks, protocol/physical edge cases, or standards context.',
  '- NEVER claim formal standards compliance, accreditation, or certifications; frame all standards as working-basis technical references.',
  '- Never fabricate vendor part numbers or unverified test thresholds.'
].join('\n');

function buildProviderConfig(name, env = process.env, explicitModel = '') {
  const anthropicKey = String(env.ANTHROPIC_API_KEY || '').trim();
  const xaiKey = String(env.XAI_API_KEY || '').trim();
  const openaiKey = String(env.OPENAI_API_KEY || '').trim();
  const geminiKey = String(env.GEMINI_API_KEY || '').trim();
  const perplexityKey = String(env.PERPLEXITY_API_KEY || '').trim();
  const customUrl = String(env.TACHOS_CUSTOM_AI_URL || '').trim();
  const customKey = String(env.TACHOS_CUSTOM_AI_KEY || '').trim();

  if (name === 'anthropic' && anthropicKey) {
    return {
      provider: 'anthropic',
      model: explicitModel || String(env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim(),
      isMock: false,
      apiKey: anthropicKey,
      baseUrl: String(env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '')
    };
  }

  if (name === 'xai' && xaiKey) {
    return {
      provider: 'xai',
      model: explicitModel || String(env.XAI_MODEL || 'grok-3-mini').trim(),
      isMock: false,
      apiKey: xaiKey,
      baseUrl: String(env.XAI_BASE_URL || 'https://api.x.ai/v1').replace(/\/+$/, '')
    };
  }

  if (name === 'openai' && openaiKey) {
    return {
      provider: 'openai',
      model: explicitModel || String(env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
      isMock: false,
      apiKey: openaiKey,
      baseUrl: String(env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
    };
  }

  if (name === 'gemini' && geminiKey) {
    return {
      provider: 'gemini',
      model: explicitModel || String(env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
      isMock: false,
      apiKey: geminiKey,
      baseUrl: String(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '')
    };
  }

  if (name === 'perplexity' && perplexityKey) {
    return {
      provider: 'perplexity',
      model: explicitModel || String(env.PERPLEXITY_MODEL || 'sonar').trim(),
      isMock: false,
      apiKey: perplexityKey,
      baseUrl: String(env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai').replace(/\/+$/, '')
    };
  }

  if (name === 'custom_gateway' && customUrl) {
    return {
      provider: 'custom_gateway',
      model: explicitModel || String(env.TACHOS_CUSTOM_AI_MODEL || 'default').trim(),
      isMock: false,
      apiKey: customKey,
      baseUrl: customUrl.replace(/\/+$/, '')
    };
  }

  return null;
}

function listConfiguredLiveProviders(env = process.env) {
  const order = ['anthropic', 'xai', 'openai', 'gemini', 'perplexity', 'custom_gateway'];
  const configured = [];
  for (const name of order) {
    const cfg = buildProviderConfig(name, env);
    if (cfg) configured.push(cfg);
  }
  return configured;
}

function resolveProviderConfig(env = process.env) {
  const requested = String(env.TACHOS_LLM_PROVIDER || 'auto').trim().toLowerCase();
  const explicitModel = String(env.TACHOS_LLM_MODEL || '').trim();

  if (requested === 'mock' || requested === 'offline' || requested === 'grounded_search') {
    return {
      provider: 'grounded_search',
      model: 'extractive-local',
      isMock: true,
      apiKey: '',
      baseUrl: ''
    };
  }

  const aliasMap = {
    anthropic: 'anthropic',
    claude: 'anthropic',
    xai: 'xai',
    grok: 'xai',
    openai: 'openai',
    gemini: 'gemini',
    google: 'gemini',
    perplexity: 'perplexity',
    sonar: 'perplexity',
    custom: 'custom_gateway',
    custom_gateway: 'custom_gateway',
    gateway: 'custom_gateway'
  };

  if (requested !== 'auto' && aliasMap[requested]) {
    const specific = buildProviderConfig(aliasMap[requested], env, explicitModel);
    if (specific) return specific;
  }

  if (requested === 'auto') {
    for (const name of ['anthropic', 'xai', 'openai', 'gemini', 'perplexity', 'custom_gateway']) {
      const cfg = buildProviderConfig(name, env, explicitModel);
      if (cfg) return cfg;
    }
  }

  return {
    provider: 'grounded_search',
    model: 'extractive-local',
    isMock: true,
    apiKey: '',
    baseUrl: ''
  };
}

export function getProviderInfo(env = process.env) {
  const { provider, model, isMock } = resolveProviderConfig(env);
  const configuredProviders = listConfiguredLiveProviders(env).map((c) => c.provider);
  const customGatewayConfigured = Boolean(String(env.TACHOS_CUSTOM_AI_URL || '').trim());
  return {
    provider,
    model,
    isMock,
    configuredProviders,
    customGatewayConfigured
  };
}

function truncate(text, maxLen = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function extractDomainSafe(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function buildCitations({
  articles = [],
  documents = [],
  forumPosts = [],
  webSources = [],
  basePath = '/kb'
} = {}) {
  const citations = [];
  const normalizedBase = basePath ? `/${String(basePath).replace(/^\/+|\/+$/g, '')}` : '';
  let index = 1;

  for (const article of articles) {
    const isVerified = article.status === 'engineer_verified';
    citations.push({
      index: index++,
      type: 'kb_article',
      badge: isVerified ? 'Engineer Verified' : 'AI-Drafted',
      title: article.title,
      url: article.sourceUrl || `${normalizedBase}/api/v1/articles/${encodeURIComponent(article.slug)}`,
      status: isVerified ? 'engineer_verified' : 'ai_drafted',
      excerpt: truncate(article.summary || article.body, 220)
    });
  }

  for (const doc of documents) {
    citations.push({
      index: index++,
      type: 'drive_document',
      badge: 'Technical Library',
      documentId: doc.documentId ?? doc.id ?? null,
      title: doc.title || 'Technical Library Document',
      folderName: doc.folderName || '',
      heading: doc.heading || '',
      workArea: doc.workArea || '',
      url: doc.sourceUrl || '',
      status: 'technical_library',
      excerpt: truncate(doc.snippet || doc.content || '', 220)
    });
  }

  for (const post of forumPosts) {
    citations.push({
      index: index++,
      type: 'forum_post',
      badge: 'Technical Forum',
      title: post.topicTitle || `Forum Topic #${post.topicId}`,
      url: post.url || post.topicUrl || 'https://tachos.co.uk/forum/',
      status: 'forum',
      excerpt: truncate(post.body, 220)
    });
  }

  for (const src of webSources) {
    if (!src || !src.url) continue;
    const domain = src.domain || extractDomainSafe(src.url);
    citations.push({
      index: index++,
      type: 'web_source',
      badge: 'Live Web',
      title: src.title || domain || src.url,
      domain,
      url: src.url,
      sourceType: src.sourceType || 'web',
      status: 'live_web',
      excerpt: truncate(src.snippet || '', 220)
    });
  }

  return citations;
}

function buildExtractiveAnswer({
  question,
  workArea,
  articles = [],
  documents = [],
  forumPosts = [],
  webSources = [],
  aiWebBrief = '',
  citations = []
}) {
  const hasAny =
    articles.length > 0 ||
    documents.length > 0 ||
    forumPosts.length > 0 ||
    webSources.length > 0 ||
    Boolean(String(aiWebBrief || '').trim());

  if (!hasAny) {
    const scopeHint = workArea ? ` within work area "${workArea}"` : '';
    return [
      `No direct match was found in the current TACHOS Technical Knowledge Base${scopeHint} for: "${question.trim()}".`,
      '',
      'Next steps:',
      '- Browse the Five Works reference guides (Project Delivery, Rack & Stack, Cabling & Patch Management, Network Implementation, Documentation & Handover) for related checklists and deliverables.',
      '- Post the technical question in the TACHOS community forum at https://tachos.co.uk/forum/ for peer discussion.',
      '- For contract-specific design, site survey, or delivery support, contact TACHOS engineering at info@tachos.co.uk.'
    ].join('\n');
  }

  const citeIndexByType = {
    kb_article: citations.filter((c) => c.type === 'kb_article').map((c) => c.index),
    drive_document: citations.filter((c) => c.type === 'drive_document').map((c) => c.index),
    forum_post: citations.filter((c) => c.type === 'forum_post').map((c) => c.index),
    web_source: citations.filter((c) => c.type === 'web_source').map((c) => c.index)
  };

  const tagFor = (type, offset) => {
    const idx = citeIndexByType[type]?.[offset];
    return idx ? ` [${idx}]` : '';
  };

  const lines = [];
  const primary = articles[0];
  if (primary) {
    const badge = primary.status === 'engineer_verified' ? 'Engineer-Verified Guide' : 'AI-Drafted Checklist (Pending Engineer Verification)';
    lines.push(`**${primary.title}**${tagFor('kb_article', 0)} (${badge} · ${primary.workAreaLabel})`);
    lines.push(primary.summary);

    if (Array.isArray(primary.standards) && primary.standards.length > 0) {
      lines.push('');
      lines.push('**Standards & working-basis references:**');
      for (const ref of primary.standards.slice(0, 4)) {
        lines.push(`- ${ref}`);
      }
    }

    if (Array.isArray(primary.checklist) && primary.checklist.length > 0) {
      lines.push('');
      lines.push('**Key engineering checks:**');
      for (const item of primary.checklist.slice(0, 4)) {
        lines.push(`- ${item}`);
      }
    }

    if (Array.isArray(primary.deliverables) && primary.deliverables.length > 0) {
      lines.push('');
      lines.push('**Expected handover/delivery artefacts:**');
      for (const del of primary.deliverables.slice(0, 3)) {
        lines.push(`- ${del}`);
      }
    }
  }

  if (articles.length > 1) {
    lines.push('');
    lines.push('**Related TACHOS guides:**');
    articles.slice(1, 3).forEach((extra, idx) => {
      const tag = extra.status === 'engineer_verified' ? 'Engineer-Verified' : 'AI-Drafted';
      lines.push(`- ${extra.title}${tagFor('kb_article', idx + 1)} (${tag}): ${truncate(extra.summary, 160)}`);
    });
  }

  if (documents.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Technical Library excerpts:**');
    documents.slice(0, 3).forEach((doc, idx) => {
      const location = [doc.folderName, doc.heading].filter(Boolean).join(' › ');
      const locText = location ? ` (${location})` : '';
      const excerpt = truncate(doc.snippet || doc.content || '', 200);
      lines.push(`- **${doc.title || 'Technical Library Document'}**${locText}${tagFor('drive_document', idx)}: ${excerpt}`);
    });
  }

  if (String(aiWebBrief || '').trim() || webSources.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Live web technical research:**');
    if (String(aiWebBrief || '').trim()) {
      lines.push(truncate(aiWebBrief, 500));
    }
    webSources.slice(0, 4).forEach((src, idx) => {
      const domain = src.domain || extractDomainSafe(src.url);
      const domainLabel = domain ? ` (${domain})` : '';
      const snippet = src.snippet ? `: ${truncate(src.snippet, 180)}` : '';
      lines.push(`- ${src.title || domain || src.url}${domainLabel}${tagFor('web_source', idx)}${snippet}`);
    });
  }

  if (forumPosts.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Related community forum notes:**');
    forumPosts.slice(0, 2).forEach((post, idx) => {
      const who = post.author ? ` (${post.author})` : '';
      lines.push(`- ${post.topicTitle || `Topic #${post.topicId}`}${who}${tagFor('forum_post', idx)}: ${truncate(post.body, 160)}`);
    });
  }

  lines.push('');
  lines.push('*Working basis: Reference guidance only — verify against approved client designs, site specifications, and equipment-manufacturer instructions.*');

  return lines.join('\n');
}

function resolveCustomGatewayEndpoint(baseUrl) {
  const clean = String(baseUrl || '').replace(/\/+$/, '');
  if (/\/(chat\/completions|completions|responses|generate)$/i.test(clean)) {
    return clean;
  }
  return `${clean}/chat/completions`;
}

function extractTextFromOpenAiLikePayload(payload) {
  const choiceContent = payload?.choices?.[0]?.message?.content;
  if (typeof choiceContent === 'string' && choiceContent.trim()) {
    return choiceContent.trim();
  }
  if (Array.isArray(choiceContent)) {
    const joined = choiceContent
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n')
      .trim();
    if (joined) return joined;
  }
  if (typeof payload?.choices?.[0]?.text === 'string' && payload.choices[0].text.trim()) {
    return payload.choices[0].text.trim();
  }
  if (typeof payload?.message?.content === 'string' && payload.message.content.trim()) {
    return payload.message.content.trim();
  }
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  if (typeof payload?.response === 'string' && payload.response.trim()) {
    return payload.response.trim();
  }
  if (typeof payload?.text === 'string' && payload.text.trim()) {
    return payload.text.trim();
  }
  return '';
}

async function callConfiguredLlm({
  config,
  systemPrompt,
  userPrompt,
  fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
  maxTokens = 850
}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch implementation unavailable');
  }
  const signal = AbortSignal.timeout(timeoutMs);

  if (config.provider === 'anthropic') {
    const res = await fetchImpl(`${config.baseUrl}/v1/messages`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!res.ok) {
      throw new Error(`Anthropic HTTP ${res.status}`);
    }
    const payload = await res.json();
    const text = Array.isArray(payload?.content)
      ? payload.content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n').trim()
      : '';
    if (!text) throw new Error('Anthropic returned empty content');
    return text;
  }

  if (config.provider === 'gemini') {
    const endpoint = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': config.apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens
        }
      })
    });
    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }
    const payload = await res.json();
    const parts = payload?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.filter((p) => typeof p?.text === 'string').map((p) => p.text).join('\n').trim()
      : '';
    if (!text) throw new Error('Gemini returned empty content');
    return text;
  }

  if (config.provider === 'custom_gateway') {
    const endpoint = resolveCustomGatewayEndpoint(config.baseUrl);
    const headers = { 'content-type': 'application/json' };
    if (config.apiKey) {
      headers.authorization = `Bearer ${config.apiKey}`;
    }
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    if (!res.ok) {
      throw new Error(`custom_gateway HTTP ${res.status}`);
    }
    const payload = await res.json();
    const text = extractTextFromOpenAiLikePayload(payload);
    if (!text) throw new Error('custom_gateway returned empty content');
    return text;
  }

  // OpenAI, xAI Grok, and Perplexity Sonar all implement the OpenAI Chat Completions wire protocol.
  const endpoint = `${config.baseUrl}/chat/completions`;
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  if (!res.ok) {
    throw new Error(`${config.provider} HTTP ${res.status}`);
  }
  const payload = await res.json();
  const text = extractTextFromOpenAiLikePayload(payload);
  if (!text) throw new Error(`${config.provider} returned empty content`);
  return text;
}

function buildContextPrompt({
  question,
  workArea,
  articles = [],
  documents = [],
  forumPosts = [],
  webSources = [],
  aiWebBrief = '',
  secondaryBriefs = [],
  citations = []
}) {
  const sections = [];
  sections.push(`Question: ${question.trim()}`);
  if (workArea) sections.push(`Requested work area filter: ${workArea}`);
  sections.push('');

  const citeIndexByType = {
    kb_article: citations.filter((c) => c.type === 'kb_article').map((c) => c.index),
    drive_document: citations.filter((c) => c.type === 'drive_document').map((c) => c.index),
    forum_post: citations.filter((c) => c.type === 'forum_post').map((c) => c.index),
    web_source: citations.filter((c) => c.type === 'web_source').map((c) => c.index)
  };

  if (articles.length > 0) {
    sections.push('=== TACHOS KNOWLEDGE BASE GUIDES ===');
    articles.forEach((a, idx) => {
      const refNum = citeIndexByType.kb_article[idx] || idx + 1;
      const badge = a.status === 'engineer_verified' ? 'Engineer Verified' : 'AI-Drafted';
      sections.push([
        `[${refNum}] Title: ${a.title} (${badge})`,
        `Work Area: ${a.workAreaLabel || a.workArea || ''}`,
        `Summary: ${a.summary || ''}`,
        `Standards: ${(a.standards || []).join('; ')}`,
        `Checklist: ${(a.checklist || []).join(' | ')}`,
        `Deliverables: ${(a.deliverables || []).join(' | ')}`,
        `Body Excerpt: ${truncate(a.body, 700)}`
      ].join('\n'));
      sections.push('---');
    });
  }

  if (documents.length > 0) {
    sections.push('=== TECHNICAL LIBRARY (GOOGLE DRIVE DOCUMENTS) ===');
    documents.forEach((doc, idx) => {
      const refNum = citeIndexByType.drive_document[idx] || '';
      const prefix = refNum ? `[${refNum}] ` : '';
      sections.push([
        `${prefix}Document: ${doc.title || 'Technical Library Document'}`,
        doc.folderName ? `Folder: ${doc.folderName}` : '',
        doc.heading ? `Section Heading: ${doc.heading}` : '',
        doc.workArea ? `Work Area: ${doc.workArea}` : '',
        `Excerpt: ${truncate(doc.content || doc.snippet || '', 750)}`
      ].filter(Boolean).join('\n'));
      sections.push('---');
    });
  }

  if (forumPosts.length > 0) {
    sections.push('=== TACHOS TECHNICAL FORUM EXCERPTS ===');
    forumPosts.forEach((p, idx) => {
      const refNum = citeIndexByType.forum_post[idx] || '';
      const prefix = refNum ? `[${refNum}] ` : '';
      sections.push([
        `${prefix}Topic: ${p.topicTitle || `Topic #${p.topicId}`}`,
        `Author: ${p.author || 'Community member'}`,
        `Content: ${truncate(p.body, 450)}`
      ].join('\n'));
      sections.push('---');
    });
  }

  if (webSources.length > 0 || String(aiWebBrief || '').trim()) {
    sections.push('=== LIVE WEB RESEARCH FINDINGS ===');
    if (String(aiWebBrief || '').trim()) {
      sections.push(`Live Web Synthesis Brief: ${truncate(aiWebBrief, 900)}`);
      sections.push('---');
    }
    webSources.forEach((src, idx) => {
      const refNum = citeIndexByType.web_source[idx] || '';
      const prefix = refNum ? `[${refNum}] ` : '';
      const domain = src.domain || extractDomainSafe(src.url);
      sections.push([
        `${prefix}Title: ${src.title || domain || src.url}`,
        `Domain: ${domain} (${src.sourceType || 'web'})`,
        `URL: ${src.url}`,
        `Snippet: ${truncate(src.snippet || '', 550)}`
      ].join('\n'));
      sections.push('---');
    });
  }

  if (secondaryBriefs.length > 0) {
    sections.push('=== MULTI-AI PEER CROSS-CHECK NOTES (VERIFY AGAINST CITED SOURCES ABOVE) ===');
    for (const item of secondaryBriefs) {
      sections.push(`[Cross-check from ${item.provider} (${item.model})]: ${truncate(item.brief, 600)}`);
      sections.push('---');
    }
  }

  const hasSources =
    articles.length > 0 ||
    documents.length > 0 ||
    forumPosts.length > 0 ||
    webSources.length > 0 ||
    Boolean(String(aiWebBrief || '').trim());

  if (!hasSources) {
    sections.push('No matching KB articles, Technical Library documents, forum posts, or web sources were found. State this honestly and recommend next steps.');
  }

  return sections.join('\n');
}

/**
 * Multi-AI Consultation: queries configured secondary live AI providers in parallel
 * to cross-check technical facts before final synthesis.
 */
export async function consultSecondaryProviders({
  question,
  workArea = '',
  primaryProvider = '',
  contextSummary = '',
  contextPrompt = '',
  env = process.env,
  fetchImpl = globalThis.fetch,
  maxConsults = 2,
  timeoutMs = 12_000
} = {}) {
  const configured = listConfiguredLiveProviders(env).filter((c) => c.provider !== primaryProvider);
  if (configured.length === 0) {
    return { consultations: [], providersUsed: [], combinedBrief: '' };
  }

  // Prefer web-aware / complementary secondary models first
  const preferredOrder = ['perplexity', 'gemini', 'custom_gateway', 'openai', 'xai', 'anthropic'];
  configured.sort((a, b) => preferredOrder.indexOf(a.provider) - preferredOrder.indexOf(b.provider));

  const targets = configured.slice(0, Math.max(1, Number(maxConsults) || 2));
  const contextText = String(contextSummary || contextPrompt || '').trim();
  const prompt = [
    `Question: ${String(question || '').trim()}`,
    workArea ? `Work Area: ${workArea}` : '',
    contextText ? `\nKey Grounded Context:\n${truncate(contextText, 2400)}` : ''
  ].filter(Boolean).join('\n');

  const settled = await Promise.allSettled(
    targets.map(async (cfg) => {
      const brief = await callConfiguredLlm({
        config: cfg,
        systemPrompt: SECONDARY_CONSULT_PROMPT,
        userPrompt: prompt,
        fetchImpl,
        timeoutMs,
        maxTokens: 360
      });
      return {
        provider: cfg.provider,
        model: cfg.model,
        brief
      };
    })
  );

  const consultations = [];
  for (const res of settled) {
    if (res.status === 'fulfilled' && res.value?.brief) {
      consultations.push(res.value);
    }
  }

  return {
    consultations,
    providersUsed: consultations.map((c) => c.provider),
    combinedBrief: consultations.map((c) => `[${c.provider}]: ${c.brief}`).join('\n\n')
  };
}

export async function answerQuestion({
  question,
  workArea = '',
  articles = [],
  documents = [],
  forumPosts = [],
  webSources = [],
  aiWebBrief = '',
  deepResearch = false,
  basePath = '/kb',
  env = process.env,
  fetchImpl = globalThis.fetch
}) {
  const citations = buildCitations({ articles, documents, forumPosts, webSources, basePath });
  const config = resolveProviderConfig(env);

  if (!config.isMock) {
    try {
      const providersUsed = [config.provider];
      let secondaryBriefs = [];

      const multiAiFlag = String(env.TACHOS_MULTI_AI || '').trim();
      const configuredLive = listConfiguredLiveProviders(env);
      const shouldConsultSecondary =
        multiAiFlag !== '0' &&
        (Boolean(deepResearch) || multiAiFlag === '1') &&
        configuredLive.length >= 2;

      const baseContextPrompt = buildContextPrompt({
        question,
        workArea,
        articles,
        documents,
        forumPosts,
        webSources,
        aiWebBrief,
        citations
      });

      if (shouldConsultSecondary) {
        const consulted = await consultSecondaryProviders({
          question,
          workArea,
          primaryProvider: config.provider,
          contextPrompt: baseContextPrompt,
          env,
          fetchImpl
        });
        secondaryBriefs = consulted.consultations;
        for (const p of consulted.providersUsed) {
          if (!providersUsed.includes(p)) providersUsed.push(p);
        }
      }

      const finalPrompt =
        secondaryBriefs.length > 0
          ? buildContextPrompt({
              question,
              workArea,
              articles,
              documents,
              forumPosts,
              webSources,
              aiWebBrief,
              secondaryBriefs,
              citations
            })
          : baseContextPrompt;

      const answer = await callConfiguredLlm({
        config,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: finalPrompt,
        fetchImpl
      });

      return {
        answer,
        mode: 'llm',
        provider: config.provider,
        model: config.model,
        providersUsed,
        deepResearch: Boolean(deepResearch),
        disclaimer: TACHOS_DISCLAIMER,
        citations,
        cta: { ...TACHOS_CTA }
      };
    } catch {
      // Safe fallback to deterministic grounded search without leaking provider secrets.
    }
  }

  const answer = buildExtractiveAnswer({
    question,
    workArea,
    articles,
    documents,
    forumPosts,
    webSources,
    aiWebBrief,
    citations
  });
  return {
    answer,
    mode: 'grounded_search',
    provider: 'grounded_search',
    model: 'extractive-local',
    providersUsed: ['grounded_search'],
    deepResearch: Boolean(deepResearch),
    disclaimer: TACHOS_DISCLAIMER,
    citations,
    cta: { ...TACHOS_CTA }
  };
}

export async function draftKbArticle({
  slug,
  topicTitle,
  topicSummary = '',
  workArea = 'project-delivery',
  workAreaLabel = '1 · Project Delivery',
  sourceUrl = null,
  sourceForumTopicId = null,
  sourceExcerpt = '',
  env = process.env,
  fetchImpl = globalThis.fetch
}) {
  const config = resolveProviderConfig(env);
  const cleanTitle = String(topicTitle || 'Data-Centre Engineering Field Note').trim();
  const cleanSummary = truncate(topicSummary || sourceExcerpt || cleanTitle, 260);

  if (!config.isMock) {
    try {
      const prompt = [
        'Draft a concise UK B2B data-centre engineering Knowledge Base article in JSON with keys:',
        'title (string), summary (string, max 240 chars), standards (array of 2-4 reference strings), deliverables (array of 3-4 strings), checklist (array of 4-6 practical items), body (markdown string).',
        'Do NOT claim standards compliance or certifications. Frame all guidance as working-basis engineering notes pending TACHOS engineer review.',
        '',
        `Source Title: ${cleanTitle}`,
        `Work Area: ${workAreaLabel}`,
        `Source URL: ${sourceUrl || 'N/A'}`,
        `Source Excerpt: ${truncate(sourceExcerpt || topicSummary, 900)}`
      ].join('\n');

      const raw = await callConfiguredLlm({
        config,
        systemPrompt: `${SYSTEM_PROMPT}\nRespond with strict JSON only (no markdown code fences).`,
        userPrompt: prompt,
        fetchImpl
      });
      const stripped = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(stripped);
      if (parsed && typeof parsed.title === 'string' && typeof parsed.body === 'string') {
        const bodyWithBasis = parsed.body.includes('Working basis')
          ? parsed.body
          : `${parsed.body.trim()}\n\n## Working Basis\n${WORKING_BASIS_NOTICE}`;
        return {
          slug,
          title: parsed.title.trim(),
          workArea,
          workAreaLabel,
          status: 'ai_drafted',
          summary: truncate(parsed.summary || cleanSummary, 260),
          standards: Array.isArray(parsed.standards) && parsed.standards.length > 0
            ? parsed.standards.map(String)
            : ['Approved client designs, site specifications, and manufacturer instructions'],
          deliverables: Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0
            ? parsed.deliverables.map(String)
            : ['Site readiness and review record', 'Updated as-built and exception log'],
          checklist: Array.isArray(parsed.checklist) && parsed.checklist.length > 0
            ? parsed.checklist.map(String)
            : ['Review applicability against approved client design and site specification.'],
          body: bodyWithBasis,
          sourceUrl,
          sourceForumTopicId
        };
      }
    } catch {
      // Fall back to deterministic structured draft.
    }
  }

  return {
    slug,
    title: cleanTitle,
    workArea,
    workAreaLabel,
    status: 'ai_drafted',
    summary: `AI-drafted engineering summary (pending TACHOS engineer review): ${cleanSummary}`,
    standards: [
      'Approved client requirements, designs, and site method statements',
      'Equipment-manufacturer installation and testing instructions',
      'BICSI Essentials of Data Center Projects, 1st ed. (2019) — lifecycle reference'
    ],
    deliverables: [
      'Reviewed applicability note against current client specification',
      'Updated risk/change record if design impact is identified',
      'Verification and handover evidence aligned to acceptance plan'
    ],
    checklist: [
      'Review the technical topic against current client designs and approved site specifications.',
      'Confirm manufacturer documentation and hardware/firmware compatibility before site execution.',
      'Record any resulting scope, cabling, power, cooling, or configuration change in the change register.',
      'Verify test evidence and as-built updates prior to handover closeout.'
    ],
    body: [
      '## AI-Drafted Technical Summary (Pending Engineer Verification)',
      cleanSummary,
      '',
      '## Source Context',
      sourceExcerpt ? truncate(sourceExcerpt, 800) : cleanSummary,
      sourceUrl ? `\nReference link: ${sourceUrl}` : '',
      '',
      '## Engineering Review Prompt',
      'Before treating this note as project guidance, a TACHOS engineer should verify site applicability, link budgets/load tolerances, and client acceptance criteria.',
      '',
      '## Working Basis',
      WORKING_BASIS_NOTICE
    ].filter(Boolean).join('\n'),
    sourceUrl,
    sourceForumTopicId
  };
}
