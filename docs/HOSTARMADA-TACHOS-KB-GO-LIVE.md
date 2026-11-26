# HostArmada cPanel Go-Live Runbook — TACHOS AI Technical Knowledge Base

- **Date:** 26/11/2026
- **Entity:** TACHOS LTD (UK Companies House No. 17459934)
- **Domain:** `https://tachos.co.uk/`
- **cPanel User:** `tachosco`
- **Public Web Root:** `/home/tachosco/public_html/` (static Five Works site + untouched `/home/tachosco/public_html/forum/`)
- **Node.js App Root:** `/home/tachosco/apps/tachos-kb` mounted at `https://tachos.co.uk/kb`

> **Safety Guarantee:** Nothing in this runbook or in `.cpanel.yml` modifies `/home/tachosco/public_html/forum/` or its phpBB database. If `/kb` is not yet provisioned or is stopped for maintenance, the homepage automatically falls back to the seeded Five Works reference guides, a direct `/forum/` link, and a pre-filled `mailto:info@tachos.co.uk` site survey fallback so zero commercial enquiries are dropped.

---

## 1. Pre-Deployment Verification

Before enabling the Node.js application in cPanel:

1. Confirm your Git branch (`main` after merging `feat/ai-knowledge-base`) is deployed via **cPanel → Git™ Version Control → Deploy HEAD Commit**.
2. Verify the static homepage and SEO assets are live:
   - `https://tachos.co.uk/` (Five Works entrance, Commercial Trust Strip, Knowledge Base in Five Works Reference Mode, Forum fallback card, Site Survey modal)
   - `https://tachos.co.uk/sitemap.xml`
   - `https://tachos.co.uk/robots.txt`
   - `https://tachos.co.uk/llms.txt`
3. Confirm `/forum/` loads normally with no changes.

---

## 2. Provision the Node.js 22 Application at `/kb`

In **HostArmada cPanel → Software → Setup Node.js App → Create Application**:

| Setting | Value |
| --- | --- |
| **Node.js version** | `22.x` (latest LTS 22 available on the server) |
| **Application mode** | `Production` |
| **Application root** | `apps/tachos-kb` (resolves to `/home/tachosco/apps/tachos-kb`) |
| **Application URL** | `tachos.co.uk` / `kb` |
| **Application startup file** | `app.cjs` |
| **Passenger log file** | `/home/tachosco/apps/tachos-kb/tmp/passenger.log` (optional) |

1. Click **Create**.
2. Once `/home/tachosco/apps/tachos-kb` exists, run **Git™ Version Control → Deploy HEAD Commit** again (or sync `kb/` manually). `.cpanel.yml` will automatically:
   - Sync `kb/` into `/home/tachosco/apps/tachos-kb/` while preserving `data/`, `.env`, `node_modules/`, and `tmp/`.
   - Copy `kb/passenger.cjs` to `/home/tachosco/apps/tachos-kb/app.cjs`.
   - Create `data/` and `tmp/` and touch `tmp/restart.txt`.
3. If `kb/package.json` includes external dependencies, click **Run NPM Install** inside the Node.js App panel (or via SSH/Terminal after activating the virtual environment):
   ```bash
   source /home/tachosco/nodevenv/apps/tachos-kb/22/bin/activate
   cd /home/tachosco/apps/tachos-kb
   npm ci --omit=dev
   ```

---

## 3. Configure Environment Variables (`.env`)

Create `/home/tachosco/apps/tachos-kb/.env` with strict permissions (`chmod 600 .env`) — **never commit `.env` to Git**:

```dotenv
# Core runtime
NODE_ENV=production
TACHOS_BASE_PATH=/kb
TACHOS_PUBLIC_ORIGIN=https://tachos.co.uk
TACHOS_DB_PATH=/home/tachosco/apps/tachos-kb/data/tachos-kb.sqlite

# AI Technical Assistant & Curator (xAI Grok, Anthropic, or OpenAI — auto-detected)
XAI_API_KEY=your-xai-api-key-here
XAI_MODEL=grok-3-mini

# Admin Bearer token for approving AI-drafted articles & viewing commercial enquiries
TACHOS_ADMIN_TOKEN=generate-a-long-random-64-char-hex-secret

# phpBB community bridge (read-only on all boards by default)
TACHOS_FORUM_URL=https://tachos.co.uk/forum

# Optional: enable AI replies & curator briefs strictly on a dedicated AI phpBB board
# TACHOS_AI_BOARD_ID=5
# TACHOS_PHPBB_BOT_USER=TachosAI
# TACHOS_PHPBB_BOT_PASS=your-dedicated-bot-password
# TACHOS_CURATOR_POST_BRIEF=1
# TACHOS_AI_BRIEF_TOPIC_ID=
```

Generate a strong `TACHOS_ADMIN_TOKEN` via cPanel Terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then restart the Passenger application:

```bash
touch /home/tachosco/apps/tachos-kb/tmp/restart.txt
```

Or click **Restart** in **cPanel → Setup Node.js App**.

---

## 4. Smoke-Test Live Endpoints

