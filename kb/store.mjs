import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const WORKING_BASIS_NOTICE =
  'Working basis: These are TACHOS prototype outlines and engineering reference notes to adapt and approve for each contract, not executable site procedures or a claim of standards compliance. Use current client requirements, approved designs, and manufacturer instructions. Lifecycle/documentation foundation: BICSI Essentials of Data Center Projects, 1st ed. (2019), change control p. 3-9; acceptance and closeout pp. 5-16–5-19 (project guide, not a current design specification).';

export const WORK_AREAS = Object.freeze([
  {
    id: 'project-delivery',
    number: 1,
    label: '1 · Project Delivery',
    shortLabel: 'Project Delivery',
    lead: 'Plan and govern the delivery.',
    sourceUrl: 'https://tachos.co.uk/project-delivery.html'
  },
  {
    id: 'rack-stack',
    number: 2,
    label: '2 · Rack & Stack',
    shortLabel: 'Rack & Stack',
    lead: 'Prepare and install the physical platform.',
    sourceUrl: 'https://tachos.co.uk/rack-stack.html'
  },
  {
    id: 'cabling',
    number: 3,
    label: '3 · Cabling & Patch Management',
    shortLabel: 'Cabling & Patch Management',
    lead: 'Connect and verify the infrastructure.',
    sourceUrl: 'https://tachos.co.uk/cabling.html'
  },
  {
    id: 'network',
    number: 4,
    label: '4 · Network Implementation',
    shortLabel: 'Network Implementation',
    lead: 'Implement and validate the network.',
    sourceUrl: 'https://tachos.co.uk/network.html'
  },
  {
    id: 'documentation',
    number: 5,
    label: '5 · Documentation & Handover',
    shortLabel: 'Documentation & Handover',
    lead: 'Maintain evidence, accept and close.',
    sourceUrl: 'https://tachos.co.uk/documentation.html'
  }
]);

export const WORK_AREA_MAP = new Map(WORK_AREAS.map((area) => [area.id, area]));

export function getWorkAreaLabel(workArea) {
  return WORK_AREA_MAP.get(workArea)?.label ?? workArea;
}

const SEED_TIMESTAMP = '2026-10-18T09:00:00.000Z';

