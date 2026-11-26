import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStore, getWorkAreaLabel } from '../store.mjs';
import { draftKbArticle, TACHOS_DISCLAIMER } from '../llm.mjs';
import { createForumBridge } from '../phpbb-bridge.mjs';
import { classifyWorkArea, fetchIndustryFeeds } from './dc-feeds.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KB_ROOT = path.resolve(__dirname, '..');

function loadEnvIfPresent(envPath = path.join(KB_ROOT, '.env')) {
  if (!fs.existsSync(envPath)) return false;
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (Object.prototype.hasOwnProperty.call(process.env, key) && process.env[key] !== '') continue;
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
    return true;
  } catch {
    return false;
  }
}

export function slugify(text, prefix = 'draft') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || `${prefix}-${Date.now()}`;
}

export async function runCurator(options = {}) {
  loadEnvIfPresent(options.envPath);
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const ownsStore = !options.store;
  const store = options.store ?? createStore({ dbPath: options.dbPath ?? env.TACHOS_DB_PATH });
  const forumBridge = options.forumBridge ?? createForumBridge({
    store,
    forumBaseUrl: options.forumBaseUrl ?? env.TACHOS_FORUM_URL ?? 'https://tachos.co.uk/forum',
    aiBoardId: options.aiBoardId ?? env.TACHOS_AI_BOARD_ID ?? '',
    botUsername: options.botUsername ?? env.TACHOS_PHPBB_BOT_USER ?? '',
    botPassword: options.botPassword ?? env.TACHOS_PHPBB_BOT_PASS ?? '',
    liveEnabled: options.liveEnabled,
    forumClientFactory: options.forumClientFactory,
    fetchImpl
  });

  const summary = {
    ranAt: new Date().toISOString(),
    forumBoardsSynced: 0,
    forumTopicsSynced: 0,
    forumPostsSynced: 0,
    feedItemsFetched: 0,
    draftedArticleSlug: null,
    forumBriefPosted: false,
    warnings: []
  };

  try {
    // 1. Ingest public forum boards, recent topics, and posts into tachos-kb.db
    if (options.skipForumSync !== true) {
      try {
        const boardsRes = await forumBridge.listBoards();
        const boards = boardsRes.boards || [];
        summary.forumBoardsSynced = boards.length;

        const topicsRes = await forumBridge.listTopics({ limit: options.maxTopicsToSync ?? 15 });
        const topics = topicsRes.topics || [];
        summary.forumTopicsSynced = topics.length;

        let postCount = 0;
        for (const topic of topics.slice(0, options.maxTopicDetails ?? 8)) {
          const detail = await forumBridge.getTopic(topic.id);
          postCount += (detail.posts || []).length;
        }
        summary.forumPostsSynced = postCount;
      } catch (err) {
        summary.warnings.push(`Forum sync skipped: ${err.message}`);
      }
    }

    // 2. Scan data-centre & networking industry feeds
    let feedItems = [];
    if (options.skipFeeds !== true) {
      const feedRes = await fetchIndustryFeeds({
        fetchImpl,
        includeX: Boolean(env.X_BEARER_TOKEN),
        xBearerToken: env.X_BEARER_TOKEN || ''
      });
      feedItems = feedRes.items || [];
      summary.feedItemsFetched = feedItems.length;
      if (Array.isArray(feedRes.warnings) && feedRes.warnings.length > 0) {
        summary.warnings.push(...feedRes.warnings);
      }
    }

    // 3. Pick 1 fresh candidate (preferring newly synced forum threads, then fresh industry items)
    const candidates = [];
    const recentForumTopics = store.listForumTopics({ limit: 15 });
    for (const topic of recentForumTopics) {
      const posts = store.listForumPosts(topic.id);
      const firstBody = posts[0]?.body || topic.excerpt || topic.title;
      const { workArea } = classifyWorkArea(`${topic.title} ${firstBody}`);
      candidates.push({
        slug: slugify(`forum-${topic.title}`, `forum-${topic.id}`),
        topicTitle: topic.title,
        topicSummary: firstBody.slice(0, 260),
        sourceExcerpt: posts.slice(0, 3).map((p) => `${p.author}: ${p.body}`).join('\n\n'),
        workArea,
        sourceUrl: topic.url || null,
        sourceForumTopicId: topic.id
      });
    }

    for (const item of feedItems) {
      candidates.push({
        slug: slugify(`brief-${item.title}`, 'brief'),
        topicTitle: item.title,
        topicSummary: item.summary || item.title,
        sourceExcerpt: `${item.source}: ${item.summary || item.title}`,
        workArea: item.workArea || 'project-delivery',
        sourceUrl: item.url || null,
        sourceForumTopicId: null
      });
    }

    const freshCandidate = candidates.find((c) => !store.getArticleBySlug(c.slug));

    let draftedArticle = null;
    if (freshCandidate) {
      const articleDraft = await draftKbArticle({
        slug: freshCandidate.slug,
        topicTitle: freshCandidate.topicTitle,
        topicSummary: freshCandidate.topicSummary,
        workArea: freshCandidate.workArea,
        workAreaLabel: getWorkAreaLabel(freshCandidate.workArea),
        sourceUrl: freshCandidate.sourceUrl,
        sourceForumTopicId: freshCandidate.sourceForumTopicId,
        sourceExcerpt: freshCandidate.sourceExcerpt,
        env,
        fetchImpl
      });
      draftedArticle = store.upsertArticle(articleDraft, { allowDowngradeVerified: false });
      summary.draftedArticleSlug = draftedArticle.slug;
    }

    // 4. Optionally post clearly labeled TACHOS AI Technical Assistant brief on TACHOS_AI_BOARD_ID
    const shouldPostBrief = options.postToForum === true || env.TACHOS_CURATOR_POST_BRIEF === '1';
    const aiBoardId = String(options.aiBoardId ?? env.TACHOS_AI_BOARD_ID ?? '').trim();
    const targetTopicId = String(options.targetTopicId ?? env.TACHOS_AI_BRIEF_TOPIC_ID ?? '').trim();

    if (shouldPostBrief && draftedArticle && aiBoardId && targetTopicId) {
      const publicOrigin = String(env.TACHOS_PUBLIC_ORIGIN || 'https://tachos.co.uk').replace(/\/+$/, '');
      const basePath = String(env.TACHOS_BASE_PATH ?? '/kb').replace(/\/+$/, '');
      const briefMessage = [
        '[TACHOS AI Technical Assistant — Automated Technical Brief]',
        '',
        `New AI-Drafted KB Guide (pending engineer verification): ${draftedArticle.title}`,
        `Work Area: ${draftedArticle.workAreaLabel}`,
        `Summary: ${draftedArticle.summary}`,
        `Review in Knowledge Base: ${publicOrigin}${basePath}/api/v1/articles/${encodeURIComponent(draftedArticle.slug)}`,
        '',
        TACHOS_DISCLAIMER
      ].join('\n');

      try {
        await forumBridge.replyToTopic({
          topicId: targetTopicId,
          boardId: aiBoardId,
          message: briefMessage
        });
        summary.forumBriefPosted = true;
      } catch (err) {
        summary.warnings.push(`Forum brief not posted (${err.code || 'error'}): ${err.message}`);
      }
    }

    store.recordCuratorRun(summary);
    return summary;
  } finally {
    if (ownsStore) {
      store.close();
    }
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  runCurator()
    .then((summary) => {
      process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    })
    .catch((err) => {
      process.stderr.write(`TACHOS curator failed: ${err.message}\n`);
      process.exitCode = 1;
    });
}
