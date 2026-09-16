#!/usr/bin/env bash
set -euo pipefail
umask 077
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$repo_root"
if [[ "$EUID" -eq 0 ]]; then
  echo 'Run as your normal WSL development user, not root.' >&2; exit 1
fi
case "$repo_root" in /mnt/*) echo 'Clone into your Linux home/projects directory, not /mnt.' >&2; exit 1;; esac
for tool in git python3 flock; do
  command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done
python3 -c 'import sys; assert sys.version_info >= (3, 10), "Python 3.10+ required"'
if [[ -L .local ]]; then echo 'Refusing a symlinked .local directory.' >&2; exit 1; fi
mkdir -p .local
exec 9>.local/bootstrap.lock
flock -n 9 || { echo 'Another bootstrap is running in this checkout.' >&2; exit 1; }
if [[ -L .venv ]]; then echo 'Refusing a symlinked .venv.' >&2; exit 1; fi
if [[ ! -e .venv ]]; then
  python3 -m venv .venv || { echo 'venv failed; on Ubuntu/Debian install python3-venv. Inspect any partial .venv before retrying.' >&2; exit 1; }
elif [[ ! -x .venv/bin/python || ! -f .venv/pyvenv.cfg ]]; then
  echo 'Existing .venv is incomplete. Inspect it; bootstrap will not overwrite it.' >&2; exit 1
fi
.venv/bin/python -c 'import sys; assert sys.prefix != sys.base_prefix; print("Python",sys.version.split()[0])'
.venv/bin/python scripts/site.py check
echo 'Ready. Activate: source .venv/bin/activate'
echo 'Preview: python scripts/site.py serve'
echo 'No packages installed, global settings changed, or credentials accessed.'