export const SEED_ARTICLES = Object.freeze([
  {
    slug: 'project-delivery-governance',
    title: 'Project Delivery: Scope, Readiness & Change Governance',
    workArea: 'project-delivery',
    workAreaLabel: '1 · Project Delivery',
    status: 'engineer_verified',
    summary:
      'Plan and govern data-centre and network delivery from agreed scope, site readiness, responsibilities, risks, and acceptance criteria through controlled change and daily progress tracking.',
    standards: [
      'BICSI Essentials of Data Center Projects, 1st ed. (2019) — lifecycle reference (change control p. 3-9; acceptance and closeout pp. 5-16–5-19)',
      'ISO/IEC 22237 (applicable client-specified requirements shaping the technical plan)',
      'Client specifications, approved designs, and contract governance'
    ],
    deliverables: [
      'Approved work package and site readiness decision',
      'Scope of work and responsibility matrix',
      'Survey notes, programme, and risk/issue log',
      'Traceable change decisions, change register, and daily progress records',
      'Agreed acceptance plan and single document register'
    ],
    checklist: [
      'Confirm scope, exclusions, stakeholders, and acceptance criteria before mobilising.',
      'Survey site readiness, access, dependencies, and delivery constraints.',
      'Establish a single document register with owner, revision, approval, and status.',
      'Agree naming conventions, drawing formats, and acceptance evidence before work starts.',
      'Check scope and dependencies before releasing each work package.',
      'Record any proposed change, assess impact, obtain approval, and update the baseline.'
    ],
    body: [
      '## Overview',
      'Work Area 1 of the TACHOS Five Works methodology establishes governance before physical or logical work starts. Delivery begins with agreed scope, site readiness, clear responsibilities, risk visibility, and measurable acceptance criteria.',
      '',
      '## Standards & Methodology Reference',
      'BICSI data-centre project guidance provides the lifecycle reference; client specifications and applicable ISO/IEC 22237 requirements shape the technical plan.',
      '',
      '## Core Activities',
      '- Confirm scope, exclusions, stakeholders, and acceptance criteria.',
      '- Survey site readiness, access, dependencies, and delivery constraints.',
      '- Maintain the programme, risks, issues, and approved changes throughout delivery.',
      '',
      '## Proposed SOP Outlines',
      '1. Check scope and dependencies before releasing a work package.',
      '2. Record a proposed change; assess technical, commercial, and programme impact; obtain formal approval; update the controlled baseline.',
      '',
      '## Standardisation',
      '- Use a single document register tracking owner, revision, approval, and status.',
      '- Agree naming rules, drawing formats, and acceptance evidence prior to site start.',
      '',
      `## Working Basis`,
      WORKING_BASIS_NOTICE
    ].join('\n'),
    sourceUrl: 'https://tachos.co.uk/project-delivery.html',
    sourceForumTopicId: null,
    verifiedBy: 'TACHOS Engineering',
    verifiedAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    slug: 'rack-and-stack-installation',
    title: 'Rack & Stack: Physical Platform Preparation & Asset Recording',
    workArea: 'rack-stack',
    workAreaLabel: '2 · Rack & Stack',
    status: 'engineer_verified',
    summary:
      'Prepare and install the physical platform against approved rack elevations, site safety procedures, and manufacturer instructions, checking loads, airflow, power, and recording every asset and exception.',
    standards: [
      'Approved rack elevations and site method statements',
      'Equipment-manufacturer installation instructions',
      'BICSI Essentials of Data Center Projects, 1st ed. (2019) — lifecycle reference',
      'Relevant data-centre infrastructure guidance and project specification'
    ],
    deliverables: [
      'Updated rack elevation and serialised asset register',
      'Goods-received and installation checklist',
      'Installation inspection evidence and snag list',
      'Exception log recording approved deviations'
    ],
    checklist: [
      'Validate approved rack elevations, delivery inventory, and installation sequence.',
      'Confirm access, lifting arrangements, and rack readiness before handling equipment.',
      'Check physical space, weight loads, airflow direction, power connections, and cable management.',
      'Apply one consistent rack/U-position notation and equipment identifier scheme.',
      'Follow approved manufacturer instructions and the site method statement for each install.',
      'Record serial numbers, exact U-locations, exceptions, and authorised power-on checks.'
    ],
    body: [
      '## Overview',
      'Work Area 2 prepares and installs the physical rack platform safely and traceably. Every cabinet, rail kit, appliance, PDU, and cable-management component is installed to approved instructions and recorded against the asset register.',
      '',
      '## Standards & Methodology Reference',
      'Installation follows approved rack elevations, site safety procedures, and equipment-manufacturer instructions. Space, loads, airflow, power connections, and cable management are verified and recorded against the project specification and relevant data-centre infrastructure guidance.',
      '',
      '## Core Activities',
      '- Validate approved rack elevations, delivery inventory, and installation sequence.',
      '- Install equipment and cable-management components to approved instructions.',
      '- Record serials, locations, exceptions, and authorised power-on checks.',
      '',
      '## Proposed SOP Outlines',
      '1. Confirm access, lifting arrangements, and rack readiness before handling equipment.',
      '2. Inspect, install, identify, and check each item; record any deviations in the exception log for formal approval.',
      '',
      '## Standardisation',
      '- Use one rack/U-position notation and equipment identifier scheme across elevations, labels, and registers.',
      '- Follow approved manufacturer instructions and the site method statement without unapproved improvisation.',
      '',
      '## Working Basis',
      WORKING_BASIS_NOTICE
    ].join('\n'),
    sourceUrl: 'https://tachos.co.uk/rack-stack.html',
    sourceForumTopicId: null,
    verifiedBy: 'TACHOS Engineering',
    verifiedAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    slug: 'cabling-patch-management',
    title: 'Cabling & Patch Management: Structured Routes, Fibre Testing & Verification',
    workArea: 'cabling',
    workAreaLabel: '3 · Cabling & Patch Management',
    status: 'engineer_verified',
    summary:
      'Connect and verify copper and optical infrastructure from approved cable routes, port schedules, and labelling rules, using ISO/IEC 11801 and ISO/IEC 14763-3 as structured cabling and fibre testing references where applicable.',
    standards: [
      'ISO/IEC 11801 (structured-cabling reference where applicable)',
      'ISO/IEC 14763-3 (agreed fibre testing methods informed by ISO/IEC 14763-3)',
      'BICSI Essentials of Data Center Projects, 1st ed. (2019) — lifecycle reference',
      'Approved site labelling rules and manufacturer installation practices'
    ],
    deliverables: [
      'Verified connection matrix and test evidence',
      'Cable schedule and patching matrix',
      'As-built route mark-ups and label register',
      'Test results and defect/retest records'
    ],
    checklist: [
      'Confirm routes, port assignments, cable types, and approved connection schedule.',
      'Agree cable IDs, endpoint notation, label format, and test-result naming before installation.',
      'Verify both endpoints and the approved containment/pathway route before pulling or patching.',
      'Inspect and clean optical connectors where applicable prior to mating.',
      'Test each connection against the agreed acceptance plan and record pass/fail results.',
      'Resolve defects, retest, and keep the connection matrix aligned with physical labels and approved changes.'
    ],
    body: [
      '## Overview',
      'Work Area 3 connects and verifies the physical structured cabling and patching layer so every circuit is traceable from port schedule to physical label and test trace.',
      '',
      '## Standards & Methodology Reference',
      'We work from approved cable routes, port schedules, and labelling rules, with ISO/IEC 11801 as a structured-cabling reference where applicable. Each connection is identified, inspected, and tested; fibre testing follows agreed methods informed by ISO/IEC 14763-3, with results and corrective work recorded.',
      '',
      '## Core Activities',
      '- Confirm routes, port assignments, cable types, and approved connection schedule.',
      '- Install and identify cabling using approved site and manufacturer practices.',
      '- Inspect and test against the agreed acceptance plan; record results and faults.',
      '',
      '## Proposed SOP Outlines',
      '1. Verify both endpoints and the approved route before installation.',
      '2. Inspect/clean where applicable; connect; test; record result; resolve and retest defects.',
      '',
      '## Standardisation',
      '- Agree cable IDs, endpoint notation, label format, and test-result naming upfront.',
      '- Keep the connection matrix and physical labels continuously aligned with approved changes.',
      '',
      '## Working Basis',
      WORKING_BASIS_NOTICE
    ].join('\n'),
    sourceUrl: 'https://tachos.co.uk/cabling.html',
    sourceForumTopicId: null,
    verifiedBy: 'TACHOS Engineering',
    verifiedAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    slug: 'network-implementation-validation',
    title: 'Network Implementation: Change Windows, Rollback & Validation',
    workArea: 'network',
    workAreaLabel: '4 · Network Implementation',
    status: 'engineer_verified',
    summary:
      'Implement and validate network infrastructure from an approved topology, addressing plan, and configuration baseline using authorised change windows, pre-checks, rollback criteria, and service-acceptance tests.',
    standards: [
      'IEEE 802.3 Ethernet (relevant Ethernet requirements)',
      'Vendor deployment and software-baseline guidance',
      'BICSI Essentials of Data Center Projects, 1st ed. (2019) — lifecycle reference',
      'Client service-acceptance criteria and authorised change control'
    ],
    deliverables: [
      'Approved implementation and rollback plan',
      'Validated implementation and change evidence',
      'Configuration/version register and change record',
      'Updated topology, configuration inventory, and unresolved issues log'
    ],
    checklist: [
      'Verify approved topology, addressing plan, and configuration/firmware baseline.',
      'Confirm change approval, authorised maintenance window, rollback criteria, and pre-checks.',
      'Use consistent device/interface naming and approved configuration templates.',
      'Keep credentials and client configurations strictly inside authorised private systems.',
      'Apply authorised changes within the window and validate connectivity, redundancy, and service acceptance.',
      'Roll back immediately if validation criteria fail, and record the final outcome and evidence.'
    ],
    body: [
      '## Overview',
      'Work Area 4 transitions installed hardware and verified links into an operational, validated network under disciplined change control.',
      '',
      '## Standards & Methodology Reference',
      'Deployment begins with an approved topology, addressing plan, and configuration baseline. We use authorised change windows, pre-checks, documented rollback criteria, and validation tests, applying relevant IEEE 802.3 Ethernet requirements, vendor guidance, and the client\'s service-acceptance criteria.',
      '',
      '## Core Activities',
      '- Check approved design, addressing, and configuration baseline.',
      '- Implement authorised changes within the agreed change window.',
      '- Validate connectivity, redundancy, and service acceptance within scope.',
      '',
      '## Proposed SOP Outlines',
      '1. Confirm approval, maintenance window, rollback criteria, and pre-checks.',
      '2. Apply the change; validate against acceptance tests; roll back if criteria fail; record the outcome.',
      '',
      '## Standardisation',
      '- Use consistent device and interface names alongside approved configuration templates.',
      '- Keep credentials and client configurations strictly within authorised private systems.',
      '',
      '## Working Basis',
      WORKING_BASIS_NOTICE
    ].join('\n'),
    sourceUrl: 'https://tachos.co.uk/network.html',
    sourceForumTopicId: null,
    verifiedBy: 'TACHOS Engineering',
    verifiedAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    slug: 'documentation-handover-closeout',
    title: 'Documentation & Handover: As-Builts, Snag Closeout & Controlled Archive',
    workArea: 'documentation',
    workAreaLabel: '5 · Documentation & Handover',
    status: 'engineer_verified',
    summary:
      'Maintain version-controlled as-built drawings, rack elevations, patching matrices, test evidence, and change records continuously during installation, then reconcile snags and obtain formal handover sign-off.',
    standards: [
      'BICSI Essentials of Data Center Projects, 1st ed. (2019) — acceptance and closeout pp. 5-16–5-19',
      'Controlled document register (owner, revision, approval status, storage location)',
      'Agreed client acceptance plan and handover format requirements'
    ],
    deliverables: [
      'Approved handover pack and formal sign-off record',
      'As-built drawings, rack elevations, and reconciled patching matrix',
      'Acceptance/test evidence and snag closeout register',
      'O&M information, warranties, controlled archive, and outstanding-action owners'
    ],
    checklist: [
      'Capture as-built changes continuously during installation rather than reconstructing at closeout.',
      'Maintain document owner, revision, approval status, and controlled storage location.',
      'Audit the deliverables register against the agreed acceptance plan.',
      'Resolve snags and evidence gaps, then obtain formal owner sign-off.',
      'Transfer agreed O&M information and warranties in the agreed final formats.',
      'Retain superseded revisions in the controlled archive and record any remaining action owners.'
    ],
    body: [
      '## Overview',
      'Work Area 5 ensures operations teams receive accurate, reconciled, and verifiable documentation rather than an end-of-project scramble. Documentation begins during installation, not at the end.',
      '',
      '## Standards & Methodology Reference',
      'We maintain version-controlled drawings, rack elevations, cable schedules, test evidence, and change records; then reconcile as-builts, resolve snags, and obtain sign-off against the agreed acceptance plan, informed by BICSI project closeout guidance.',
      '',
      '## Core Activities',
      '- Capture as-built changes throughout the work.',
      '- Resolve snags, assemble acceptance evidence, and confirm owner sign-off.',
      '- Transfer agreed operating information and archive the final approved pack.',
      '',
      '## Proposed SOP Outlines',
      '1. Check the deliverables register against the agreed acceptance plan.',
      '2. Resolve gaps; obtain formal approval; hand over the controlled pack; record remaining obligations.',
      '',
      '## Standardisation',
      '- Maintain document owner, revision, approval status, and storage location in the controlled register.',
      '- Use agreed final formats and retain superseded revisions in the controlled archive.',
      '',
      '## Working Basis',
      WORKING_BASIS_NOTICE
    ].join('\n'),
    sourceUrl: 'https://tachos.co.uk/documentation.html',
    sourceForumTopicId: null,
    verifiedBy: 'TACHOS Engineering',
    verifiedAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    slug: 'om4-vs-os2-fibre-polarity-loss-budget',
    title: 'OM4 vs OS2 Fibre Polarity & Loss Budget Checklist',
    workArea: 'cabling',
    workAreaLabel: '3 · Cabling & Patch Management',
    status: 'ai_drafted',
    summary:
      'AI-drafted field reference comparing OM4 multimode and OS2 single-mode trunk selection, MPO/MTP polarity (Type A/B/C), optical end-face inspection, and Tier 1 OLTS / Tier 2 OTDR loss-budget verification informed by ISO/IEC 11801 and ISO/IEC 14763-3.',
    standards: [
      'ISO/IEC 11801 (structured-cabling reference where applicable)',
      'ISO/IEC 14763-3 (optical fibre testing methods reference)',
      'IEC 61300-3-35 (optical connector end-face inspection reference)',
      'IEEE 802.3 optical transceiver specifications and manufacturer trunk datasheets'
    ],
    deliverables: [
      'Channel optical loss budget calculation sheet per link class',
      'MPO/MTP and LC polarity schedule (Type A, B, or C verification)',
      'Connector end-face inspection log and bidirectional OLTS/OTDR test traces',
      'Defect, cleaning, and retest log matched to physical cable IDs'
    ],
    checklist: [
      'Confirm target transceiver optics and speeds (e.g. 25G/100G/400G SR/SR4/SR8 on OM4 vs DR/FR/LR on OS2) and verify maximum reach before procuring trunks.',
      'Lock one MPO/MTP polarity method (Type A, Type B, or Type C) and confirm key-up/key-down adapters across cassettes and patch leads.',
      'Verify APC (angled, typically green) vs UPC (flat, typically blue/aqua) polish compatibility — never mate APC to UPC.',
      'Inspect and dry-clean every fibre end-face before mating and before taking reference or link measurements.',
      'Calibrate OLTS reference cords using the agreed reference method (1-cord / 3-cord per client acceptance plan) and measure bidirectional attenuation at both operational wavelengths.',
      'Compare measured loss against the approved project link budget, investigate any marginal connector or macrobend, and archive serialised traces by cable ID.'
    ],
    body: [
      '## AI-Drafted Technical Reference (Pending Engineer Verification)',
      'This checklist provides a structured starting point for data-centre optical trunk selection, polarity verification, and acceptance testing. Adapt and verify all limits against the approved client design, transceiver specifications, and manufacturer datasheets.',
      '',
      '## OM4 Multimode vs OS2 Single-Mode Selection',
      '- **OM4 (50/125 µm multimode, 850/1300 nm):** Commonly used for short-reach intra-row or intra-hall interconnects where SR/SR4/SR8 optics offer lower transceiver cost, subject to strict modal-bandwidth distance limits at 100G/400G/800G.',
      '- **OS2 (9/125 µm single-mode, 1310/1550 nm):** Preferred for longer spine-leaf runs, cross-hall/campus risers, and higher-rate 400G/800G DR4/FR4/LR4 optical roadmaps where future speed upgrades should avoid re-cabling.',
      '',
      '## MPO/MTP Polarity Control',
      '- Document whether the structured link uses **Method A** (straight-through trunk, key-up to key-down, A-to-A and A-to-B duplex patch leads), **Method B** (reversed trunk, key-up to key-up, standard A-to-B duplex patch leads), or **Method C** (pair-wise flipped trunk).',
      '- Never mix polarity methods across pods or migration phases without explicit design documentation and port-level labelling.',
      '',
      '## Loss Budget & Testing Planning',
      '- Calculate the allowed channel budget from approved fibre attenuation (dB/km), mated connector pair allowances, and splice allowances in the client specification, ensuring adequate margin below transceiver optical budget.',
      '- Perform end-face inspection and cleaning prior to every mating, record bidirectional Tier 1 OLTS loss (and Tier 2 OTDR traces where specified in the acceptance plan), and log all remedial cleaning/retests.',
      '',
      '## Working Basis',
      WORKING_BASIS_NOTICE
    ].join('\n'),
    sourceUrl: 'https://tachos.co.uk/cabling.html',
    sourceForumTopicId: null,
    verifiedBy: null,
    verifiedAt: null,
    updatedAt: SEED_TIMESTAMP
  },
  {
    slug: 'high-density-ai-rack-power-cooling-handover',
    title: 'High-Density AI Rack Power, Cooling & Handover Readiness',
    workArea: 'rack-stack',
    workAreaLabel: '2 · Rack & Stack',
    status: 'ai_drafted',
    summary:
      'AI-drafted readiness checklist for 30 kW–100+ kW AI/GPU racks covering structural floor loading, dual-feed three-phase PDU/busway coordination, airflow or liquid-cooling manifold sign-off, dense optical harness management, and handover evidence.',
    standards: [
      'Approved rack elevations, mechanical/electrical designs, and site RAMS',
      'ISO/IEC 22237 (applicable client-specified facility requirements)',
      'Manufacturer chassis, PDU, and cooling installation manuals',
      'BICSI Essentials of Data Center Projects, 1st ed. (2019) — readiness and closeout reference'
    ],
    deliverables: [
      'Confirmed floor-loading, delivery-route, and cabinet anchoring sign-off',
      'Dual-feed A/B PDU power schedule and three-phase load balance record',
      'Airflow containment inspection or client-approved cooling manifold witness record',
      'Updated rack elevation, serialised asset register, exception log, and snag closeout pack'
    ],
    checklist: [
      'Verify slab or raised-floor point-load limits, ramp/lift capacity, and mechanical lifting plan before moving heavy GPU/AI racks (often 900–1,500+ kg populated).',
      'Confirm dual A/B power feeds, busway tap-off or whip receptacle types, breaker ratings, and phase-balance allocation against the approved electrical schedule.',
      'Inspect physical thermal readiness: blanking panels, brush grommets, aisle containment seals, or facility-approved liquid-cooling quick-disconnect and leak-detection sign-offs prior to energisation.',
      'Route high-density DAC, AOC, and MPO optical harnesses without obstructing rear exhaust airflow or violating minimum cable bend radii.',
      'Record chassis/GPU node serial numbers, BMC/management port patching, and authorised staged power-on checks in the asset register.',
      'Log any mechanical, electrical, or cooling deviations in the exception register and resolve snags before formal handover sign-off.'
    ],
    body: [
      '## AI-Drafted Technical Reference (Pending Engineer Verification)',
      'High-density AI and GPU clusters compress mechanical load, three-phase power density, thermal rejection, and high-count optical interconnects into every cabinet. Use this checklist to coordinate site readiness and handover evidence with client facilities and hardware vendors.',
      '',
      '## Physical & Mechanical Readiness',
      '- Confirm delivery-bay-to-white-space floor loading, doorway clearances, and approved mechanical lifting equipment before uncrating pre-integrated cabinets.',
      '- Verify cabinet levelling, seismic/floor anchoring (where specified), and front/rear service clearances for deep GPU chassis and power shelves.',
      '',
      '## Power & Thermal Coordination',
      '- Reconcile A/B feed redundancy, three-phase load balancing across PDU banks, and power cord retention locking clips before authorised power-on.',
      '- For air-cooled high-density rows, verify complete blanking and containment integrity; for direct-to-chip or rear-door liquid-cooled cabinets, confirm facility commissioning, flush/fill certification, and leak-detection alarm sign-off with the responsible mechanical contractor.',
      '',
      '## High-Count Optical & Handover Discipline',
      '- Separate power whips from rear optical/DAC bundles to preserve exhaust flow and serviceability during transceiver or node replacement.',
      '- Capture as-built elevations, port matrices, serialised asset lists, and test evidence continuously during installation so handover closeout stays audit-ready.',
      '',
      '## Working Basis',
      WORKING_BASIS_NOTICE
    ].join('\n'),
    sourceUrl: 'https://tachos.co.uk/rack-stack.html',
    sourceForumTopicId: null,
    verifiedBy: null,
    verifiedAt: null,
    updatedAt: SEED_TIMESTAMP
  }
]);

