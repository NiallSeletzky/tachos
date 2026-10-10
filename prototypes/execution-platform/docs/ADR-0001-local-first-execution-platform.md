# ADR-0001 — TACHOS local-first execution platform

**10 October 2026 | Proposed for James's review | WP00 partially complete**

## Evidence examined

The GitHub planning branch contains the v0.2 development plan; the main branch contains the current source for a static HTML/CSS/JavaScript homepage and a phpBB style directory. The existing phpBB staging note dated 24 September says installation, permissions and hosting were unverified **at that time**. Later site work may supersede it; the live environment has not been independently verified in this run.

The original `workflow-definition.json` was recovered from the TACHOS Library and copied without altering stage or task IDs. It contains version 0.1, 11 stages and 64 unique tasks. Its stage dependency graph is linear (S00 through S10). The source pseudocode, implementation specification, source map and visual reference architecture were consulted. The BICSI 2019 publication is a separate licensed reference, not code or a current compliance standard.

## Decision

Build and test a local-only, fictional-data vertical slice before committing to any hosting architecture. Use the original versioned JSON definition and a simple Python/SQLite service with a responsive HTML/JavaScript browser interface. Treat server-side checks as authoritative; the browser is presentation only. Preserve revisions, provenance and an audit record. Do not equate a checklist tick with review or engineering sign-off.

Only S00 is executable in the first demonstration; all other stages remain visible but locked until role mappings, requirement criteria, hold management, evidence review and approvals are properly implemented. The public TACHOS capability page is an independent, static editorial product. phpBB can later provide reference links but is not an approval database.

## Tested now

- JSON definition integrity and dependency validation.
- Synthetic intake and persistent SQLite state.
- S00 evidence-reference submission, independent task review, sponsor/security stage approvals.
- Blocked gate, invalid role, stale revision, cross-project reference and unauthorised N/A refusal.
- Responsive HTML/CSS/JavaScript browser presentation (source reviewed; no cross-browser testing claimed).

## Not verified / production blockers

Current hosting account and platform (IONOS/Hostinger), DNS/TLS, staging URL, runtime, database, backup/restore, live phpBB state, deployment root and approved identity system. No client security authority has approved a repository for real site data. Demo tokens and SQLite audit history are not production-grade controls. Do not deploy this application to a public server or enter customer records.

## Next gates

1. Confirm hosting and current live/staging configuration, preserving a verified rollback path.
2. Review the local demonstration and extend S01–S10 rules only with explicit approver and evidence policy.
3. Implement document/hold/change/test/handover handling and security testing before staging.
4. Review public marketing copy and accessibility, then separately approve homepage integration.
