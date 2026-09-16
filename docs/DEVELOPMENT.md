# WSL development

## First local setup

Use your normal development account, not root. Check `whoami`, `pwd`,
`cat /etc/os-release`, `git --version`, `python3 --version`, and `command -v codex`.
Do not print environment variables, tokens or credential files into chat.

On Ubuntu/Debian only, if prerequisites are missing:

```bash
sudo apt update
sudo apt install git python3 python3-venv util-linux
```

Python 3.10+ is required. If another distribution/version is installed, adapt the
package step rather than blindly running these commands. No global pip install.

Clone into a new directory; git clone safely refuses an existing non-empty target:

```bash
mkdir -p ~/projects
cd ~/projects
git clone --branch setup/wsl-foundation https://github.com/NiallSeletzky/tachos.git tachos
cd tachos
git status --short --branch
less scripts/bootstrap.sh
bash scripts/bootstrap.sh
source .venv/bin/activate
python scripts/site.py serve
```

Open http://localhost:8080 from Windows. Server binds only to 127.0.0.1. It serves
an isolated snapshot, not .git, docs or your environment. Restart after edits.
If port 8080 is occupied, use `python scripts/site.py serve --port 8081`.
Do not change binding to 0.0.0.0 as a shortcut for localhost problems.

If a clone already exists, inspect it first. Do not run clone over it or reset it.
Use a clean worktree or reconcile existing changes explicitly.

## Git identity and push access

Public cloning needs no login; pushing does. Use your existing approved GitHub
credential manager or passphrase-protected SSH key. Never place a token in a remote
URL or paste one into chat. Verify the authenticated account is NiallSeletzky.
If using a new SSH key, validate GitHub's published host-key fingerprint before
accepting it; never disable host-key checking. Avoid plaintext credential storage.

Set commit identity locally if missing, using your chosen name and GitHub-verified
email (GitHub noreply is suitable). Do not invent the noreply address:

```bash
git config --local user.name "YOUR COMMIT NAME"
git config --local user.email "YOUR VERIFIED OR GITHUB NOREPLY EMAIL"
git config --local pull.ff only
```

Do not execute those placeholders unchanged. Bootstrap does not modify identity.
Review staged files before each commit; .gitignore is not a secret scanner.

## Daily loop

Start with `git status`, `git fetch origin`, and the checkpoint. Use a topic branch
from the correct base. Until the foundation PR merges, branch from this setup branch.
After merge, use current main. Make changes, run `python scripts/site.py check`,
preview, inspect the diff, commit explicit paths and push the topic branch.
Review via PR; main means potential production deployment.

## Tool versions

The scripts use Python's standard library only, so there is no requirements.txt
or pip install step. Record the actual WSL Python/Git/Codex/Blender versions in
the local handover once inspected. Add dependencies with pinned versions only when
required; do not invent version pins for tools not installed on the PC.

Blender's bundled Python and Tavern's existing `ai` environment remain separate.
The Tachos venv does not sandbox native commands, Blender scripts or Codex.

Sources: [Microsoft WSL filesystem guidance](https://learn.microsoft.com/en-us/windows/wsl/filesystems),
[Python venv](https://docs.python.org/3/library/venv.html).
