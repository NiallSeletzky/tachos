# TACHOS website – Tashitude v0.1

Static HTML/CSS/JS implementation of the approved moustache-themed design. Mobile-responsive and framework-free. Visual reference: assets/design-reference.png (illustrative mockup, not the literal implemented design).

## Installation
1. Preserve the existing Hostinger/IONOS site and phpBB database backups. Do not upload this over a live forum directory.
2. Upload `index.html`, `styles.css`, and `script.js` to the IONOS public website document root for tachos.co.uk.
3. Keep `staging/` and the existing phpBB installation untouched. The Forum link currently points at `/staging/` and must be validated after restore.
4. Client area is deliberately disabled until server-side authentication and authorisation are configured; do NOT publish private files inside a public static folder.
5. Verify HTTPS, responsive layout, working links, domain DNS, and info@tachos.co.uk before changing live DNS.

## Notes
- Static demo only: no forum backend, authentication or contact form.
- Hero artwork is rendered with CSS; the supplied approved mockup is included as a reference image.
- The current code takes design cues from the approved illustration; it is not a pixel-perfect reproduction.
- No automatic changes have been made to IONOS hosting.