function safeJsonParse(raw, fallback) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function tokenizeQuery(text) {
  if (!text || typeof text !== 'string') return [];
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from',
    'how', 'in', 'is', 'it', 'of', 'on', 'or', 'should', 'that', 'the',
    'to', 'we', 'what', 'when', 'where', 'which', 'with', 'you'
  ]);
  const matches = text.toLowerCase().match(/[a-z0-9][a-z0-9._/-]{1,}/g) ?? [];
  const tokens = [];
  for (const token of matches) {
    const cleaned = token.replace(/^[-./]+|[-./]+$/g, '');
    if (cleaned.length >= 2 && !stopWords.has(cleaned)) {
      tokens.push(cleaned);
    }
  }
  return [...new Set(tokens)];
}

function scoreTextMatch(tokens, fullQueryLower, fields) {
  if (tokens.length === 0 && !fullQueryLower) return 1;
  let score = 0;
  for (const { text, weight } of fields) {
    if (!text) continue;
    const hay = String(text).toLowerCase();
    if (fullQueryLower && fullQueryLower.length >= 3 && hay.includes(fullQueryLower)) {
      score += weight * 3;
    }
    for (const token of tokens) {
      if (hay.includes(token)) {
        score += weight;
      }
    }
  }
  return score;
}

function mapArticleRow(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    workArea: row.work_area,
    workAreaLabel: row.work_area_label,
    status: row.status,
    summary: row.summary,
    standards: safeJsonParse(row.standards_json, []),
    deliverables: safeJsonParse(row.deliverables_json, []),
    checklist: safeJsonParse(row.checklist_json, []),
    body: row.body,
    sourceUrl: row.source_url ?? null,
    sourceForumTopicId: row.source_forum_topic_id ?? null,
    verifiedBy: row.verified_by ?? null,
    verifiedAt: row.verified_at ?? null,
    verificationNotes: row.verification_notes ?? null,
    updatedAt: row.updated_at
  };
}

function mapBoardRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    url: row.url,
    topicCount: row.topic_count,
    postCount: row.post_count,
    isAiBoard: Boolean(row.is_ai_board),
    syncedAt: row.synced_at
  };
}

function mapTopicRow(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    author: row.author,
    url: row.url,
    replies: row.replies,
    views: row.views,
    lastPostAt: row.last_post_at ?? null,
    excerpt: row.excerpt,
    syncedAt: row.synced_at
  };
}

function mapPostRow(row) {
  return {
    id: row.id,
    topicId: row.topic_id,
    boardId: row.board_id,
    author: row.author,
    postedAt: row.posted_at ?? null,
    body: row.body,
    url: row.url,
    isAiAssistant: Boolean(row.is_ai_assistant),
    syncedAt: row.synced_at
  };
}

function mapInquiryRow(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    workAreas: safeJsonParse(row.work_areas_json, []),
    region: row.region,
    scope: row.scope,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapDocumentRow(row) {
  if (!row) return null;
  const workArea = row.work_area || 'documentation';
  return {
    id: Number(row.id),
    externalId: row.external_id,
    source: row.source,
    folderName: row.folder_name || '',
    title: row.title,
    mimeType: row.mime_type || '',
    workArea,
    workAreaLabel: getWorkAreaLabel(workArea),
    sourceUrl: row.source_url || '',
    modifiedTime: row.modified_time || '',
    contentHash: row.content_hash || '',
    rawExcerpt: row.raw_excerpt || '',
    chunkCount: Number(row.chunk_count ?? 0),
    metadata: safeJsonParse(row.metadata_json, {}),
    indexedAt: row.indexed_at
  };
}

function buildSafeFtsQuery(query) {
  const rawTokens = tokenizeQuery(query);
  const terms = [];
  const seen = new Set();
  for (const raw of rawTokens) {
    const subTokens = raw.split(/[^a-z0-9]+/i).filter((t) => t.length >= 2);
    for (const sub of subTokens) {
      const lower = sub.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        terms.push(`"${lower}"`);
      }
      if (terms.length >= 16) break;
    }
    if (terms.length >= 16) break;
  }
  return terms.join(' OR ');
}

function buildChunkSnippet(content, tokens = [], maxLen = 280) {
  const collapsed = String(content || '').replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  if (collapsed.length <= maxLen) return collapsed;

  const lower = collapsed.toLowerCase();
  let bestIdx = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx <= 40) {
    return `${collapsed.slice(0, maxLen - 1).trimEnd()}…`;
  }
  const start = Math.max(0, bestIdx - 60);
  const end = Math.min(collapsed.length, start + maxLen - 2);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < collapsed.length ? '…' : '';
  return `${prefix}${collapsed.slice(start, end).trim()}${suffix}`;
}