Run these checks from cPanel Terminal or your workstation:

```bash
# 1. Knowledge Base articles list
curl -fsS https://tachos.co.uk/kb/api/v1/articles | head -c 400

# 2. Grounded Technical Assistant Q&A
curl -fsS -X POST https://tachos.co.uk/kb/api/v1/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"What fibre testing evidence is needed under ISO/IEC 14763-3?","workArea":"cabling"}'

# 3. Native Forum topics feed
curl -fsS 'https://tachos.co.uk/kb/api/v1/forum/topics?limit=8' | head -c 400

# 4. Remote MCP endpoint discovery / health
curl -i https://tachos.co.uk/kb/mcp
```

Then open `https://tachos.co.uk/` in a private browser window and confirm:

- The Five Works hero entrance, wordmark, sprite (`assets/five-works.webp`), music replay/mute button, and rotating headline behave identically to before.
- The Knowledge Base status indicator switches from **Five Works Reference Mode** to **Live Knowledge Base connected**.
- Clicking any guide opens the inline **Article Reader Drawer** with `✓ Engineer Verified` or `✦ AI-Drafted (Pending Review)` badges, deliverables, and checklist.
- The **Technical Forum** section displays native board filter pills and topic cards, and clicking a thread opens the **Forum Thread Reader** with inline replies (when enabled) and the discreet `Open in phpBB ↗` link.
- Submitting **Request a Site Survey / Quote** stores the enquiry and returns a confirmation reference ID.

---

## 5. Optional cPanel Cron Job for the TACHOS Curator Agent

To automatically review new technical forum discussions and draft candidate KB articles (`ai_drafted`, pending human engineer review), add a scheduled job in **cPanel → Advanced → Cron Jobs**:

- **Schedule:** Every 6 hours (`0 */6 * * *`) or once daily (`15 3 * * *`)
- **Command:**

```bash
/bin/bash -lc 'source /home/tachosco/nodevenv/apps/tachos-kb/22/bin/activate && cd /home/tachosco/apps/tachos-kb && node agents/tachos-curator.mjs >> /home/tachosco/apps/tachos-kb/tmp/curator.log 2>&1'
```

All curator-generated entries remain clearly badged **`✦ AI-Drafted (Pending Review)`** until reviewed and approved by a TACHOS engineer via the admin API using `TACHOS_ADMIN_TOKEN`.

---

## 6. SEO, Indexing & Imunify360 / Bot Protection Check

HostArmada shared servers commonly run **Imunify360 WebShield** and **Bot Protection / SplashScreen challenges**. If misconfigured, these can return HTTP `403` or JS challenges to search engines and AI indexers.

1. **Test crawler responses** from outside the server using standard search-bot and plain HTTP requests:
   ```bash
   curl -I https://tachos.co.uk/sitemap.xml
   curl -I https://tachos.co.uk/robots.txt
   curl -I https://tachos.co.uk/llms.txt
   curl -I https://tachos.co.uk/project-delivery.html
   curl -I https://tachos.co.uk/rack-stack.html
   curl -I https://tachos.co.uk/cabling.html
   curl -I https://tachos.co.uk/network.html
   curl -I https://tachos.co.uk/documentation.html
   ```
   All 8 URLs must return `HTTP/2 200` (not `302` challenge redirects or `403`/`503`).
2. **Imunify360 / ModSecurity check (cPanel → Security → ModSecurity / Imunify360):**
   - Confirm verified search crawlers (`Googlebot`, `Bingbot`) are **not** blocked or presented with SplashScreen challenges on `/`, `/*.html`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, and `/forum/`.
   - Confirm ModSecurity does not falsely trigger on JSON `POST` payloads to `/kb/api/v1/ask`, `/kb/api/v1/inquiries`, `/kb/api/v1/forum/topics/*/reply`, or `/kb/mcp`. If any rule ID triggers a false positive, ask HostArmada Support to whitelist that specific rule ID on `/kb/*` only (never disable ModSecurity globally).
3. **Google Search Console:**
   - Verify `https://tachos.co.uk/` (DNS TXT record recommended).
   - Submit `https://tachos.co.uk/sitemap.xml`.
   - Use **URL Inspection → Test Live URL** on the homepage and all 5 service pages (`project-delivery.html`, `rack-stack.html`, `cabling.html`, `network.html`, `documentation.html`) to confirm Google sees the full HTML, JSON-LD `Organization` schema, and canonical URLs without challenge interstitials.

---

## 7. Rollback Procedure

If the `/kb` Node.js app ever needs to be taken offline:

1. Stop the app in **cPanel → Setup Node.js App → Stop App**.
2. The static homepage at `https://tachos.co.uk/` continues operating cleanly with zero broken embeds:
   - Five Works hero entrance and all 5 service pages remain 100% live.
   - Knowledge Base serves the built-in Five Works reference guides and offline Q&A.
   - Forum section shows the warm community card linking directly to `/forum/`.
   - Site Survey modal falls back automatically to pre-filled `mailto:info@tachos.co.uk`.

---

