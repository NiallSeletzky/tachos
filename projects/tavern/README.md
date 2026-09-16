# Tavern — parked sub-project

Priority: low. Tachos is the parent project for coordination; Tavern remains its
own existing engineering checkout and environment until a deliberate integration.
This directory contains coordination only. It is excluded from public artifacts.

## Resume in the existing Tavern checkout

Read, in order:

1. dl_temp/review/CHECKPOINT.md
2. dl_temp/review/CODEBASE-REVIEW.md
3. docs/CHECKPOINT.md
4. docs/ALPHA-1.0-PLAN.md
5. Existing project READMEs and agent instructions

Historical handover says Alpha 0.4.1 source was downloaded under dl_temp while the
parent checkout was older. Confirm those files locally rather than assuming the
Git branch is authoritative. Preserve the existing Python `ai` environment.

The prior architecture direction was PHP/MySQL, with public `door/` as a release
boundary and legacy JSON as import/archive input. Hosting subsequently moved from
Porkbun to Hostinger; PHP 8.4 was discussed, but verify actual host capabilities,
extensions and current design before implementing. Do not import private content,
databases, bot credentials or history into this public repository.

## Before integration

- Resolve source-of-truth checkout, remote and release/version discrepancy.
- Verify backup of current code/data and document recovery.
- Agree separate hostname/path, public root, credentials and deployment process.
- Confirm PHP/MySQL requirements from the actual checked-in plan.
- Decide whether a sibling repository, submodule or monorepo is warranted.

Do not clone a guessed Tavern repo, move its files, create a database or start
services as part of the Tachos bootstrap. Keep it parked until requested.