export class TachosKbStore {
  constructor(options = {}) {
    const defaultPath = path.join(__dirname, 'data', 'tachos-kb.db');
    this.dbPath = options.dbPath ?? process.env.TACHOS_DB_PATH ?? defaultPath;
    if (this.dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(this.dbPath);
    this._configurePragmas();
    this._initSchema();
    if (options.seed !== false) {
      this._seedDefaultArticles();
    }
  }

  _configurePragmas() {
    this.db.exec('PRAGMA busy_timeout = 5000;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (this.dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    }
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        work_area TEXT NOT NULL,
        work_area_label TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ai_drafted' CHECK (status IN ('engineer_verified', 'ai_drafted')),
        summary TEXT NOT NULL,
        standards_json TEXT NOT NULL DEFAULT '[]',
        deliverables_json TEXT NOT NULL DEFAULT '[]',
        checklist_json TEXT NOT NULL DEFAULT '[]',
        body TEXT NOT NULL,
        source_url TEXT,
        source_forum_topic_id TEXT,
        verified_by TEXT,
        verified_at TEXT,
        verification_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_articles_work_area ON articles(work_area);
      CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);

      CREATE TABLE IF NOT EXISTS forum_boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        topic_count INTEGER NOT NULL DEFAULT 0,
        post_count INTEGER NOT NULL DEFAULT 0,
        is_ai_board INTEGER NOT NULL DEFAULT 0,
        synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS forum_topics (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        replies INTEGER NOT NULL DEFAULT 0,
        views INTEGER NOT NULL DEFAULT 0,
        last_post_at TEXT,
        excerpt TEXT NOT NULL DEFAULT '',
        synced_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_forum_topics_board ON forum_topics(board_id);

      CREATE TABLE IF NOT EXISTS forum_posts (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL,
        board_id TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        posted_at TEXT,
        body TEXT NOT NULL,
        url TEXT NOT NULL,
        is_ai_assistant INTEGER NOT NULL DEFAULT 0,
        synced_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts(topic_id);

      CREATE TABLE IF NOT EXISTS inquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL,
        work_areas_json TEXT NOT NULL DEFAULT '[]',
        region TEXT NOT NULL DEFAULT '',
        scope TEXT NOT NULL,
        client_ip_hash TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);

      CREATE TABLE IF NOT EXISTS curator_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ran_at TEXT NOT NULL,
        summary_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kb_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        folder_name TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT '',
        work_area TEXT NOT NULL DEFAULT 'documentation',
        source_url TEXT NOT NULL DEFAULT '',
        modified_time TEXT NOT NULL DEFAULT '',
        content_hash TEXT NOT NULL DEFAULT '',
        raw_excerpt TEXT NOT NULL DEFAULT '',
        chunk_count INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        indexed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_kb_documents_work_area ON kb_documents(work_area);
      CREATE INDEX IF NOT EXISTS idx_kb_documents_source ON kb_documents(source);

      CREATE TABLE IF NOT EXISTS kb_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        heading TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        char_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(document_id, chunk_index)
      );

      CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON kb_chunks(document_id);

      CREATE TABLE IF NOT EXISTS web_research_cache (
        cache_key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_web_research_cache_expires ON web_research_cache(expires_at);
    `);

    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS kb_chunks_fts USING fts5(
          title,
          folder_name,
          heading,
          content,
          tokenize='porter unicode61'
        );
      `);
      this.ftsEnabled = true;
    } catch {
      this.ftsEnabled = false;
    }
  }

  _seedDefaultArticles() {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO articles (
        slug, title, work_area, work_area_label, status, summary,
        standards_json, deliverables_json, checklist_json, body,
        source_url, source_forum_topic_id, verified_by, verified_at,
        verification_notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `);
    for (const article of SEED_ARTICLES) {
      insert.run(
        article.slug,
        article.title,
        article.workArea,
        article.workAreaLabel,
        article.status,
        article.summary,
        JSON.stringify(article.standards),
        JSON.stringify(article.deliverables),
        JSON.stringify(article.checklist),
        article.body,
        article.sourceUrl,
        article.sourceForumTopicId,
        article.verifiedBy,
        article.verifiedAt,
        null,
        article.updatedAt,
        article.updatedAt
      );
    }
  }

  getStats() {
    const articleCounts = this.db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'engineer_verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN status = 'ai_drafted' THEN 1 ELSE 0 END) AS drafted
      FROM articles
    `).get();
    const forumTopics = this.db.prepare('SELECT COUNT(*) AS count FROM forum_topics').get();
    const forumPosts = this.db.prepare('SELECT COUNT(*) AS count FROM forum_posts').get();
    const inquiries = this.db.prepare('SELECT COUNT(*) AS count FROM inquiries').get();
    const documents = this.db.prepare('SELECT COUNT(*) AS count FROM kb_documents').get();
    const documentChunks = this.db.prepare('SELECT COUNT(*) AS count FROM kb_chunks').get();
    return {
      articles: Number(articleCounts?.total ?? 0),
      verifiedArticles: Number(articleCounts?.verified ?? 0),
      aiDraftedArticles: Number(articleCounts?.drafted ?? 0),
      forumTopics: Number(forumTopics?.count ?? 0),
      forumPosts: Number(forumPosts?.count ?? 0),
      inquiries: Number(inquiries?.count ?? 0),
      documents: Number(documents?.count ?? 0),
      documentChunks: Number(documentChunks?.count ?? 0)
    };
  }

  listArticles({ workArea, status, q, limit } = {}) {
    const clauses = [];
    const params = [];
    if (workArea) {
      clauses.push('work_area = ?');
      params.push(String(workArea));
    }
    if (status) {
      clauses.push('status = ?');
      params.push(String(status));
    }
    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT * FROM articles ${whereSql} ORDER BY CASE status WHEN 'engineer_verified' THEN 0 ELSE 1 END, updated_at DESC, slug ASC`)
      .all(...params);

    let articles = rows.map(mapArticleRow);
    const trimmedQ = typeof q === 'string' ? q.trim() : '';
    if (trimmedQ) {
      const tokens = tokenizeQuery(trimmedQ);
      const queryLower = trimmedQ.toLowerCase();
      articles = articles
        .map((article) => {
          const score = scoreTextMatch(tokens, queryLower, [
            { text: article.title, weight: 8 },
            { text: article.slug, weight: 6 },
            { text: article.summary, weight: 5 },
            { text: article.standards.join(' '), weight: 4 },
            { text: article.checklist.join(' '), weight: 3 },
            { text: article.deliverables.join(' '), weight: 3 },
            { text: article.body, weight: 2 },
            { text: article.workAreaLabel, weight: 2 }
          ]);
          const statusBoost = article.status === 'engineer_verified' ? 1.5 : 0;
          return { article, score: score > 0 ? score + statusBoost : 0 };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.article);
    }

    const parsedLimit = Number(limit);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      articles = articles.slice(0, Math.min(parsedLimit, 100));
    }
    return articles;
  }

  getArticleBySlug(slug) {
    if (!slug || typeof slug !== 'string') return null;
    const row = this.db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug.trim());
    return mapArticleRow(row);
  }

  upsertArticle(input, { allowDowngradeVerified = false } = {}) {
    const now = new Date().toISOString();
    const existing = this.getArticleBySlug(input.slug);
    if (existing && existing.status === 'engineer_verified' && input.status === 'ai_drafted' && !allowDowngradeVerified) {
      return existing;
    }

    const workArea = WORK_AREA_MAP.has(input.workArea) ? input.workArea : 'project-delivery';
    const workAreaLabel = input.workAreaLabel || getWorkAreaLabel(workArea);
    const status = input.status === 'engineer_verified' ? 'engineer_verified' : 'ai_drafted';
    const verifiedBy = status === 'engineer_verified' ? (input.verifiedBy || existing?.verifiedBy || 'TACHOS Engineering') : null;
    const verifiedAt = status === 'engineer_verified' ? (input.verifiedAt || existing?.verifiedAt || now) : null;

    this.db.prepare(`
      INSERT INTO articles (
        slug, title, work_area, work_area_label, status, summary,
        standards_json, deliverables_json, checklist_json, body,
        source_url, source_forum_topic_id, verified_by, verified_at,
        verification_notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        work_area = excluded.work_area,
        work_area_label = excluded.work_area_label,
        status = excluded.status,
        summary = excluded.summary,
        standards_json = excluded.standards_json,
        deliverables_json = excluded.deliverables_json,
        checklist_json = excluded.checklist_json,
        body = excluded.body,
        source_url = excluded.source_url,
        source_forum_topic_id = excluded.source_forum_topic_id,
        verified_by = excluded.verified_by,
        verified_at = excluded.verified_at,
        verification_notes = excluded.verification_notes,
        updated_at = excluded.updated_at
    `).run(
      input.slug,
      input.title,
      workArea,
      workAreaLabel,
      status,
      input.summary || '',
      JSON.stringify(Array.isArray(input.standards) ? input.standards : []),
      JSON.stringify(Array.isArray(input.deliverables) ? input.deliverables : []),
      JSON.stringify(Array.isArray(input.checklist) ? input.checklist : []),
      input.body || '',
      input.sourceUrl ?? null,
      input.sourceForumTopicId ? String(input.sourceForumTopicId) : null,
      verifiedBy,
      verifiedAt,
      input.verificationNotes ?? existing?.verificationNotes ?? null,
      existing ? existing.updatedAt : now,
      now
    );

    return this.getArticleBySlug(input.slug);
  }

  verifyArticle(slug, { verifiedBy, status = 'engineer_verified', notes } = {}) {
    const existing = this.getArticleBySlug(slug);
    if (!existing) return null;
    if (status !== 'engineer_verified' && status !== 'ai_drafted') {
      const err = new Error('Invalid status. Expected engineer_verified or ai_drafted.');
      err.statusCode = 400;
      throw err;
    }
    const now = new Date().toISOString();
    const nextVerifiedBy = status === 'engineer_verified'
      ? (typeof verifiedBy === 'string' && verifiedBy.trim() ? verifiedBy.trim() : 'TACHOS Engineering')
      : null;
    const nextVerifiedAt = status === 'engineer_verified' ? now : null;
    const nextNotes = typeof notes === 'string' ? notes.trim() : existing.verificationNotes;

    this.db.prepare(`
      UPDATE articles
      SET status = ?, verified_by = ?, verified_at = ?, verification_notes = ?, updated_at = ?
      WHERE slug = ?
    `).run(status, nextVerifiedBy, nextVerifiedAt, nextNotes, now, existing.slug);

    return this.getArticleBySlug(existing.slug);
  }

  upsertForumBoards(boards = [], aiBoardId = '') {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO forum_boards (id, name, description, url, topic_count, post_count, is_ai_board, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        url = excluded.url,
        topic_count = excluded.topic_count,
        post_count = excluded.post_count,
        is_ai_board = excluded.is_ai_board,
        synced_at = excluded.synced_at
    `);
    for (const board of boards) {
      if (!board?.id) continue;
      const isAi = aiBoardId ? String(board.id) === String(aiBoardId) : Boolean(board.isAiBoard);
      stmt.run(
        String(board.id),
        String(board.name || `Board ${board.id}`),
        String(board.description || ''),
        String(board.url || ''),
        Number.isFinite(Number(board.topicCount)) ? Number(board.topicCount) : 0,
        Number.isFinite(Number(board.postCount)) ? Number(board.postCount) : 0,
        isAi ? 1 : 0,
        now
      );
    }
    return this.listForumBoards();
  }

