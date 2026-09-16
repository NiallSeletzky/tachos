# Architecture and initial conditions

Decision date: 2026-09-16. Scope: development foundation, not a site redesign.

## Established facts

- GitHub NiallSeletzky/tachos is canonical; last production baseline for this work
  is cb41bed (static trails, plain email labels, no street address).
- Hostinger was configured by James to pull main into public_html.
- Current public source is plain HTML, CSS, JavaScript and one PNG logo.
- WSL and Blender are available on James's PC; distro, versions and WSL username
  still need local verification. This cloud workspace is not that PC.

## Workspace structure

Use `~/projects/tachos` in the WSL Linux filesystem. This is the Tachos repo and
agent working directory. Give each checkout its own `.venv` for Python utilities.
Keep the existing Tavern repo at its existing location; do not make a nested clone
or copy its unreviewed history into Tachos. `projects/tavern/` is its logical home
in this project's documentation. Revisit submodule/monorepo only after source audit.

Keep editable Blender scenes outside the repo, for example
`~/projects/tachos-artwork/`. Review exported images before adding them to assets/.
Do not store the only copy of valuable art in an ignored temporary directory.
Back up editable art separately; storage/LFS decisions are pending.

## Runtime separation

| Component | Environment | Deployment |
|---|---|---|
| Tachos site | Browser HTML/CSS/JS | Reviewed static files only |
| Development scripts | Per-checkout Python 3.10+ .venv; standard library | Never |
| Codex | Existing local CLI installation and its own authentication | Never |
| Blender | Existing local application and bundled Python | Exported approved assets only |
| Tavern | Existing separate environment; future PHP/MySQL plan | Not part of this release |

No npm package or Node server is required for Tachos. Node, if already installed,
can syntax-check JavaScript. Do not install a framework merely to get a dev server.

## Concurrency and source-of-truth rules

- One writer per checkout. Bootstrap takes a nonblocking flock per checkout.
- Each preview/build creates a fresh output directory, so concurrent snapshots do
  not overwrite each other. Source edits must finish before snapshot creation;
  the builder does not promise a transaction over files being edited concurrently.
- Commit/review one snapshot before release; deploy one commit at a time.
- Never edit production files and Git independently. Emergency live changes must
  be reconciled into Git before the next deployment.
- Refresh origin/main before preparing a PR and use non-forced updates. If main
  advances, re-evaluate the diff and rerun checks rather than overwriting it.
- Bootstrap deliberately does not install dependencies, authenticate, change global
  Git settings, upgrade tools, or start hidden services.

## Pending decisions

Verify Hostinger's actual HTTP serving rules before allowing dev files onto main.
Prefer a future artifact-only deployment if the host supports it cleanly; that
requires an explicit hosting change, not an assumed capability of its Git button.
Tavern URL, database, release route and integration remain undecided.
