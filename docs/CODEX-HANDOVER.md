# Local Codex handover

Open the cloned Tachos directory as the workspace. Use the installed Codex version;
inspect its help and current permissions before selecting a supported sandbox/
approval configuration. Use workspace-scoped writes and approvals; no root or
bypass flags. No new MCP, API key or model change is needed for this foundation.

Paste the following into Codex:

> Work in this Tachos checkout. Read AGENTS.md, README.md, docs/CHECKPOINT.md,
> docs/ARCHITECTURE.md, docs/SECURITY.md, docs/DEVELOPMENT.md, docs/DEPLOYMENT.md,
> docs/DESIGN.md and docs/design/LUMINOUS-SYSTEMS-v1.md before changing files.
> First establish the actual WSL distro/user, checkout path, branch, git status,
> remotes, installed Python/Git/Codex versions and existing parent/global agent
> instructions. Do not print credentials or environment contents. Preserve all
> existing changes. Run/review the bootstrap as the normal development user and
> check the site with its .venv. Start the isolated localhost preview and have me
> verify it in the browser. Record exactly which checks ran and which remain.
> Tachos is priority; Tavern is a parked logical sub-project with its own existing
> checkout/environment. Do not import, migrate or run Tavern. Blender is installed
> locally; verify its location/version only when needed for graphic work. Apply
> the approved Luminous Systems guide to future work, not an unsolicited redesign.
> Keep work on a topic branch and push to NiallSeletzky/tachos when ready. Do not
> merge to main or deploy until the Hostinger serving boundary in DEPLOYMENT.md
> is verified and I authorise release. Main currently deploys into public_html.
> Next resolve the hosting gate, local Git push authentication and the setup PR.

## Report back

Record local setup completion and non-sensitive versions in CHECKPOINT.md. Keep
machine-specific private paths/details in ignored .local/notes.md if necessary.
Do not claim local setup is complete based on the cloud preparation alone.

Reference: [Codex AGENTS.md documentation](https://developers.openai.com/codex/guides/agents-md/).
