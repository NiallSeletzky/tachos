import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createStore } from '../store.mjs';
import { createTachosKbServer } from '../server.mjs';
import { createPhpbbClient, parsePhpbbBoards } from '../phpbb-bridge.mjs';
import { classifyWorkArea, parseFeedXml } from '../agents/dc-feeds.mjs';
import { runCurator } from '../agents/tachos-curator.mjs';
import { isAllowedTechnicalFile, extractTextFromBuffer } from '../ingest/extractors.mjs';
import { syncLocalFolder } from '../ingest/gdrive-sync.mjs';
import { isSafePublicUrl, fetchReadableSnippet, researchWeb } from '../research/web-researcher.mjs';

test('TACHOS KB server seeds 5 Engineer Verified + 2 AI-Drafted guides, supports Q&A citations, admin verification, and Site Survey inquiries', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tachos-kb-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dbPath = path.join(dir, 'tachos-kb.db');

  const store = createStore({ dbPath });
  const app = createTachosKbServer({
    store,
    basePath: '/kb',
    adminToken: 'tachos-test-admin-secret',
    env: {},
  });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}/kb`;

  // 1. Status & seeded counts
  const statusRes = await fetch(`${base}/api/v1/status`);
  assert.equal(statusRes.status, 200);
  const status = await statusRes.json();
  assert.equal(status.status, 'ok');
  assert.equal(status.stats.verifiedArticles, 5);
  assert.equal(status.stats.aiDraftedArticles, 2);

  // 2. Article listing, work-area filter, and single article read
  const listRes = await fetch(`${base}/api/v1/articles?workArea=cabling`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.articles.length >= 2);
  const aiDraft = listData.articles.find((a) => a.status === 'ai_drafted');
  assert.ok(aiDraft, 'Expected at least one AI-Drafted cabling checklist');

  // 3. Admin verification workflow (rejects missing/wrong token; upgrades status with Bearer token)
  const unauthVerify = await fetch(`${base}/api/v1/articles/${aiDraft.slug}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ verifiedBy: 'James' }),
  });
  assert.equal(unauthVerify.status, 401);

  const authVerify = await fetch(`${base}/api/v1/articles/${aiDraft.slug}/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: 'Bearer tachos-test-admin-secret',
    },
    body: JSON.stringify({ verifiedBy: 'James (TACHOS Engineering)', status: 'engineer_verified' }),
  });
  assert.equal(authVerify.status, 200);
  const verified = await authVerify.json();
  assert.equal(verified.article.status, 'engineer_verified');
  assert.equal(verified.article.verifiedBy, 'James (TACHOS Engineering)');

  // 4. Grounded Technical Assistant Q&A (/api/v1/ask)
  const askRes = await fetch(`${base}/api/v1/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      question: 'What standards and testing steps apply to fibre cabling and handover?',
      workArea: 'cabling',
    }),
  });
  assert.equal(askRes.status, 200);
  const ask = await askRes.json();
  assert.equal(ask.mode, 'grounded_search');
  assert.ok(ask.citations.length >= 1);
  assert.match(ask.disclaimer, /verify against/i);
  assert.equal(ask.cta.email, 'info@tachos.co.uk');

  // 5. Commercial Site Survey / Quote Inquiry capture + admin listing
  const badInq = await fetch(`${base}/api/v1/inquiries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Alex', email: 'not-an-email', scope: 'Need rack & stack' }),
  });
  assert.equal(badInq.status, 400);

  const okInq = await fetch(`${base}/api/v1/inquiries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex Turner',
      company: 'Slough Colo Partners',
      email: 'alex@example.co.uk',
      workAreas: ['rack-stack', 'cabling'],
      region: 'Slough / London',
      scope: '12 high-density racks with OM4/OS2 trunks and full Fluke handover pack.',
    }),
  });
  assert.equal(okInq.status, 201);
  const inqData = await okInq.json();
  assert.equal(inqData.ok, true);
  assert.ok(inqData.inquiryId);

  const adminInq = await fetch(`${base}/api/v1/inquiries`, {
    headers: { Authorization: 'Bearer tachos-test-admin-secret' },
  });
  assert.equal(adminInq.status, 200);
  const adminInqJson = await adminInq.json();
  assert.equal(adminInqJson.inquiries.length, 1);
  assert.equal(adminInqJson.inquiries[0].company, 'Slough Colo Partners');
});

