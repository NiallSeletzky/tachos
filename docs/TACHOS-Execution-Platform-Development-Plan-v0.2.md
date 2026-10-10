# TACHOS Data Centre Project Execution Platform — development plan v0.2

**Status:** Approved for planning; not yet implemented or deployed  
**Prepared:** 10 October 2026 (UK)  
**Owner:** James, TACHOS LTD | **Execution coordinator:** James Control/Percy | **Implementation:** Codex under review  
**Source of truth:** existing v0.1 lifecycle, JSON definitions, data specification and checklists in TACHOS Drive. This plan does not replace those source artefacts.

## 1. Mission and outputs

Build two intentionally separate products.

**A. Private execution platform:** A secure, responsive HTML/JavaScript interface guiding a human project manager through data-centre project delivery, maintaining registers, evidence, gated approvals, versioned baselines and audit history. Link it from the TACHOS website only after security review. It orchestrates accountable people; it does not certify designs, approve itself, energise equipment or execute technical work.

**B. Public capability section:** Executive-level homepage content explaining what TACHOS can coordinate across the 11-stage project lifecycle. No client details or privileged internal workflow exposed. Use accurate service descriptions rather than unsupported compliance or accreditation claims.

**Success criterion:** A fictional project can be taken from intake through evidence-backed gate review with meaningful blocker explanations, saved/retrieved state and an audit record; a separate responsive homepage section accurately introduces the service.

## 2. Inputs, authority and constraints

Use the existing file set: TACHOS-Project-Pseudocode-v0.1.md, workflow-definition.json, Implementation-and-Data-Specification.md, Forms-and-Field-Guide.md, Source-Map-and-Open-Decisions.md, 14-sheet control workbook and printable quick guide. Reuse stable S00–S10 and checklist task IDs. Do not re-key, renumber or silently alter the lifecycle.

The workflow is TACHOS's proposed implementation, **informed by** BICSI *Essentials of Data Center Projects* (2019), not a verbatim translation or proof of conformity. The licensed book and any current standards remain outside the public repository. Project-specific editions, limits, legal/regulatory requirements, client security rules and acceptance thresholds require authorised verification. Do not present 2019 guidance as ANSI/BICSI 002-2024 requirements.

The TACHOS site is currently a static HTML/CSS/JS repository with a phpBB directory; its live host configuration must be checked before making stack or deployment decisions. The message board is a **reference link target**, not the data store or approval system. Reuse public brand and visual architecture; do not disturb homepage or phpBB functionality during prototype work.

**Security boundary:** Browser JavaScript is a presentation layer. A server must authorise every read, edit, approval, download and export. Separate publicly readable assets from authenticated per-project records. No credentials, real protected site topology, customer data, private attachments or audit exports in the public GitHub repository. The hosting/security authority must approve the deployment environment before real client records are entered.

## 3. Existing 11-stage workflow (retain names and IDs)

| ID | Stage | Public-facing service description |
|---|---|---|
| S00 | Authorise and define boundaries | Governance, scope and accountable delivery |
| S01 | Define requirements and criticality | Requirements, criticality and acceptance planning |
| S02 | Survey and assess feasibility | Site surveys and feasibility assessment |
| S03 | Develop and baseline design | Coordinated design and technical assurance |
| S04 | Plan delivery and procure | Procurement, programme and delivery planning |
| S05 | Release work for installation | Site readiness, permits and work authorisation |
| S06 | Install and record | Controlled installation and as-built capture |
| S07 | Verify components and subsystems | Quality inspections and subsystem verification |
| S08 | Prove integrated and operational readiness | Integrated testing and operational readiness |
| S09 | Cut over and accept service | Managed cutover and service acceptance |
| S10 | Handover and close | Documentation, handover and closeout |

Keep commissioning, safety, security, quality, change, cost, schedule and documentation as ongoing cross-cutting workstreams rather than one-off steps.

## 4. Target user journey

1. Sign in (demo mode may use test identities only).
2. Create a project with a site alias, project type, scope, responsible roles and data classification, leaving unknown critical fields unresolved.
3. View current stage, next permitted action, blockers, approvers and open holds.
4. Enter a task workspace: **Why this step → What you need → What to do → Record the result → Submit for review**.
5. Attach or reference evidence in an authorised store, retaining provenance and revision.
6. Submit; designated reviewer accepts, rejects or requests rework. Required evidence, exact approved baseline and segregation-of-duties rules must be enforced by the server.
7. Changes and failed tests reopen affected downstream work, preserving the historical trail.
8. Generate a project status summary, handover checklist and auditable records.

