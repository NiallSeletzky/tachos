# TACHOS — laptop checkout, local test and publication runbook

Prepared 10 October 2026 | For James's 15:30 UK PC session

## 0. What is already saved

- Drive release folder: https://drive.google.com/drive/folders/17eh5pjlKUBBaEUH8M_XCWbMk7q4cv9ja
- Working proof-of-concept and 14 unit/API tests: `planning/tachos-execution-framework`, directory `prototypes/execution-platform/`
- Static website update to review: `feature/project-delivery-public-page`, PR #6, **draft / unmerged**
- GitHub repo: https://github.com/NiallSeletzky/tachos
- Only fictional data in prototype. Do not publish/host this prototype.

## 1. Laptop prerequisites (Windows PowerShell)

Open PowerShell and check:

```powershell
git --version
py --version
```

If Git is absent, install Git for Windows from https://git-scm.com/downloads/win . If Python is absent, install a supported Python 3 version from https://www.python.org/downloads/windows/ . Alternatively in WSL use `git --version` and `python3 --version`; the equivalent commands below then use `python3` instead of `py`.

Sign in to GitHub in the browser with the account authorised for `NiallSeletzky/tachos`. Git clone of the public repo is read-only until push privileges/authentication are configured.

## 2. Clone — do NOT git init over an existing working tree

In Windows PowerShell:

```powershell
cd $HOME
mkdir TACHOS-Development -ErrorAction SilentlyContinue
cd TACHOS-Development
git clone https://github.com/NiallSeletzky/tachos.git
cd tachos
git status
git branch -a
```

If the folder already exists, use `git pull --ff-only` in that repo instead; do not overwrite local changes.

## 3. Preview the new marketing website

```powershell
git switch feature/project-delivery-public-page
py -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/ and http://127.0.0.1:8000/project-delivery/ in a browser. Use mobile/tablet device emulation in browser dev tools and tab through keyboard focus; check links, logo, animation, four-stage summary, contrast and enquiry CTA. Press Ctrl+C in the terminal when done.

Review `git diff main...feature/project-delivery-public-page`. No private application files are part of this website branch. This preview is static only and does not require a hosted backend.

## 4. Run the separate execution prototype

```powershell
git switch planning/tachos-execution-framework
cd prototypes/execution-platform
py -m unittest discover -s execution/tests -v
py -m execution.server
```

Expect 14 tests and a localhost page at http://127.0.0.1:8765/ . The terminal prints role-specific **temporary demo tokens**. Use only fictional records. Press Ctrl+C to stop. It is local and unsuitable for public hosting: ephemeral tokens are not production authentication, evidence is not independently verified and only S00 is executable.

## 5. Publishing decision — public static website ONLY

- [ ] Review and approve public copy/design on laptop.
- [ ] Inspect draft PR https://github.com/NiallSeletzky/tachos/pull/6 .
- [ ] Confirm the authoritative live host: IONOS vs Hostinger vs another provider; inspect `tachos.co.uk` DNS/site configuration and actual web-root directory.
- [ ] Back up current website files, phpBB installation and related configuration, and document rollback path before overwriting anything.
- [ ] Confirm whether a merge to `main` auto-deploys or only updates GitHub; **do not assume** repository changes publish the domain.
- [ ] Approve/merge PR only after review; deploy through the verified host mechanism. If manual static deployment is used, transfer reviewed `index.html`, `styles.css` and new `project-delivery/index.html` while preserving existing images/JS/phpBB.
- [ ] Confirm the live domain's homepage, `/project-delivery/`, contact mailto, HTTPS, mobile layout and old phpBB routes; revert if not correct.

**Hard stop:** Never publish `prototypes/execution-platform/` or its database/API to a public webroot. Do not use customer data or restricted data-centre records in local demo.

## 6. If Git/GitHub authentication prompts

Using public HTTPS, clone/pull does not require a token. To push updates, Git Credential Manager/browser login or GitHub CLI can authenticate. Do not paste access tokens into chat, repo files or screenshots.

## 7. Handover

At the end of the laptop session, report: host provider and deployment mechanism; whether PR #6 reviewed/merged; whether production page is verified; any remaining issues. Percy to update James Control and GitHub epic #4 on verified outcomes, without marking prototype production-ready.
