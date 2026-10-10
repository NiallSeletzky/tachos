# TACHOS public website — checkpoint (10 October 2026)

Status: **Work saved on GitHub, preview branch only. NOT live.**

## Current intended website
- One homepage at `/`; original TACHOS logo, animated hero and contact remain.
- Project Delivery section: four execution phases on homepage, not a separate detail page.
- Its **Discuss a project** CTA is an actual `mailto:info@tachos.co.uk?subject=Project%20Enquiry%20-%20TACHOS` link.
- Technical Forum section follows Project Delivery, in matching dark card layout, describing Technical Notes and Reference Library.
- `Visit the forum` is presently linked to **`/forum/` as a provisional placeholder**, not a verified phpBB installation URL.
- Old `/project-delivery/` static page was deleted from the development branch at user's request.
- Current original placeholder notice remains below the new sections; review whether to retain before launch.

## Unfinished design work
- Approved visual direction: deep graphite/black **laser-burst** banner, human-friendly headline **"Helping you thrive in the new age of AI."**, blue "Discuss a project ↗" button.
- The artwork is still only a rendered design mock-up; **NOT integrated as an accessible HTML/CSS section or repo image asset**. When implementing, background is graphical but headline/button should be real HTML; button uses the enquiry email link above.
- Forum URL, phpBB hosting/install state and access controls are unknown. Git repo has phpBB styling and staging instructions, not a validated public forum service. Do not represent private docs as public.

## Checkpointed Git state
- Repo: https://github.com/NiallSeletzky/tachos
- Website branch: `feature/project-delivery-public-page`
- Review: draft PR #6 https://github.com/NiallSeletzky/tachos/pull/6 (targets `main`; not merged)
- Remote changes were made and committed through GitHub connector. **James does not need to push** remote changes.
- His WSL working directory: `/home/dixie/projects/tachos`, branch already tracking `origin/feature/project-delivery-public-page`. Local `.local/`, `dist/` and `scripts/` are untracked and must not be deleted, overwritten or bulk-staged. If he has not fetched latest commits, his local preview will be stale.
- At next session after confirming no local modifications to tracked files:

```bash
cd ~/projects/tachos
git status --short
git fetch origin
git pull --ff-only
python3 -m http.server 8000 --bind 127.0.0.1
```

- Local preview http://127.0.0.1:8000/ ; stop server using Ctrl+C. Do not `git clone` again, `git add -A`, `git clean`, `git reset --hard`, or force-push.

## Before publishing
1. Confirm actual phpBB host/path or decide to postpone forum button until available.
2. Integrate approved laser-burst background with real text, a functional email CTA, and a mobile-friendly layout; verify visual appearance in WSL local preview.
3. Confirm authoritative `tachos.co.uk` hosting, static deployment method, backed-up site/phpBB/database and rollback procedure.
4. Review website content and contact links, desktop/mobile, privacy and accessibility.
5. Only then ask James to approve PR #6 merge and deployment; private execution prototype stays offline and separate.

## Related protected work
- Private workflow prototype, 11 stages / 64 tasks, lives on `planning/tachos-execution-framework` under `prototypes/execution-platform/`, not part of the static website branch.
- Drive backup of prototype/earlier preview: https://drive.google.com/drive/folders/17eh5pjlKUBBaEUH8M_XCWbMk7q4cv9ja
- No live deployment or host backup has been performed in this session.
