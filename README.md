# Tachos website and development workspace

Canonical repository: https://github.com/NiallSeletzky/tachos

Production: https://tachos.co.uk — Hostinger currently pulls `main` into `public_html`.
This setup branch prepares local development; it does not change the live site.

Start with [WSL setup](docs/DEVELOPMENT.md), then [Codex handover](docs/CODEX-HANDOVER.md).
Read [AGENTS.md](AGENTS.md) before agent work.

## Quick start inside an existing clone

```bash
bash scripts/bootstrap.sh
source .venv/bin/activate
python scripts/site.py serve
```

Open http://localhost:8080. Ctrl-C stops the preview. Restart after edits.
The site has no server runtime or third-party dependencies; Python is development tooling.

## Map

| Path | Purpose |
|---|---|
| index.html, styles.css, lightspeed.js, favicon.svg, assets/ | Public website source |
| deploy/public-files.txt | Explicit release-file boundary |
| scripts/ | Local setup, validation and isolated preview |
| docs/ | Architecture, security, workflow, deployment and checkpoint |
| docs/design/ | Versioned approved visual reference |
| projects/tavern/ | Parked sub-project coordination, not imported application code |
| .venv/, .local/, dist/ | Ignored, local-only generated material |

The repo is public. Nothing private belongs in Git, even if HTTP access is blocked.
Do not merge the foundation branch until the Hostinger serving boundary is verified.
