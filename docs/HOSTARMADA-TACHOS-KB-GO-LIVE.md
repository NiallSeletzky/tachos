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
TACHOS_SITE_ORIGIN=https://tachos.co.uk
TACHOS_DATA_DIR=/home/tachosco/apps/tachos-kb/data

# AI Technical Assistant & Curator (xAI / Grok or compatible provider)
XAI_API_KEY=your-xai-api-key-here
XAI_MODEL=grok-3-mini

# Admin token for approving AI-drafted articles & viewing commercial enquiries
TACHOS_ADMIN_TOKEN=generate-a-long-random-64-char-hex-secret

# Optional phpBB bridge settings (if overriding defaults)
TACHOS_FORUM_URL=https://tachos.co.uk/forum
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
