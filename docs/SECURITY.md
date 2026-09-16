# Security boundaries

The repository is public. Treat every committed byte and all Git history as public.
No bank details, invoices, customer records, API keys, .env files, database dumps,
personal conversations, private SSH keys or Hostinger credentials belong here.
If a secret is committed, revoke/rotate it first; deleting the visible file is insufficient.

## Local

- Normal WSL development user; no root Codex sessions or sudo package installs via pip.
- Separate app credentials from source; use established credential stores, not
  ad-hoc token files in the project. This static site needs no runtime credentials.
- Use workspace-scoped writes and approval controls in local Codex. Keep network
  access restricted to the current task. Do not use bypass/full-access flags as setup defaults.
- Review inherited user/parent AGENTS.md and local Codex config before trusting a
  new checkout. Repo instructions do not override user authorization or security controls.
- Avoid untrusted Blender Python auto-execution and unreviewed addons. Inspect sources.
- Keep Windows banking/admin data outside the development workflow. A separate
  account/venv is useful separation, not a guarantee that WSL cannot access Windows files.

## Publishing

deploy/public-files.txt is the public-file allowlist used by scripts/site.py.
Manifest paths cannot be absolute, dot-prefixed, symlinked, missing or unsupported
file types. This prevents accidental broad recursive copying, not malicious code
from a trusted writer. Review changed JS/SVG/HTML and image metadata before release.

Hostinger's root Git deployment bypasses our builder. The proposed root .htaccess
permits only the existing public URLs and rejects all other requests. It must be
tested on the actual server/staging before merging this foundation. It is defense
in depth, not proof that private data can safely be committed or copied to the host.

Recommended GitHub settings for the owner to review: 2FA/passkey, least-privilege
repo access, protect main from force-push/deletion, require reviewed PRs and a
validation check after CI has been configured. These settings are NOT applied here.
Do not claim branch protection or automated secret scanning is enabled without evidence.

## Production verification

After an authorised deployment, verify public page, logo, JS, CSS and favicon;
verify .git/config, .env, README.md, AGENTS.md, docs/, scripts/, .venv/ and
projects/tavern/ are denied or not found. Check HTTPS, host aliases and any required
certificate validation path. Do not run a broad scanner against the shared host.

Source: [OpenAI agent configuration](https://developers.openai.com/codex/guides/agents-md/).
