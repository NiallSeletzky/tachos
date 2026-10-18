# TACHOS LTD — Website source

Current reference release: **17 October 2026 HostArmada upload v3**, extended on **18 October 2026** with the phpBB homepage section.

## Structure

- `index.html`: five clickable heroes, original light/music interaction, forum embedded **below** the heroes, common company footer.
- `project-delivery.html`, `rack-stack.html`, `cabling.html`, `network.html`, `documentation.html`: the five service reference pages.
- `assets/five-works.webp`: original five-hero sprite used by the site. **Required**; do not replace with a lookalike.
- `styles.css` and `app.js`: site's Tachitude theme and hero interactions.
- `tachos-forum-home.css` and `tachos-forum-home.js`: scoped phpBB iframe integration.
- `control-room-prototype.html`: reserved prototype link (not an authorised client document portal).

## Deployment to HostArmada

The repository does **not** contain the live phpBB application, forum database, credentials, private files, or hosting configuration. Keep `/forum/` and its database untouched.

1. Back up the **currently deployed** `public_html` and phpBB database.
2. Upload the top-level website files to `public_html/` without deleting `/forum/`, `config.php` or user data. Do not upload the source ZIP in a publicly accessible folder.
3. Ensure `assets/five-works.webp` exists and matches the approved artwork.
4. Confirm `/forum/` works standalone, then check `/` (desktop/iPad/mobile); verify hero links, footer and forum embed.
5. If iframe embedding is blocked by `X-Frame-Options` or CSP, keep the full-forum link; **do not loosen forum security headers**. A native phpBB frontend adapter may be preferable in a future release.

## Boundaries

- No automatic deployment is configured or claimed. GitHub changes alone do not modify HostArmada.
- The base frontend was recovered from the previous HostArmada v3 upload; it has **not** been independently compared with live server files, which were unreachable when checked.
- Original full media assets are supplied in the ZIP release. Keep them alongside HTML when deploying.
- Never commit phpBB secrets, database backups, client documents, API tokens or signed contracts.
