# GitHub to Hostinger

## Current setup

James configured Hostinger: NiallSeletzky/tachos → main → public_html → tachos.co.uk.
Whether deployment is automatic or requires the hPanel Deploy button is unverified.
This branch is NOT a production deployment. No host settings have been changed.

## Foundation release gate

Adding docs/ and scripts/ to a web-root checkout creates an exposure risk.
Do not merge this branch until the serving boundary is proven. The candidate
.htaccess uses an exact allowlist for current public URLs and denies everything else.
It does not protect GitHub content; all repo files must still be publication-safe.

1. Inspect existing Hostinger web-root configuration and back it up before replacing
   anything. Check for existing redirects, access rules, files and certificate routes.
2. Prefer testing this branch on an isolated staging site/root with equivalent server
   configuration. Never point production at a development checkout as a test.
3. Verify .htaccess is honoured, its RewriteRule END flag is supported, and Options
   overrides are allowed. Unsupported syntax can cause a 500; ignored rules can
   expose files. Do not assume Apache/LiteSpeed compatibility without testing.
4. Check all five public files and / return 200, with correct content types. Check
   README.md, AGENTS.md, docs/SECURITY.md, scripts/site.py, .git/config, .env,
   .venv/pyvenv.cfg and projects/tavern/README.md return 403/404, not file contents.
5. Check www/non-www handling, HTTPS and certificate renewal compatibility. The
   strict candidate blocks .well-known; determine whether the host handles certificate
   challenges before these rules or needs a narrowly scoped exception.
6. Record successful evidence and obtain release instruction before merge to main.
   Deploy exactly the reviewed commit once and repeat the public/denied URL checks.

## Preferred longer-term boundary

Keep source/docs outside the document root and publish only the artifact returned
by `python scripts/site.py build`. Its SHA-256 sidecar stays outside the artifact.
The current Git button does not automatically run this script or honour the manifest.
An artifact-only branch or scoped upload deployment needs a separately agreed host
configuration. Do not silently change the main→Hostinger arrangement.

## Rollback

Keep the last known-good production commit and host configuration backup. Revert
the reviewed change in Git (no force-push), redeploy, and verify HTTP behavior.
If first enabling access rules fails, restore the saved host configuration; do not
temporarily expose development files by blindly removing the deny rules. Prefer a
known-good public-only artifact while diagnosing. Preserve logs for the incident.

This setup does not claim an atomic Hostinger deployment or zero downtime.
