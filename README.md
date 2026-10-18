# TACHOS LTD — Website source

Current reference release: **18 October 2026** — five-heroes website with multilingual heading and consistent typography, stage introductions, homepage forum integration and copyright notice.

## Structure

- `index.html`: five clickable heroes, original light/music interaction, forum embedded **below** the heroes, common company footer.
- `project-delivery.html`, `rack-stack.html`, `cabling.html`, `network.html`, `documentation.html`: the five service reference pages.
- `assets/five-works.webp`: original five-hero sprite used by the site. **Required**; do not replace with a lookalike.
- `styles.css` and `app.js`: site's Tachitude theme and hero interactions.
- `tachos-forum-home.css` and `tachos-forum-home.js`: scoped phpBB iframe integration.
- `headline-rotation.js`: 10-second English/Chinese/Spanish heading rotation, disabled under reduced-motion preference.
- `ASSET_RIGHTS.md`: provenance/licensing record (illustration rights not yet verified).
- `control-room-prototype.html`: reserved prototype link (not an authorised client document portal).

## Deployment to HostArmada

The repository does **not** contain the live phpBB application, forum database, credentials, private files, or hosting configuration. Keep `/forum/` and its database untouched.

The cPanel-managed checkout is at `/home/tachosco/repositories/tachos`; the previously confirmed website document root is `/home/tachosco/public_html`.
The checked-in `.cpanel.yml` is an **explicit allowlist** of public frontend files. Its deployment tasks copy updated files into the document root without deleting other directories; particularly **do not touch `/forum/`**. These paths must be rechecked in cPanel if the domain document root changes.

1. Back up the **currently deployed** `public_html` and any existing HostArmada phpBB data separately.
2. In cPanel → **Git Version Control → Manage → Pull or Deploy**, click **Update from Remote**, then **Deploy HEAD Commit**. This is manual pull deployment; GitHub commits do not automatically publish.
3. Ensure `assets/five-works.webp` exists and matches the approved artwork.
4. **Set up and maintain phpBB separately** at `/forum/`, including its database and backups. The repository does not contain phpBB application files, credentials or database.
5. Confirm `/forum/` works standalone, then check `/` (desktop/iPad/mobile); verify hero links, footer and forum embed.
6. If iframe embedding is blocked by `X-Frame-Options` or CSP, keep the full-forum link; **do not loosen forum security headers**. A native phpBB frontend adapter may be preferable in a future release.

## Boundaries

- Manual cPanel pull deployment is configured with `.cpanel.yml`; GitHub changes alone do not modify HostArmada.
- The base frontend was recovered from the previous HostArmada v3 upload; it has **not** been independently compared with live server files, which were unreachable when checked.
- Original full media assets are supplied in the ZIP release. Keep them alongside HTML when deploying.
- Never commit phpBB secrets, database backups, client documents, API tokens or signed contracts.

## Copyright and assets

The visible © 2026 TACHOS LTD notice is separate from the repository's existing MIT software licence. It does not override previously granted reuse rights. Hero illustration rights/provenance need verification before asserting exclusivity; see `ASSET_RIGHTS.md`. Public website images cannot be reliably protected against downloading or screenshots.
