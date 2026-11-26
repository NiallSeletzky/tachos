import { WORKING_BASIS_NOTICE } from './store.mjs';

export const TACHOS_DISCLAIMER =
  'AI-assisted technical reference based on TACHOS guides and community threads. Verify against approved client designs, site standards, and manufacturer instructions.';

export const TACHOS_CTA = Object.freeze({
  label: 'Request a TACHOS Site Survey / Quote',
  email: 'info@tachos.co.uk'
});

const SYSTEM_PROMPT = [
  'You are the TACHOS LTD Technical Knowledge Base Assistant for UK B2B data-centre and network infrastructure engineering.',
  'Tone: concise, practical, commercially credible British English.',
  'Rules:',
  '- Ground every answer strictly in the provided TACHOS Knowledge Base guides and synced community forum excerpts.',
  '- Explicitly distinguish Engineer-Verified TACHOS guides from AI-Drafted checklists and community forum posts.',
  '- NEVER claim formal standards compliance, accreditation, or certifications; frame standards (ISO/IEC 22237, ISO/IEC 11801, ISO/IEC 14763-3, IEEE 802.3, BICSI 1st ed. 2019) honestly as references/working-basis guidance subject to approved client designs, site specifications, and manufacturer instructions.',
  '- Never fabricate test thresholds, serial numbers, or vendor part numbers not present in the context.',
  '- Keep answers crisp and actionable (short paragraphs or bullet points).'
].join('\n');

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

  const anthropicKey = String(env.ANTHROPIC_API_KEY || '').trim();
  const xaiKey = String(env.XAI_API_KEY || '').trim();
  const openaiKey = String(env.OPENAI_API_KEY || '').trim();

  if (requested === 'anthropic' || (requested === 'auto' && anthropicKey)) {
    if (anthropicKey) {
      return {
        provider: 'anthropic',
        model: explicitModel || String(env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim(),
        isMock: false,
        apiKey: anthropicKey,
        baseUrl: String(env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '')
      };
    }
  }

  if (requested === 'xai' || requested === 'grok' || (requested === 'auto' && xaiKey)) {
    if (xaiKey) {
      return {
        provider: 'xai',
        model: explicitModel || String(env.XAI_MODEL || 'grok-3-mini').trim(),
        isMock: false,
        apiKey: xaiKey,
        baseUrl: String(env.XAI_BASE_URL || 'https://api.x.ai/v1').replace(/\/+$/, '')
      };
    }
  }

  if (requested === 'openai' || (requested === 'auto' && openaiKey)) {
    if (openaiKey) {
      return {
        provider: 'openai',
        model: explicitModel || String(env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
        isMock: false,
        apiKey: openaiKey,
        baseUrl: String(env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
      };
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
  return { provider, model, isMock };
}

function truncate(text, maxLen = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

export function buildCitations({ articles = [], forumPosts = [], basePath = '/kb' } = {}) {
  const citations = [];
  const normalizedBase = basePath ? `/${String(basePath).replace(/^\/+|\/+$/g, '')}` : '';

  for (const article of articles) {
    citations.push({
      type: 'kb_article',
      title: article.title,
      url: article.sourceUrl || `${normalizedBase}/api/v1/articles/${encodeURIComponent(article.slug)}`,
      status: article.status === 'engineer_verified' ? 'engineer_verified' : 'ai_drafted',
      excerpt: truncate(article.summary || article.body, 220)
    });
  }

  for (const post of forumPosts) {
    citations.push({
      type: 'forum_post',
      title: post.topicTitle || `Forum Topic #${post.topicId}`,
      url: post.url || post.topicUrl || 'https://tachos.co.uk/forum/',
      status: 'forum',
      excerpt: truncate(post.body, 220)
    });
  }

  return citations;
}

function buildExtractiveAnswer({ question, workArea, articles = [], forumPosts = [] }) {
  if (articles.length === 0 && forumPosts.length === 0) {
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

  const lines = [];
  const primary = articles[0];
  if (primary) {
    const badge = primary.status === 'engineer_verified' ? 'Engineer-Verified Guide' : 'AI-Drafted Checklist (Pending Engineer Verification)';
    lines.push(`**${primary.title}** (${badge} · ${primary.workAreaLabel})`);
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
    for (const extra of articles.slice(1, 3)) {
      const tag = extra.status === 'engineer_verified' ? 'Engineer-Verified' : 'AI-Drafted';
      lines.push(`- ${extra.title} (${tag}): ${truncate(extra.summary, 160)}`);
    }
  }

  if (forumPosts.length > 0) {
    lines.push('');
    lines.push('**Related community forum notes:**');
    for (const post of forumPosts.slice(0, 2)) {
      const who = post.author ? ` (${post.author})` : '';
      lines.push(`- ${post.topicTitle || `Topic #${post.topicId}`}${who}: ${truncate(post.body, 160)}`);
    }
  }

  return lines.join('\n');
}

async function callConfiguredLlm({ config, systemPrompt, userPrompt, fetchImpl = globalThis.fetch, timeoutMs = 15_000 }) {
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
        max_tokens: 700,
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

  // OpenAI and xAI Grok both implement the OpenAI Chat Completions wire protocol.
  const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      max_tokens: 700,
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
  const text = String(payload?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error(`${config.provider} returned empty content`);
  return text;
}

function buildContextPrompt({ question, workArea, articles, forumPosts }) {
  const sections = [];
  sections.push(`Question: ${question.trim()}`);
  if (workArea) sections.push(`Requested work area filter: ${workArea}`);
  sections.push('');

  if (articles.length > 0) {
    sections.push('=== TACHOS KNOWLEDGE BASE GUIDES ===');
    for (const a of articles) {
      sections.push([
        `Title: ${a.title}`,
        `Status: ${a.status}`,
        `Work Area: ${a.workAreaLabel}`,
        `Summary: ${a.summary}`,
        `Standards: ${(a.standards || []).join('; ')}`,
        `Checklist: ${(a.checklist || []).join(' | ')}`,
        `Deliverables: ${(a.deliverables || []).join(' | ')}`,
        `Body Excerpt: ${truncate(a.body, 700)}`
      ].join('\n'));
      sections.push('---');
    }
  }

  if (forumPosts.length > 0) {
    sections.push('=== TACHOS TECHNICAL FORUM EXCERPTS ===');
    for (const p of forumPosts) {
      sections.push([
        `Topic: ${p.topicTitle || `Topic #${p.topicId}`}`,
        `Author: ${p.author || 'Community member'}`,
        `Content: ${truncate(p.body, 450)}`
      ].join('\n'));
      sections.push('---');
    }
  }

  if (articles.length === 0 && forumPosts.length === 0) {
    sections.push('No matching KB articles or forum posts were found. State this honestly and recommend next steps.');
  }

  return sections.join('\n');
}

export async function answerQuestion({
  question,
  workArea = '',
  articles = [],
  forumPosts = [],
  basePath = '/kb',
  env = process.env,
  fetchImpl = globalThis.fetch
}) {
  const citations = buildCitations({ articles, forumPosts, basePath });
  const config = resolveProviderConfig(env);

  if (!config.isMock) {
    try {
      const userPrompt = buildContextPrompt({ question, workArea, articles, forumPosts });
      const answer = await callConfiguredLlm({
        config,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        fetchImpl
      });
      return {
        answer,
        mode: 'llm',
        disclaimer: TACHOS_DISCLAIMER,
        citations,
        cta: { ...TACHOS_CTA }
      };
    } catch {
      // Safe fallback to deterministic grounded search without leaking provider secrets.
    }
  }

  const answer = buildExtractiveAnswer({ question, workArea, articles, forumPosts });
  return {
    answer,
    mode: 'grounded_search',
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
