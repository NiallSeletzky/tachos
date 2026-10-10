# TACHOS domain-wide brand and UI standard — MANDATORY

Status: Approved baseline, 10 October 2026. Applies to **all TACHOS-controlled website pages and applications served under tachos.co.uk**, including the public site, service/about/contact pages, phpBB/forum theme, technical library, project execution interface, and authenticated client/document portals.

## Hard rule
**Every new or modified page must follow the approved TACHOS “Tachitude” visual system. Do not introduce an unrelated template, colour palette, typography scheme, or generic corporate/AI-looking theme.** Treat divergence as a design defect requiring explicit owner approval. This applies to future contractors, AI agents, Codex changes, and site migrations.

## Single source of truth
- Canonical implementation for the current version: `tachitude-v0.1/styles.css` and `tachitude-v0.1/index.html`.
- Design intent: approved moustache-themed homepage mockup (design reference stored in TACHOS Google Drive website release folder). The mockup is visual guidance; the implemented CSS is the current code baseline.
- **Re-use shared stylesheet, CSS custom properties, spacing, navigation, buttons, panels/cards, footer and responsive breakpoints** wherever technically possible. Extract these into shared assets when the site grows; do not fork independently styled copies.
- Domain is spelled **tachos.co.uk**; company is **TACHOS LTD**; concept/tagline word is **Tachitude** (T-A-C-H-I-T-U-D-E), never “Tashitude”.

## Design tokens (from the approved implementation)
| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#192733` | Primary text and dark illustration |
| `--muted` | `#42505a` | Secondary text |
| `--cream` | `#fffaf2` | Main background |
| `--paper` | `#f6eee1` | Neutral surface |
| `--coral` | `#de6046` | Primary CTA and warm emphasis |
| `--teal` | `#176579` | Secondary accents and focus |
| `--gold` | `#f6c477` | Decorative accents |

Typography: Arial/Calibri/sans-serif for body, Georgia/serif for prominent headings; friendly but technically credible. Warm cream, coral, teal, dark charcoal. Retro-modern aesthetic; moustache iconography is an accent, not a substitute for clear technical content. Prefer approachable, direct copy and subtle humour; avoid forced jokes and claims that oversell company scale.

## Required consistency across site components
1. Match logo/wordmark, moustache motif, navigation and footer across all public and authenticated sections.
2. Use consistent CSS tokens for buttons, cards, headings, form inputs, alerts, tables and navigation.
3. Preserve accessible contrast, keyboard focus, responsive mobile/iPad layout and legible typography.
4. When skinning phpBB or third-party software, use a compatible child/theme stylesheet or adapter; **do not overwrite vendor core styles**, break upgrades, or weaken authentication or security.
5. Private portals must be protected by **real server-side authentication/authorisation**. Visual consistency never takes priority over security.
6. Every new page or redesign must be checked on desktop, iPad/tablet and phone against the approved homepage before merge/deployment.
7. A proposed design exception must be documented and explicitly approved before merging.
8. Keep public GitHub free of passwords, tokens, production configuration, databases, customer information and client documents.

## Review gate for GitHub/Codex/ChatGPT changes
Before approving any page/feature: verify the shared stylesheet/tokens; consistent brand/nav/footer; responsive rendering; accessibility; working existing forum/client routes; no security regression; no unapproved theme drift. If any fail, do not publish. Preserve deployed site and database backups during migration.

Future improvements may extend the system, but may not replace its identity without owner approval.
