# Checkpoint — 2026-09-16

## Completed remotely

- Inspected main baseline cb41bed; preserved the approved temporary static page.
- Recovered and read the approved Luminous Systems v1 visual architecture.
- Prepared setup/wsl-foundation with AGENTS.md, development/security/deployment
  docs, design guidance, parked Tavern map and a local Codex handover.
- Added per-checkout venv bootstrap without package downloads or global changes.
- Added explicit public-file validation, fresh artifact snapshots, checksum sidecars
  and loopback-only preview. Root source and production URLs remain unchanged.
- Prepared strict candidate .htaccess; NOT verified on Hostinger.

## Validation in preparation workspace

- Python public-file check and artifact creation passed; five public files.
- Five boundary tests passed: excluded private files/independent snapshots,
  unsafe manifest paths, symlinks, unlisted HTML assets and HTTP serving.
- Local HTTP test: fixture page 200; AGENTS.md, .git/config, .env and
  scripts/site.py 404 from the isolated preview. A separate persistent preview
  process was unreachable across tool calls; no visual browser check is claimed.
- Bash syntax, JavaScript syntax and Git whitespace checks passed.
- Public site source matches production baseline byte-for-byte.
- Bootstrap has not yet run in James's WSL account; browser visual QA and
  production web-server configuration remain unverified.

## Still local/unverified

- Actual WSL distribution, account, Python/Git/Codex/Blender versions.
- Clone at ~/projects/tachos, .venv creation and Windows localhost preview.
- Git commit identity and authorised GitHub push access from the PC.
- Browser visual QA and actual Hostinger access controls/HTTPS/renewal routes.
- Main branch protections/CI; none configured by this foundation.
- Tavern source audit and any integration; still parked.
- Company website disclosure requirements: review separately before full launch.

## Next action

Clone setup/wsl-foundation locally, inspect/run bootstrap, launch preview, then
give local Codex docs/CODEX-HANDOVER.md. Resolve docs/DEPLOYMENT.md before merging.
This branch is development preparation, not evidence of a live deployment.
