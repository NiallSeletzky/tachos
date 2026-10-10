# TACHOS Execution Platform — local demonstration (WP01/WP02 draft)

**Status: locally runnable proof of concept. NOT a production application, not an engineering approval tool, and not connected to the live TACHOS website.** Only fictional data is permitted. Source foundation: TACHOS v0.1 workflow definition, 11 stages and 64 tasks, preserved verbatim in `execution/definitions/`.

## Run (Python 3.10+, no external packages)

```bash
cd tachos_execution_prototype
python -m unittest discover -s execution/tests -v
python -m execution.server
```

Open the printed localhost address. The terminal prints five temporary demo tokens. Use the `demo_admin` token to create a fictional project, switch to `demo_worker` to submit S00 evidence references, `demo_reviewer` to accept each submission, then `demo_sponsor` and `demo_security` to approve the S00 gate. The project ID can be pasted into the sidebar to reload the persisted record. The default SQLite file is `tachos-demo.sqlite3` in the working directory; **do not put real client data in it**. Tokens are ephemeral and change on restart.

## What works

- Original JSON definition validated for unique stage/task IDs, correct task prefixes, known dependencies and cycles.
- Localhost-only Python HTTP API, server-side role enforcement based on temporary demo tokens, SQLite persistence, revision checks and an audit event record.
- Fictional project intake, stage overview, task evidence-reference submission, independent task review and two-role S00 gate approval.
- Explicit blockers, rejected cross-project evidence references and a responsive HTML/JS interface using the TACHOS visual palette.

## Deliberate limitations

- **Only S00 is executable.** The remaining 10 stages and 59 tasks are visible but locked pending role/approval mapping, requirements and evidence policies. Stage gate acceptance is a demonstration of software state, **not** evidence that actual project criteria have been met.
- Synthetic `demo://` references are strings; the service does not fetch or validate underlying evidence documents. No document upload, cryptographic evidence integrity or independent authenticity checks exist.
- Demo tokens printed on the local terminal are not production identity, session or security controls. No TLS, client isolation, production audit protection, deployment security assessment or backups/restore validation.
- No approved-N/A workflow, critical-hold registry, change invalidation, testing/retest engine, standards registry, phpBB integration, notifications or live homepage integration yet.
- This package should **not** be publicly hosted or used to manage any sensitive, secure or live data-centre project.

## Proposed next steps

1. Review the proof of concept against ADR-0001 and acceptance scenarios; close remaining WP00 hosting and staging verification gaps.
2. Implement proper project roles and gate rules for S01–S10, requirements, independent N/A review, current evidence checks and baseline invalidation.
3. Add issue/change/test-attempt/handover entities and integration tests; security review and approved authentication before staging.
4. Build the public-facing executive service section independently; do not publish without James's approval.

This is original TACHOS workflow software informed by the BICSI *Essentials of Data Center Projects* (2019) source; it does not reproduce licensed content or claim compliance with any standard.