Interface: tablet/desktop responsive, keyboard accessible, readable error messages beside relevant fields, text plus icon status (never colour alone), persistent save/revision status, no disruptive animation. Follow the canonical **James-Control-Visual-Reference-Architecture-v1.md** (TACHOS Executive Technical for public pages, James Control Operational for private tools): graphite/parchment base, restrained mineral-blue and acid-olive signal, fine lines, clear grid, confident technical typography. Preserve existing logo/header and user-facing contact route.

## 5. Technical architecture — recommended starting point

- **Workflow definitions:** immutable/versioned JSON imported from existing workflow-definition.json. Validate IDs, dependencies and schema; reject dependency cycles.
- **Frontend:** HTML/CSS with JavaScript or TypeScript modules, potentially Vite for development. Keep it framework-light unless complexity justifies a component framework.
- **Prototype server:** small Python API + SQLite, as suggested by the existing implementation specification, for a **local single-user fictional-data prototype**. Define a stable API so deployment backend can change if actual IONOS/other host cannot run Python. Node/TypeScript is a valid alternative only after hosting audit, not an unverified commitment.
- **Production service:** selected after environment review; transactional persistence, server-side RBAC/ABAC, authenticated sessions, approved secrets management, backups/restoration, attachment references, revision control and append-only/protected audit log.
- **Document/reference layer:** standards register storing title, edition, owner, authorisation, URL/repository link, applicability, classification and last verified date; links to phpBB reference topics and approved external documentation. Never scrape or redistribute licensed standards merely for convenience.
- **Notification layer:** event-driven assignment, blocked-stage, reviewer-needed, approaching-due and change-invalidation notices. Only authorised, minimally revealing messages; no uncontrolled email or push integrations in prototype.
- **AI layer:** optional later writing/retrieval assistant using approved context; no AI required for progression, formal gate decisions or acceptance.
- **Hosting:** development local first, then non-production staging; deploy publicly only after rollback plan and explicit site/hosting review.

## 6. Work packages and dependencies

### WP00 — Baseline & repository audit
**Owner:** Percy/Work to coordinate, Codex to inspect code.  
Tasks: inventory repo, live/staging hosting and phpBB paths, Drive v0.1 deliverables, JSON source availability and licence boundaries; freeze baseline; document unresolved environment choices; create a development branch.  
**Exit:** architecture decision record; source-to-stage ID map; no production file modified.

### WP01 — Workflow engine / domain model
**Owner:** Codex. **Depends:** WP00.  
Tasks: JSON schema and parser; project, stages, tasks, role assignments, dependencies, evidence refs, approvals, changes, tests, documents and audit schema; exact stage-gate predicates; revision conflict handling; authorisation checks.  
**Exit:** tests show missing evidence, an unapproved N/A, invalid role, stale evidence and a dependency cycle cannot release work.

### WP02 — First vertical slice (MVP)
**Owner:** Codex. **Depends:** WP01.  
Tasks: fictional project intake, task list, task workspace, evidence-reference entry, review workflow and persistence with a simple API; show blockers and next actions; responsive polished UI.  
**Exit:** data survives restart; one complete authorised gate; one rejected gate with clear reason; denied cross-project access; revision conflicts handled.

### WP03 — Exception and recovery loops
**Owner:** Codex with Percy test review. **Depends:** WP02.  
Tasks: change requests and baseline invalidation, issues/defects, failed/aborted tests and linked retests, permit/window expiry, cutover checklist (records only), handover obligations.  
**Exit:** design change reopens impacted approvals; failed and passed attempts both retained; a critical defect blocks release; no automatic site action.

### WP04 — Reference and phpBB cross-linking
**Owner:** Percy/Work curates sources; Codex implements. **Depends:** WP02.  
Tasks: reference registry with access-aware links, verified source metadata, protected versus public references, optional links to message-board topics.  
**Exit:** broken/unauthorised links are explained; licence-restricted documents are never copied into public code; phpBB authentication is not assumed to confer application access.

### WP05 — Public capability section
**Owner:** Percy for copy/design; Codex for HTML/CSS implementation. **Depends:** stage wording confirmed in WP00. Can run in parallel with WP01–WP04.  
Tasks: 11-stage executive summary, readable condensed presentation (possibly grouped into lifecycle bands), service benefits, contact CTA, semantic/responsive page design using existing brand. Prepare on branch/staging, not main/live.  
**Exit:** accurate, mobile-legible, accessible service section; existing homepage and phpBB behaviour unchanged in regression review; James approves public wording.