  listForumBoards() {
    const rows = this.db.prepare('SELECT * FROM forum_boards ORDER BY CAST(id AS INTEGER) ASC, name ASC').all();
    return rows.map(mapBoardRow);
  }

  upsertForumTopics(topics = []) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO forum_topics (id, board_id, title, author, url, replies, views, last_post_at, excerpt, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        board_id = excluded.board_id,
        title = excluded.title,
        author = excluded.author,
        url = excluded.url,
        replies = excluded.replies,
        views = excluded.views,
        last_post_at = COALESCE(excluded.last_post_at, forum_topics.last_post_at),
        excerpt = CASE WHEN excluded.excerpt != '' THEN excluded.excerpt ELSE forum_topics.excerpt END,
        synced_at = excluded.synced_at
    `);
    for (const topic of topics) {
      if (!topic?.id) continue;
      stmt.run(
        String(topic.id),
        String(topic.boardId ?? ''),
        String(topic.title || `Topic ${topic.id}`),
        String(topic.author || ''),
        String(topic.url || ''),
        Number.isFinite(Number(topic.replies)) ? Number(topic.replies) : 0,
        Number.isFinite(Number(topic.views)) ? Number(topic.views) : 0,
        topic.lastPostAt ? String(topic.lastPostAt) : null,
        String(topic.excerpt || ''),
        now
      );
    }
  }

  listForumTopics({ boardId, limit = 20 } = {}) {
    const parsedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    if (boardId) {
      const rows = this.db
        .prepare('SELECT * FROM forum_topics WHERE board_id = ? ORDER BY COALESCE(last_post_at, synced_at) DESC, CAST(id AS INTEGER) DESC LIMIT ?')
        .all(String(boardId), parsedLimit);
      return rows.map(mapTopicRow);
    }
    const rows = this.db
      .prepare('SELECT * FROM forum_topics ORDER BY COALESCE(last_post_at, synced_at) DESC, CAST(id AS INTEGER) DESC LIMIT ?')
      .all(parsedLimit);
    return rows.map(mapTopicRow);
  }

  getForumTopic(topicId) {
    if (!topicId) return null;
    const row = this.db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(String(topicId));
    return row ? mapTopicRow(row) : null;
  }

  upsertForumPosts(posts = []) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO forum_posts (id, topic_id, board_id, author, posted_at, body, url, is_ai_assistant, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        topic_id = excluded.topic_id,
        board_id = CASE WHEN excluded.board_id != '' THEN excluded.board_id ELSE forum_posts.board_id END,
        author = excluded.author,
        posted_at = COALESCE(excluded.posted_at, forum_posts.posted_at),
        body = excluded.body,
        url = excluded.url,
        is_ai_assistant = excluded.is_ai_assistant,
        synced_at = excluded.synced_at
    `);
    for (const post of posts) {
      if (!post?.id || !post?.topicId) continue;
      stmt.run(
        String(post.id),
        String(post.topicId),
        String(post.boardId ?? ''),
        String(post.author || ''),
        post.postedAt ? String(post.postedAt) : null,
        String(post.body || ''),
        String(post.url || ''),
        post.isAiAssistant ? 1 : 0,
        now
      );
    }
  }

  listForumPosts(topicId) {
    if (!topicId) return [];
    const rows = this.db
      .prepare('SELECT * FROM forum_posts WHERE topic_id = ? ORDER BY COALESCE(posted_at, synced_at) ASC, CAST(id AS INTEGER) ASC')
      .all(String(topicId));
    return rows.map(mapPostRow);
  }

  searchForumPosts(query, { limit = 5 } = {}) {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    const tokens = tokenizeQuery(trimmed);
    const queryLower = trimmed.toLowerCase();
    const rows = this.db.prepare(`
      SELECT
        p.*,
        t.title AS topic_title,
        t.url AS topic_url
      FROM forum_posts p
      LEFT JOIN forum_topics t ON t.id = p.topic_id
      ORDER BY COALESCE(p.posted_at, p.synced_at) DESC
      LIMIT 250
    `).all();

    if (!trimmed) {
      return rows.slice(0, limit).map((row) => ({
        ...mapPostRow(row),
        topicTitle: row.topic_title || `Forum Topic #${row.topic_id}`,
        topicUrl: row.topic_url || row.url
      }));
    }

    return rows
      .map((row) => {
        const score = scoreTextMatch(tokens, queryLower, [
          { text: row.topic_title, weight: 6 },
          { text: row.body, weight: 3 },
          { text: row.author, weight: 1 }
        ]);
        return {
          score,
          post: {
            ...mapPostRow(row),
            topicTitle: row.topic_title || `Forum Topic #${row.topic_id}`,
            topicUrl: row.topic_url || row.url
          }
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.post);
  }

  upsertDocument({
    externalId,
    source = 'gdrive',
    folderName = '',
    title,
    mimeType = '',
    workArea = 'documentation',
    sourceUrl = '',
    modifiedTime = '',
    contentHash = '',
    rawExcerpt = '',
    chunks = [],
    metadata = {}
  } = {}) {
    const extId = typeof externalId === 'string' ? externalId.trim() : '';
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!extId || !cleanTitle) {
      const err = new Error('Fields "externalId" and "title" are required for upsertDocument.');
      err.statusCode = 400;
      throw err;
    }

    const cleanSource = typeof source === 'string' && source.trim() ? source.trim() : 'gdrive';
    const cleanFolder = typeof folderName === 'string' ? folderName.trim() : '';
    const cleanWorkArea = WORK_AREA_MAP.has(workArea) ? workArea : 'documentation';
    const cleanMime = typeof mimeType === 'string' ? mimeType.trim() : '';
    const cleanSourceUrl = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';
    const cleanModified = typeof modifiedTime === 'string' ? modifiedTime.trim() : '';
    const cleanHash = typeof contentHash === 'string' ? contentHash.trim() : '';
    const now = new Date().toISOString();

    const normalizedChunks = (Array.isArray(chunks) ? chunks : [])
      .map((chunk, idx) => {
        const content = typeof chunk?.content === 'string' ? chunk.content.trim() : '';
        if (!content) return null;
        return {
          chunkIndex: Number.isInteger(Number(chunk.chunkIndex)) ? Number(chunk.chunkIndex) : idx,
          heading: typeof chunk.heading === 'string' ? chunk.heading.trim() : '',
          content,
          charCount: Number.isInteger(Number(chunk.charCount)) && Number(chunk.charCount) > 0
            ? Number(chunk.charCount)
            : content.length
        };
      })
      .filter(Boolean);

    const derivedExcerpt = typeof rawExcerpt === 'string' && rawExcerpt.trim()
      ? rawExcerpt.trim().slice(0, 500)
      : (normalizedChunks[0]?.content || '').replace(/\s+/g, ' ').trim().slice(0, 320);

    const metaJson = JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {});

    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT id FROM kb_documents WHERE external_id = ?').get(extId);
      let documentId;

      if (existing) {
        documentId = Number(existing.id);
        const oldChunkRows = this.db.prepare('SELECT id FROM kb_chunks WHERE document_id = ?').all(documentId);
        if (this.ftsEnabled && oldChunkRows.length > 0) {
          const delFts = this.db.prepare('DELETE FROM kb_chunks_fts WHERE rowid = ?');
          for (const row of oldChunkRows) {
            delFts.run(Number(row.id));
          }
        }
        this.db.prepare('DELETE FROM kb_chunks WHERE document_id = ?').run(documentId);

        this.db.prepare(`
          UPDATE kb_documents
          SET source = ?, folder_name = ?, title = ?, mime_type = ?, work_area = ?,
              source_url = ?, modified_time = ?, content_hash = ?, raw_excerpt = ?,
              chunk_count = ?, metadata_json = ?, indexed_at = ?
          WHERE id = ?
        `).run(
          cleanSource,
          cleanFolder,
          cleanTitle,
          cleanMime,
          cleanWorkArea,
          cleanSourceUrl,
          cleanModified,
          cleanHash,
          derivedExcerpt,
          normalizedChunks.length,
          metaJson,
          now,
          documentId
        );
      } else {
        const res = this.db.prepare(`
          INSERT INTO kb_documents (
            external_id, source, folder_name, title, mime_type, work_area,
            source_url, modified_time, content_hash, raw_excerpt,
            chunk_count, metadata_json, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          extId,
          cleanSource,
          cleanFolder,
          cleanTitle,
          cleanMime,
          cleanWorkArea,
          cleanSourceUrl,
          cleanModified,
          cleanHash,
          derivedExcerpt,
          normalizedChunks.length,
          metaJson,
          now
        );
        documentId = Number(res.lastInsertRowid);
      }

      if (normalizedChunks.length > 0) {
        const insertChunk = this.db.prepare(`
          INSERT INTO kb_chunks (document_id, chunk_index, heading, content, char_count)
          VALUES (?, ?, ?, ?, ?)
        `);
        const insertFts = this.ftsEnabled
          ? this.db.prepare(`
              INSERT INTO kb_chunks_fts (rowid, title, folder_name, heading, content)
              VALUES (?, ?, ?, ?, ?)
            `)
          : null;

        for (let i = 0; i < normalizedChunks.length; i += 1) {
          const chunk = normalizedChunks[i];
          const chunkRes = insertChunk.run(
            documentId,
            i,
            chunk.heading,
            chunk.content,
            chunk.charCount
          );
          if (insertFts) {
            insertFts.run(
              Number(chunkRes.lastInsertRowid),
              cleanTitle,
              cleanFolder,
              chunk.heading,
              chunk.content
            );
          }
        }
      }

      this.db.exec('COMMIT');
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // Ignore rollback errors.
      }
      throw err;
    }

    return this.getDocumentByExternalId(extId);
  }

  getDocumentByExternalId(externalId) {
    if (!externalId || typeof externalId !== 'string') return null;
    const row = this.db.prepare('SELECT * FROM kb_documents WHERE external_id = ?').get(externalId.trim());
    return mapDocumentRow(row);
  }

  listDocuments({ workArea, source, folderName, q, limit = 100 } = {}) {
    const clauses = [];
    const params = [];
    if (workArea) {
      clauses.push('work_area = ?');
      params.push(String(workArea));
    }
    if (source) {
      clauses.push('source = ?');
      params.push(String(source));
    }
    if (folderName) {
      clauses.push('folder_name = ?');
      params.push(String(folderName));
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT * FROM kb_documents ${whereSql} ORDER BY indexed_at DESC, id DESC`)
      .all(...params);

    let docs = rows.map(mapDocumentRow);
    const trimmedQ = typeof q === 'string' ? q.trim() : '';
    if (trimmedQ) {
      const tokens = tokenizeQuery(trimmedQ);
      const queryLower = trimmedQ.toLowerCase();
      docs = docs
        .map((doc) => {
          const score = scoreTextMatch(tokens, queryLower, [
            { text: doc.title, weight: 8 },
            { text: doc.folderName, weight: 4 },
            { text: doc.rawExcerpt, weight: 3 },
            { text: doc.workAreaLabel, weight: 2 },
            { text: doc.source, weight: 1 }
          ]);
          return { doc, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.doc);
    }

    const parsedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
    return docs.slice(0, parsedLimit);
  }

  deleteDocument(idOrExternalId) {
    if (idOrExternalId === null || idOrExternalId === undefined || idOrExternalId === '') return false;
    const raw = String(idOrExternalId).trim();
    let row = this.db.prepare('SELECT id FROM kb_documents WHERE external_id = ?').get(raw);
    if (!row && /^\d+$/.test(raw)) {
      row = this.db.prepare('SELECT id FROM kb_documents WHERE id = ?').get(Number(raw));
    }
    if (!row) return false;

    const docId = Number(row.id);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const chunkRows = this.db.prepare('SELECT id FROM kb_chunks WHERE document_id = ?').all(docId);
      if (this.ftsEnabled && chunkRows.length > 0) {
        const delFts = this.db.prepare('DELETE FROM kb_chunks_fts WHERE rowid = ?');
        for (const chunk of chunkRows) {
          delFts.run(Number(chunk.id));
        }
      }
      this.db.prepare('DELETE FROM kb_chunks WHERE document_id = ?').run(docId);
      this.db.prepare('DELETE FROM kb_documents WHERE id = ?').run(docId);
      this.db.exec('COMMIT');
      return true;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // Ignore rollback errors.
      }
      throw err;
    }
  }

  searchDocumentChunks(query, { workArea = '', limit = 6 } = {}) {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    const parsedLimit = Math.max(1, Math.min(Number(limit) || 6, 30));
    if (!trimmed) return [];

    const tokens = tokenizeQuery(trimmed);
    const queryLower = trimmed.toLowerCase();
    const cleanWorkArea = typeof workArea === 'string' ? workArea.trim() : '';

    const deduplicateByDoc = (ranked) => {
      const docCounts = new Map();
      const results = [];
      for (const item of ranked) {
        const current = docCounts.get(item.documentId) ?? 0;
        if (current >= 2) continue;
        docCounts.set(item.documentId, current + 1);
        results.push(item);
        if (results.length >= parsedLimit) break;
      }
      return results;
    };

    if (this.ftsEnabled) {
      const ftsQuery = buildSafeFtsQuery(trimmed);
      if (ftsQuery) {
        try {
          const rows = this.db.prepare(`
            SELECT
              c.id AS chunk_id,
              c.document_id AS document_id,
              c.heading AS heading,
              c.content AS content,
              d.external_id AS external_id,
              d.title AS title,
              d.folder_name AS folder_name,
              d.work_area AS work_area,
              d.source AS source,
              d.source_url AS source_url,
              bm25(kb_chunks_fts, 6.0, 2.0, 4.0, 1.0) AS bm25_rank
            FROM kb_chunks_fts
            JOIN kb_chunks c ON c.id = kb_chunks_fts.rowid
            JOIN kb_documents d ON d.id = c.document_id
            WHERE kb_chunks_fts MATCH ?
            ORDER BY bm25_rank ASC
            LIMIT ?
          `).all(ftsQuery, Math.max(parsedLimit * 6, 24));

          if (rows.length > 0) {
            const scored = rows
              .map((row) => {
                const rawRank = Number(row.bm25_rank);
                let score = Number.isFinite(rawRank) ? Math.max(0.5, -rawRank * 2 + 2) : 1;
                if (cleanWorkArea && row.work_area === cleanWorkArea) {
                  score += 4;
                }
                return {
                  chunkId: Number(row.chunk_id),
                  documentId: Number(row.document_id),
                  externalId: row.external_id,
                  title: row.title,
                  folderName: row.folder_name || '',
                  workArea: row.work_area || 'documentation',
                  source: row.source,
                  sourceUrl: row.source_url || '',
                  heading: row.heading || '',
                  content: row.content,
                  snippet: buildChunkSnippet(row.content, tokens),
                  score: Number(score.toFixed(3))
                };
              })
              .sort((a, b) => b.score - a.score);

            return deduplicateByDoc(scored);
          }
        } catch {
          // Fall through cleanly to JS token matching if FTS5 fails.
        }
      }
    }

    const rows = this.db.prepare(`
      SELECT
        c.id AS chunk_id,
        c.document_id AS document_id,
        c.heading AS heading,
        c.content AS content,
        d.external_id AS external_id,
        d.title AS title,
        d.folder_name AS folder_name,
        d.work_area AS work_area,
        d.source AS source,
        d.source_url AS source_url
      FROM kb_chunks c
      JOIN kb_documents d ON d.id = c.document_id
      ORDER BY d.indexed_at DESC, c.id ASC
      LIMIT 1500
    `).all();

    const scored = rows
      .map((row) => {
        let score = scoreTextMatch(tokens, queryLower, [
          { text: row.title, weight: 6 },
          { text: row.folder_name, weight: 2 },
          { text: row.heading, weight: 4 },
          { text: row.content, weight: 2 }
        ]);
        if (score > 0 && cleanWorkArea && row.work_area === cleanWorkArea) {
          score += 4;
        }
        return {
          chunkId: Number(row.chunk_id),
          documentId: Number(row.document_id),
          externalId: row.external_id,
          title: row.title,
          folderName: row.folder_name || '',
          workArea: row.work_area || 'documentation',
          source: row.source,
          sourceUrl: row.source_url || '',
          heading: row.heading || '',
          content: row.content,
          snippet: buildChunkSnippet(row.content, tokens),
          score
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return deduplicateByDoc(scored);
  }

  getCachedWebResearch(cacheKey) {
    if (!cacheKey || typeof cacheKey !== 'string') return null;
    const key = cacheKey.trim();
    if (!key) return null;
    const now = Date.now();
    const row = this.db
      .prepare('SELECT payload_json, expires_at FROM web_research_cache WHERE cache_key = ?')
      .get(key);
    if (!row) return null;
    if (Number(row.expires_at) <= now) {
      this.db.prepare('DELETE FROM web_research_cache WHERE cache_key = ?').run(key);
      return null;
    }
    return safeJsonParse(row.payload_json, null);
  }

  setCachedWebResearch(cacheKey, payload, ttlSeconds = 900) {
    if (!cacheKey || typeof cacheKey !== 'string') return null;
    const key = cacheKey.trim();
    if (!key) return null;
    const now = Date.now();
    const ttlMs = Math.max(10, Number(ttlSeconds) || 900) * 1000;
    const expiresAt = now + ttlMs;
    const createdAt = new Date(now).toISOString();

    this.db.prepare(`
      INSERT INTO web_research_cache (cache_key, payload_json, expires_at, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        payload_json = excluded.payload_json,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `).run(key, JSON.stringify(payload ?? {}), expiresAt, createdAt);

    this.db.prepare('DELETE FROM web_research_cache WHERE expires_at <= ?').run(now);
    return payload;
  }

  searchKnowledge({ question, workArea, articleLimit = 4, documentLimit = 5, postLimit = 3 } = {}) {
    const tokens = tokenizeQuery(question);
    const queryLower = (question || '').trim().toLowerCase();

    const allArticles = this.listArticles({});
    const rankedArticles = allArticles
      .map((article) => {
        let score = scoreTextMatch(tokens, queryLower, [
          { text: article.title, weight: 8 },
          { text: article.summary, weight: 5 },
          { text: article.standards.join(' '), weight: 5 },
          { text: article.checklist.join(' '), weight: 4 },
          { text: article.deliverables.join(' '), weight: 3 },
          { text: article.body, weight: 2 },
          { text: article.workAreaLabel, weight: 3 }
        ]);
        if (workArea && article.workArea === workArea) {
          score += score > 0 ? 5 : 2;
        }
        if (score > 0 && article.status === 'engineer_verified') {
          score += 2;
        }
        return { article, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, articleLimit)
      .map((item) => item.article);

    const documents = this.searchDocumentChunks(question, { workArea, limit: documentLimit });
    const forumPosts = this.searchForumPosts(question, { limit: postLimit });
    return { articles: rankedArticles, documents, forumPosts };
  }

  createInquiry({ name, company = '', email, workAreas = [], region = '', scope, clientIp = '' }) {
    const id = `inq_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const ipHash = clientIp
      ? crypto.createHash('sha256').update(String(clientIp)).digest('hex').slice(0, 16)
      : '';

    this.db.prepare(`
      INSERT INTO inquiries (id, name, company, email, work_areas_json, region, scope, client_ip_hash, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `).run(
      id,
      name,
      company,
      email,
      JSON.stringify(workAreas),
      region,
      scope,
      ipHash,
      now
    );

    return this.getInquiryById(id);
  }

  getInquiryById(id) {
    const row = this.db.prepare('SELECT * FROM inquiries WHERE id = ?').get(String(id));
    return row ? mapInquiryRow(row) : null;
  }

  listInquiries({ limit = 100 } = {}) {
    const parsedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
    const rows = this.db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT ?').all(parsedLimit);
    return rows.map(mapInquiryRow);
  }

  recordCuratorRun(summary) {
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO curator_runs (ran_at, summary_json) VALUES (?, ?)').run(now, JSON.stringify(summary));
  }

  close() {
    try {
      this.db.close();
    } catch {
      // Ignore already-closed database errors.
    }
  }
}

export function createStore(options = {}) {
  return new TachosKbStore(options);
}
