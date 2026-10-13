# TACHOS website v1.0 — IONOS deployment

Release accepted 13 October 2026. The live desktop site at https://tachos.co.uk/ is hosted on IONOS and was uploaded manually. Do not automatically deploy the repository's earlier Hostinger placeholder onto IONOS.

## Accepted presentation

- Retain the existing desktop layout, navigation, five Services cards, technical forum, private client area and contact sections.
- Hero artwork: The Five Works of TACHOTUDE, featuring five moustachioed mythological infrastructure figures.
- The hero image is `assets/five-works-desktop.webp` (softened edges, rounded appearance); the additional styling is `five-works-desktop.css`.
- The existing homepage HTML refers to these files and uses the corrected word **Tachotude**.
- `styles.css` and `script.js` remain otherwise unchanged from the source package.

## Source of the deployed version

The authoritative version currently resides in the manually uploaded IONOS web root and the ChatGPT release packages `TACHOS-desktop-minimal-update.zip` plus `TACHOS-hero-soft-fade-update.zip`. These packages are **not yet fully copied into this Git repository**. In particular, the binary WebP artwork and final HTML/CSS are still to be brought across. The previous `index.html` in this repository is an old Hostinger placeholder, not the current production homepage.

Before enabling any GitHub-based deployment, obtain a copy of the actual IONOS files, commit them including the WebP asset, check the rendered site, and ensure secrets or private client files are not copied into this public repository.