## 8. Google Drive Technical Library Sync, Live Web Research & Multi-AI Setup

The upgraded TACHOS KB indexes a private **Technical Document Library** (SQLite + FTS5 BM25) alongside the Five Works guides and phpBB forum, and combines them with live authoritative web research.

### 8.1 Google Drive Technical Folder Sync (Least-Privilege Service Account)

1. In Google Cloud Console, enable the **Google Drive API** and create a dedicated **Service Account** (e.g. `tachos-kb-sync@<project>.iam.gserviceaccount.com`). Download its JSON key.
2. Upload the key to a private path outside `public_html`, e.g. `/home/tachosco/apps/tachos-kb/data/gdrive-sa.json`, and lock permissions:
   ```bash
   chmod 600 /home/tachosco/apps/tachos-kb/data/gdrive-sa.json
   ```
3. In Google Drive, share **ONLY** your approved engineering/technical folders (Viewer/Read-only) with the Service Account email address. **Never** share finance, HR, payroll, legal, or confidential client credential folders — the ingestor also enforces a built-in technical allowlist and sensitive-file denylist.
4. Add the folder IDs and Service Account path to `/home/tachosco/apps/tachos-kb/.env`:
   ```dotenv
   GOOGLE_SERVICE_ACCOUNT_PATH=/home/tachosco/apps/tachos-kb/data/gdrive-sa.json
   # Or inline JSON: GOOGLE_SERVICE_ACCOUNT_JSON={"client_email":"...","private_key":"..."}
   TACHOS_GDRIVE_FOLDER_IDS=folderId1,folderId2
   # Optional local server technical docs folder:
   # TACHOS_LOCAL_DOCS_DIR=/home/tachosco/apps/tachos-kb/data/local-docs
   ```
5. Schedule an hourly or daily cPanel cron job (**cPanel → Advanced → Cron Jobs**):
   - **Hourly (`10 * * * *`)** or **Daily (`20 2 * * *`)**:
   ```bash
   /bin/bash -lc 'source /home/tachosco/nodevenv/apps/tachos-kb/22/bin/activate && cd /home/tachosco/apps/tachos-kb && node ingest/gdrive-sync.mjs >> /home/tachosco/apps/tachos-kb/tmp/gdrive-sync.log 2>&1'
   ```

### 8.2 Live Web Search & Multi-AI `.env` Keys

Zero-key open-web fallback (**IETF Datatracker/RFCs, Wikipedia, DuckDuckGo Instant Answer**) and **xAI Live Search** (when `XAI_API_KEY` is set) work out of the box. Add any of the optional keys below to `/home/tachosco/apps/tachos-kb/.env` to activate additional search/AI research engines:

```dotenv
# Optional Live Web Search providers (auto-detected when set)
TAVILY_API_KEY=tvly-...
BRAVE_SEARCH_API_KEY=BSA...
SERPER_API_KEY=...
PERPLEXITY_API_KEY=pplx-...

# Optional Multi-AI synthesis / custom OpenAI-compatible gateway
GEMINI_API_KEY=AIza...
TACHOS_CUSTOM_AI_URL=https://your-gateway.example/v1/chat/completions
# TACHOS_CUSTOM_AI_KEY=...
# TACHOS_CUSTOM_AI_MODEL=...

# Set to 0 only if you want to disable automatic web search on thin KB hits
# TACHOS_AUTO_WEB_SEARCH=1
```

Restart the Node.js app after editing `.env` (`touch /home/tachosco/apps/tachos-kb/tmp/restart.txt`) and verify active providers via `GET https://tachos.co.uk/kb/api/v1/status`.

### 8.3 Remote HTTPS Document Push & On-Demand Sync (Admin Bearer)

Both endpoints require `Authorization: Bearer $TACHOS_ADMIN_TOKEN`:

```bash
# Push one or more extracted technical documents (up to 5 MB JSON batch)
curl -fsS -X POST https://tachos.co.uk/kb/api/v1/documents/ingest \
  -H "Authorization: Bearer $TACHOS_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "documents": [
      {
        "title": "MPO-12 Fibre Polarity SOP.md",
        "folderName": "Cabling Standards",
        "workArea": "cabling",
        "mimeType": "text/markdown",
        "text": "# MPO-12 Polarity Verification\nConfirm Type A/B/C trunk polarity and clean all end-faces per IEC 61300-3-35 before OLTS testing."
      }
    ]
  }'

# Trigger an on-demand Google Drive (and optional local folder) sync
curl -fsS -X POST https://tachos.co.uk/kb/api/v1/sync/gdrive \
  -H "Authorization: Bearer $TACHOS_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"maxFiles":100,"dryRun":false}'

# Verify public document index & deep research endpoint
curl -fsS 'https://tachos.co.uk/kb/api/v1/documents?limit=20'
curl -fsS -X POST https://tachos.co.uk/kb/api/v1/research \
  -H 'Content-Type: application/json' \
  -d '{"question":"Best practices for 400G OS2 DR4 link loss budgets and MPO cleanliness?","workArea":"cabling"}'
```