test('TACHOS phpBB bridge enforces read-only non-AI boards, relays AI-board replies, and Remote MCP (/kb/mcp) works cleanly', async (t) => {
  const boardsHtml =
    '<a href="./viewforum.php?f=2" class="forumtitle">General Data Centre Engineering</a>' +
    '<a href="./viewforum.php?f=5" class="forumtitle">AI Technical Desk</a>';
  assert.equal(parsePhpbbBoards(boardsHtml).length, 2);

  const topics = new Map([
    [
      2,
      [{ id: 20, title: 'Containment airflow notes', posts: [{ id: 201, author: 'Engineer1', body: 'Check blanking panels.' }] }],
    ],
    [
      5,
      [{ id: 50, title: 'OM4 MPO polarity check', posts: [{ id: 501, author: 'James', body: 'Method A vs Method B trunks.' }] }],
    ],
  ]);
  const writes = [];
  let nextPostId = 900;

  const phpbbStub = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const params = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    const u = new URL(req.url, 'http://127.0.0.1');

    if (u.pathname === '/index.php') return res.end(boardsHtml);
    if (u.pathname === '/ucp.php' && u.searchParams.get('mode') === 'login') {
      if (req.method === 'GET') return res.end('<form id="login" action="./ucp.php?mode=login"><input type="hidden" name="form_token" value="lt"></form>');
      res.writeHead(200, { 'content-type': 'text/html', 'set-cookie': 'sid=tachos; Path=/' });
      return res.end('<a href="ucp.php?mode=logout">Logout [ TachosAI ]</a>');
    }
    if (u.pathname === '/viewforum.php') {
      const f = Number(u.searchParams.get('f'));
      const list = topics.get(f) || [];
      return res.end(list.map((tp) => `<a href="./viewtopic.php?f=${f}&amp;t=${tp.id}" class="topictitle">${tp.title}</a>`).join('\n'));
    }
    if (u.pathname === '/viewtopic.php') {
      const tid = Number(u.searchParams.get('t'));
      const tp = [...topics.values()].flat().find((x) => x.id === tid);
      const blocks = (tp?.posts || [])
        .map((p) => `<div id="p${p.id}" class="post"><a class="username">${p.author}</a><div class="content">${p.body}</div></div>`)
        .join('\n');
      return res.end(`<h2 class="topic-title">${tp?.title || ''}</h2>${blocks}`);
    }
    if (u.pathname === '/posting.php') {
      const f = Number(u.searchParams.get('f'));
      const tid = Number(u.searchParams.get('t'));
      if (req.method === 'GET') {
        return res.end(
          `<form id="postform" action="./posting.php?mode=reply&amp;f=${f}&amp;t=${tid}">` +
            `<input type="hidden" name="form_token" value="pt">` +
            `<input type="hidden" name="creation_time" value="1700000000"></form>`
        );
      }
      writes.push(f);
      const pid = nextPostId++;
      const tp = (topics.get(f) || []).find((x) => x.id === tid);
      tp.posts.push({ id: pid, author: 'TachosAI', body: params.get('message') });
      return res.end(`<div id="p${pid}" class="post">Posted</div>`);
    }
    res.writeHead(404);
    res.end();
  });

  phpbbStub.listen(0, '127.0.0.1');
  await once(phpbbStub, 'listening');
  t.after(() => new Promise((resolve) => phpbbStub.close(resolve)));
  const stubForumUrl = `http://127.0.0.1:${phpbbStub.address().port}`;

  const store = createStore({ dbPath: ':memory:' });
  const app = createTachosKbServer({
    store,
    basePath: '/kb',
    forumUrl: stubForumUrl,
    aiBoardId: '5',
    liveEnabled: true,
    forumClientFactory: () =>
      createPhpbbClient({
        forumBaseUrl: stubForumUrl,
        botUsername: 'TachosAI',
        botPassword: 'test-password',
        formDelayMs: 0,
      }),
    env: {},
  });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}/kb`;

  // Forum boards & topics
  const boardsRes = await fetch(`${base}/api/v1/forum/boards`);
  assert.equal(boardsRes.status, 200);
  const boards = await boardsRes.json();
  assert.equal(boards.boards.length, 2);

  // Blocked write on non-AI board f=2
  const blocked = await fetch(`${base}/api/v1/forum/topics/20/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ authorName: 'James', message: 'Should be rejected on f=2', boardId: '2' }),
  });
  assert.equal(blocked.status, 403);

  // Allowed write on AI board f=5
  const allowed = await fetch(`${base}/api/v1/forum/topics/50/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ authorName: 'James', message: 'Method B keeps polarity clean on MPO-12.', boardId: '5' }),
  });
  assert.equal(allowed.status, 201);
  assert.deepEqual(writes, [5]);

  // Remote MCP Streamable HTTP (/kb/mcp)
  const rpc = async (body) => {
    const r = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    return { status: r.status, json: text ? JSON.parse(text) : null };
  };

  const init = await rpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
  });
  assert.equal(init.status, 200);
  assert.equal(init.json.result.serverInfo.name, 'tachos-technical-kb');

  const notif = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(notif.status, 202);

  const tools = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal(tools.json.result.tools.length, 7);

  const searchCall = await rpc({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'search_knowledge_base', arguments: { q: 'cabling' } },
  });
  assert.equal(searchCall.json.result.isError, false);
  assert.ok(searchCall.json.result.structuredContent.articles.length >= 1);

  const resRead = await rpc({
    jsonrpc: '2.0',
    id: 4,
    method: 'resources/read',
    params: { uri: 'tachos://llms.txt' },
  });
  assert.match(resRead.json.result.contents[0].text, /TACHOS/);
});

test('Industry feed parser and TACHOS curator draft AI-Drafted guides without overwriting Engineer Verified guides', async (t) => {
  const sampleRss = `<rss><channel><item>
      <title>800G OS2 Single-Mode Optical Links for High-Density AI Data Centres</title>
      <link>https://example.org/800g-optics</link>
      <description>Practical fibre loss budget and MPO cleanliness notes for 800G deployments.</description>
    </item></channel></rss>`;
  const rss = parseFeedXml(sampleRss, 'Data Center Dynamics');
  assert.equal(rss.length, 1);
  const cls = classifyWorkArea(`${rss[0].title} ${rss[0].summary}`);
  assert.equal(cls.workArea, 'cabling');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tachos-curator-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dbPath = path.join(dir, 'tachos-kb.db');

  const result = await runCurator({
    dbPath,
    skipForumSync: true,
    skipForumPost: true,
    fetchImpl: async (url) => {
      if (String(url).includes('algolia')) {
        return new Response(JSON.stringify({ hits: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(sampleRss, {
        status: 200,
        headers: { 'content-type': 'application/xml' },
      });
    },
    env: {},
  });

  assert.ok(result.draftedArticleSlug, 'Curator should draft 1 AI-Drafted KB article');

  // Confirm newly drafted guide is ai_drafted and all 5 original Engineer Verified guides remain untouched
  const store = createStore({ dbPath });
  const drafted = store.getArticleBySlug(result.draftedArticleSlug);
  assert.equal(drafted.status, 'ai_drafted');
  const verified = store.listArticles({ status: 'engineer_verified' });
  assert.equal(verified.length, 5);
  store.close();
});

test('Technical Library ingestion enforces privacy denylist, indexes chunks in SQLite FTS5, and cites Drive docs in /ask and MCP', async (t) => {
  // 1. Privacy denylist checks
  assert.equal(isAllowedTechnicalFile({ name: 'TACHOS-October-invoice-review.md', mimeType: 'text/markdown' }).allowed, false);
  assert.equal(isAllowedTechnicalFile({ name: 'Billing-Ledger.csv', path: 'ChatGPT/TACHOS-Billing', mimeType: 'text/csv' }).allowed, false);
  assert.equal(isAllowedTechnicalFile({ name: 'Cisco Certified Network Associate certificate.pdf', mimeType: 'application/pdf' }).allowed, false);
  assert.equal(isAllowedTechnicalFile({ name: '._COURSE SLIDES.pdf', mimeType: 'application/pdf' }).allowed, false);
  assert.equal(isAllowedTechnicalFile({ name: 'BGP.docx', path: 'CISCO/BGP.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }).allowed, true);
  assert.equal(isAllowedTechnicalFile({ name: 'Data-Center-Cabling-Standards-Guide-2026.md', mimeType: 'text/markdown' }).allowed, true);

  // 2. Local drop-folder sync + incremental skip + denylist enforcement
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tachos-ingest-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const docsDir = path.join(dir, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(
    path.join(docsDir, 'bgp-evpn-notes.md'),
    '# Cisco BGP EVPN VXLAN Fabric Notes\n\nConfigure eBGP underlay with BFD timers at 50ms x 3 and spine-leaf ECMP over 400G OS2 trunks.\n\n## Route Reflectors\nUse Anycast Gateway IRB with symmetric IRB VRF VNI mapping and verify neighbour state with show bgp l2vpn evpn summary.\n',
  );
  fs.writeFileSync(path.join(docsDir, 'client-invoice-2026.md'), 'Confidential billing invoice £12,000');
  fs.writeFileSync(path.join(docsDir, '._hidden.md'), 'macOS AppleDouble metadata');

  const store = createStore({ dbPath: path.join(dir, 'tachos-kb.db') });
  const sync1 = await syncLocalFolder({ store, dirPath: docsDir, folderLabel: 'CISCO' });
  assert.equal(sync1.ingested, 1);
  assert.equal(sync1.rejected, 2);

  // Second run skips unchanged file
  const sync2 = await syncLocalFolder({ store, dirPath: docsDir, folderLabel: 'CISCO' });
  assert.equal(sync2.skipped, 1);
  assert.equal(sync2.ingested, 0);

  // 3. HTTP Admin /api/v1/documents/ingest + /api/v1/documents + /api/v1/ask citing drive_document + MCP search_technical_documents
  const app = createTachosKbServer({
    store,
    basePath: '/kb',
    adminToken: 'tachos-ingest-secret',
    env: { TACHOS_AUTO_WEB_SEARCH: '0' },
  });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(async () => {
    await app.close();
  });
  const baseUrl = `http://127.0.0.1:${app.server.address().port}/kb`;

  // Unauthenticated ingest rejected
  const unauthRes = await fetch(`${baseUrl}/api/v1/documents/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Test.md', text: 'Should fail without token' }),
  });
  assert.equal(unauthRes.status, 401);

  // Authenticated batch ingest (1 valid technical doc + 1 rejected billing doc)
  const ingestRes = await fetch(`${baseUrl}/api/v1/documents/ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer tachos-ingest-secret',
    },
    body: JSON.stringify({
      documents: [
        {
          externalId: 'gdrive:netbotz-1',
          source: 'gdrive',
          folderName: 'TACHOS DATA CENTER',
          title: 'Netbotz.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          text: '# NetBotz Rack Environmental Monitoring\n\nInstall NetBotz temperature and humidity sensors at top, middle, and bottom front intake of high-density AI racks plus door contact switches and leak rope below CRAC units.\n',
        },
        {
          externalId: 'gdrive:bad-invoice',
          source: 'gdrive',
          folderName: 'Accounting',
          title: 'October-Invoice.md',
          text: 'Private invoice should be rejected',
        },
      ],
    }),
  });
  assert.equal(ingestRes.status, 201);
  const ingestData = await ingestRes.json();
  assert.equal(ingestData.ingested, 1);
  assert.equal(ingestData.rejected, 1);

  // Public /api/v1/documents lists both technical docs
  const docsRes = await fetch(`${baseUrl}/api/v1/documents`);
  assert.equal(docsRes.status, 200);
  const docsData = await docsRes.json();
  assert.equal(docsData.documents.length, 2);

  // /api/v1/ask retrieves NetBotz from Technical Library chunks
  const askRes = await fetch(`${baseUrl}/api/v1/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      question: 'Where should NetBotz rack temperature sensors and leak rope be placed?',
      workArea: 'rack-stack',
      webSearch: false,
    }),
  });
  assert.equal(askRes.status, 200);
  const askData = await askRes.json();
  assert.ok(askData.documentHits >= 1, 'Expected Technical Library document hits');
  assert.ok(
    askData.citations.some((c) => c.type === 'drive_document' && /Netbotz/i.test(c.title)),
    'Expected drive_document citation for Netbotz.docx',
  );

  // MCP search_technical_documents returns BGP EVPN chunk
  const mcpRes = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: { name: 'search_technical_documents', arguments: { query: 'BGP EVPN VXLAN BFD' } },
    }),
  });
  assert.equal(mcpRes.status, 200);
  const mcpData = await mcpRes.json();
  assert.equal(mcpData.result.isError, false);
  assert.ok(mcpData.result.structuredContent.documents.length >= 1);
  assert.match(mcpData.result.structuredContent.documents[0].title, /bgp-evpn/i);
});

test('Live web research enforces SSRF and anti-bot safety, caches results, supports multi-AI /api/v1/research and MCP deep_technical_research', async (t) => {
  // 1. SSRF URL guard
  assert.equal(isSafePublicUrl('http://127.0.0.1:8080/admin'), false);
  assert.equal(isSafePublicUrl('http://169.254.169.254/latest/meta-data/'), false);
  assert.equal(isSafePublicUrl('http://10.0.0.1/internal'), false);
  assert.equal(isSafePublicUrl('file:///etc/passwd'), false);
  assert.equal(isSafePublicUrl('https://datatracker.ietf.org/doc/rfc7432/'), true);

  // 2. Anti-bot / challenge HTML is rejected cleanly (never bypassed)
  const blockedSnippet = await fetchReadableSnippet('https://example.org/protected', {
    fetchImpl: async () =>
      new Response('<html><body>One moment, please... Imunify360 verify you are human</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
  });
  assert.equal(blockedSnippet, null);

  // 3. Mocked Tavily + Perplexity + IETF web research + SQLite cache + /api/v1/research
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tachos-research-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore({ dbPath: path.join(dir, 'tachos-kb.db') });

  let fetchCount = 0;
  const mockFetch = async (url) => {
    fetchCount += 1;
    const u = String(url);
    if (u.includes('api.tavily.com')) {
      return new Response(
        JSON.stringify({
          answer: 'RFC 7432 defines BGP MPLS-Based Ethernet VPN (EVPN) for data centre fabric overlays.',
          results: [
            {
              title: 'RFC 7432: BGP MPLS-Based Ethernet VPN',
              url: 'https://datatracker.ietf.org/doc/html/rfc7432',
              content: 'Standard EVPN control plane for MAC/IP mobility in multi-tenant data centres.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (u.includes('api.perplexity.ai')) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'EVPN-VXLAN uses BGP Type-2 and Type-5 routes with symmetric IRB for scalable leaf-spine fabrics.',
              },
            },
          ],
          citations: ['https://www.cisco.com/c/en/us/products/collateral/switches/nexus-9000-series-switches/evpn-vxlan.html'],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (u.includes('api.x.ai')) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'In data centre leaf-spine fabrics, BGP EVPN-VXLAN (RFC 7432 / RFC 8365) [1] provides control-plane MAC learning and multi-homing.',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ objects: [], query: { search: [] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const env = {
    TAVILY_API_KEY: 'tvly-test',
    PERPLEXITY_API_KEY: 'pplx-test',
    XAI_API_KEY: 'xai-test',
    TACHOS_XAI_LIVE_SEARCH: '0',
    TACHOS_MULTI_AI: '1',
  };

  const r1 = await researchWeb({
    question: 'Explain BGP EVPN VXLAN leaf-spine fabric design',
    workArea: 'network',
    env,
    fetchImpl: mockFetch,
    store,
  });
  assert.equal(r1.cached, false);
  assert.ok(r1.webSources.length >= 2);
  assert.ok(r1.providersUsed.includes('tavily'));
  assert.ok(r1.providersUsed.includes('perplexity'));

  // Cache hit avoids redundant upstream calls
  const countBeforeCache = fetchCount;
  const r2 = await researchWeb({
    question: 'Explain BGP EVPN VXLAN leaf-spine fabric design',
    workArea: 'network',
    env,
    fetchImpl: mockFetch,
    store,
  });
  assert.equal(r2.cached, true);
  assert.equal(fetchCount, countBeforeCache);

  // Full /api/v1/research HTTP endpoint + MCP deep_technical_research
  const app = createTachosKbServer({
    store,
    basePath: '/kb',
    env,
    fetchImpl: mockFetch,
  });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(async () => {
    await app.close();
  });
  const baseUrl = `http://127.0.0.1:${app.server.address().port}/kb`;

  const resHttp = await fetch(`${baseUrl}/api/v1/research`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      question: 'Explain BGP EVPN VXLAN leaf-spine fabric design',
      workArea: 'network',
    }),
  });
  assert.equal(resHttp.status, 200);
  const resData = await resHttp.json();
  assert.ok(resData.webSources.length >= 2);
  assert.ok(resData.citations.some((c) => c.type === 'web_source'));
  assert.ok(resData.providersUsed.length >= 1);

  const mcpDeep = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'deep_technical_research',
        arguments: { question: 'Explain BGP EVPN VXLAN leaf-spine fabric design', workArea: 'network' },
      },
    }),
  });
  assert.equal(mcpDeep.status, 200);
  const mcpDeepData = await mcpDeep.json();
  assert.equal(mcpDeepData.result.isError, false);
  assert.ok(mcpDeepData.result.structuredContent.webSources.length >= 2);
});

