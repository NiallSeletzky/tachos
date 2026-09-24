# TACHOS phpBB staging handover

Status: style and private visual preview prepared; phpBB not installed, hosting not inspected and access controls not tested. No live website backup has been taken. The original homepage source remains unchanged on this branch.

## Runtime and placement

Target phpBB 3.3.16, the official download version checked on 24 September 2026. Upstream requires PHP 7.2 or newer; this is a minimum, not a recommendation to use an obsolete PHP release. Before installation select a currently supported PHP release available on the account and run phpBB's installer checks with that exact runtime and database driver. Confirm Hostinger PHP extensions, MySQL/MariaDB version, HTTPS, filesystem permissions, SMTP and upload limits. Do not infer compatibility from the minimum PHP number alone.

Install the official full release package into a separate, access-protected Hostinger staging document root and a separate database. Retain its `prosilver` style; copy `phpbb/styles/tachos` from this repository to the installation's `styles/tachos`. Install and select TACHOS in ACP, then purge cache. Configure site name `TACHOS board` and a short site description. The board index includes the original homepage hero; forum/topic/login pages use a compact branded strip. There is no iframe. phpBB supplies the actual forum list, sessions, posting, search and attachments.

Before eventual root deployment, back up the entire existing live document root, hosting configuration and any database separately outside this public repository; verify the backup can be restored. Plan the existing index.html to index.php handover explicitly, because DirectoryIndex precedence can hide the board. Do not change the live document root until the staging tests below pass. Keep rollback copies outside the web root.

## Initial forums and permissions

Create Technical Notes, Reference Library and Company Office in ACP while staging is protected and the board disabled for normal users. Company Office must be created with no copied permissions, then explicitly grant James access. Give Guests, Bots, Registered users and Newly registered users no access to Company Office; use No rather than a group-wide Never if James belongs to that group, and inspect his effective permissions. Give James direct forum permissions. Administrator status alone does not imply forum access.

Technical Notes and Reference Library may expose approved material through read-only public forums. Keep draft/private material in separately permissioned private forums. Initially only James can post, approve or upload. Do not rely on a topic title, CSS, a hidden navigation item or a forum password as the sole privacy boundary. Disable registration in ACP. Disable feeds initially. Keep sensitive data out of avatars, signatures and public profile fields.

Upload protected documents as phpBB attachments, served through phpBB's permission-checked download endpoint. Preserve phpBB's files-directory access protection and verify Hostinger honours it; direct static access must be denied. Do not put confidential documents in this repository, the style directory, preview assets or public static paths. Set allowed extensions and size limits conservatively. Do not publish third-party books or training material without permission.

## Staging acceptance checks — all pending

- Logged out: see only approved public forums; Company Office absent from index, search, feeds, latest-topic lists and user post lists.
- Logged out: request known private forum, topic and attachment URLs directly; no private text, metadata or file bytes returned.
- An ordinary account: repeat the same checks and confirm it cannot see Company Office.
- James: read and download a test document in Company Office; post/edit and manage approved public material.
- Request the physical attachment URL under files/ directly, both logged out and logged in; it must not serve bytes. Check thumbnail paths too.
- Log out after accessing a private attachment; retry without session cookies and check cache headers. Disable public CDN/page caching for session pages and protected downloads.
- Registration really disabled, HTTPS/session cookies configured, recovery email delivered, login/logout work. Remove installer after installation.
- Index, topic, login, posting and attachment pages retain native phpBB controls and work on mobile, with keyboard navigation and at 200% text size.
- Back up and restore the staging database plus uploaded files separately from source. Record restore success before considering production.

## AI integration

No AI service, subscription or agent is configured. Investigate account entitlement and price before any purchase. A future n8n assistant must use server-side validated phpBB identity and effective per-forum permissions for every retrieval; protect webhook secrets outside Git. A public assistant needs a separate approved-public index. Never expose private attachment URLs or rely on the browser to filter retrieved records.

## Sources

- https://www.phpbb.com/downloads/
- https://www.phpbb.com/support/documents.php?mode=readme&version=3
- https://github.com/phpbb/phpbb/tree/release-3.3.16/phpBB/styles/prosilver

The header/footer templates derive from GPL-2.0 phpBB prosilver 3.3.16. Review upstream template changes when updating phpBB; this child style does not change core PHP or authentication. Runtime, template compilation and ACL tests remain pending because this environment has no PHP runtime or Hostinger PHP/database connection.