### WP06 — Security, integration and deployment decision
**Owner:** Percy to coordinate; Codex implements; James/client security authority approves. **Depends:** WP02–WP05.  
Tasks: threat model, hosting capability check (including IONOS), authentication, permission tests, CSRF/XSS/input validation and upload restrictions, TLS/session secrets, encrypted backup/restore, logging/retention, accessibility and performance checks, rollback and deployment procedure.  
**Exit:** approved hosting and information classification; reviewed test results; James authorises promotion to live environment. Prototype success alone is not a production authorisation.

## 7. Codex delivery protocol

Work in an isolated branch; do not commit real client records or credentials. For each work package:
1. Inspect current files and existing v0.1 assets; report any source or environment gap.
2. Write a compact implementation proposal showing files touched and acceptance tests.
3. Implement the smallest vertical slice; add automated tests and test fixtures using invented data.
4. Run tests, lint, build, accessibility/security checks as applicable; report exact commands and results.
5. Submit a PR/diff with screenshots where relevant, risks, migration/rollback notes and outstanding questions.
6. Percy reviews functional fit and requirements; James controls public copy, production deployment and security-critical approvals.

Do not permit agents to represent generated designs or AI summaries as engineering sign-off. Avoid mandatory paid APIs, third-party subscriptions or a new background service before the vertical slice demonstrates value.

## 8. Acceptance test inventory

AT01 Missing required evidence blocks task and gate with exact missing IDs.  
AT02 Checked task without independent review cannot pass.  
AT03 N/A requires named authority and rationale.  
AT04 Unknown critical criterion never becomes pass.  
AT05 Wrong role or forged browser approval is rejected by server.  
AT06 Two edits to same revision produce a recoverable conflict.  
AT07 Cross-project evidence/read/export is denied.  
AT08 Material approved change invalidates stale dependent evidence/approvals.  
AT09 Failed/aborted test cannot pass; linked retest retains original history.  
AT10 Expired permit or change window blocks work release.  
AT11 Critical hold prevents cutover/service release.  
AT12 Project data, evidence links and audit events survive backup/restore.  
AT13 Homepage is responsive/keyboard accessible and does not leak internal records.  
AT14 App/website integration is staged and reversible; phpBB unaffected.

## 9. Coordination and reminders

James Control is the **single coordination record** (no duplicate diary). The existing 14:00 BST, Saturday 10 October 2026 one-off reminder should point to this plan and Codex backlog. When the reminder has fired, close/disable it at the next successful task-housekeeping check. **Do not confuse clearing the reminder with completing the development project.**

At each subsequent Work/Codex session: read this plan, source v0.1 and most recent PR/issue state; review completed WPs against acceptance tests; execute the next unblocked WP; commit source and evidence to controlled locations; update James Control open loop with blocker, owner, next action and verification. Never assume unattended Work/Codex execution merely because a reminder fired.

## 10. Immediate follow-up agenda

A. Confirm available workflow-definition.json and import it verbatim; recover from the existing package if missing.  
B. Audit TACHOS repo, present hosting (IONOS migration versus previous Hostinger account), phpBB and staging setup.  
C. Create WP00 architecture decision record and Codex issue backlog; branch-protect live changes by review procedure.  
D. Implement **WP01 + WP02 only** with fictional data as the first executable milestone.  
E. Draft client-facing homepage copy separately (WP05); publish only after visual/content approval.  
F. Integrate documents and notifications only after evidence/gate mechanics pass automated tests.

## 11. Reference inventory (not code dependencies)

- TACHOS Drive v0.1 pseudocode: https://drive.google.com/file/d/1AIeYB2T3YMSgCicCRlKM9izWJgv-PL-A/view
- Implementation and data specification: https://drive.google.com/file/d/14bMFRbZfqSq3zLZqliABbhf6n9gUCq5A/view
- Source map and decisions: https://drive.google.com/file/d/1HEtvwT32I4ysAoS-cK5Fp35wn4JQaYi6/view
- Visual reference architecture: https://drive.google.com/file/d/1xxAD5y7GkwOE2UV5xSIgn1GO__bSdy1j/view
- BICSI 2019 licensed guide: https://drive.google.com/file/d/1AtWLRA4H5MP8WyZBFP7029peyM2Qfr8c/view (do not republish)
- TACHOS public repository: https://github.com/NiallSeletzky/tachos
- TACHOS website: https://tachos.co.uk/

**Not yet delivered:** running application, approved deployment architecture, live homepage changes, integration, production security review or client commissioning authority.
