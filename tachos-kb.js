/* TACHOS AI Technical Knowledge Base, Native Forum & Commercial Site Survey UI.
   Strict DOM construction only (createElement + textContent + validated URLs). */
(() => {
  'use strict';

  const API_BASE = '/kb/api/v1';
  const CONTACT_EMAIL = 'info@tachos.co.uk';

  const WORK_AREA_META = {
    'project-delivery': { label: '1 · Project Delivery', short: '1 · Project Delivery', page: 'project-delivery.html' },
    'rack-stack': { label: '2 · Rack & Stack', short: '2 · Rack & Stack', page: 'rack-stack.html' },
    'cabling': { label: '3 · Cabling & Patch Management', short: '3 · Cabling', page: 'cabling.html' },
    'network': { label: '4 · Network Implementation', short: '4 · Network', page: 'network.html' },
    'documentation': { label: '5 · Documentation & Handover', short: '5 · Handover', page: 'documentation.html' },
    'handover': { label: '5 · Documentation & Handover', short: '5 · Handover', page: 'documentation.html' }
  };

  const WORKING_BASIS_TEXT =
    'Working basis: These TACHOS engineering guides are prototype outlines to adapt and approve for each contract — not executable site procedures or a claim of standards compliance. Always confirm against current client specifications, approved designs, site RAMS, and manufacturer instructions.';

  /* Grounded offline fallback guides derived directly from TACHOS's Five Works pages. */
  const SEEDED_ARTICLES = [
    {
      slug: 'project-delivery-readiness-and-change-control',
      title: 'Project Delivery: Site Readiness, Scope Baseline & Change Control',
      workArea: 'project-delivery',
      workAreaLabel: '1 · Project Delivery',
      status: 'engineer_verified',
      summary:
        'Plan and govern UK data-centre deployments from agreed scope, readiness surveys, and stakeholder responsibilities through controlled baseline changes to formal acceptance.',
      standards: ['BICSI Essentials (2019)', 'ISO/IEC 22237'],
      deliverables: [
        'Approved scope of work, exclusions, and responsibility matrix',
        'Site readiness survey notes, programme, and risk/issue log',
        'Traceable change register, daily progress logs, and acceptance plan'
      ],
      checklist: [
        'Confirm scope, exclusions, stakeholders, and measurable acceptance criteria before mobilisation.',
        'Survey site access, loading bays, power/cooling readiness, dependencies, and working constraints.',
        'Establish a single document register with owner, revision, approval status, and naming convention.',
        'Record every proposed change, assess programme and technical impact, obtain written approval, and update the baseline.'
      ],
      body:
        'Effective data-centre delivery starts well before engineers step onto the white-space floor. TACHOS structures project governance around an agreed scope baseline, clear site-readiness gates, and a single version-controlled document register.\n\nLifecycle and documentation practices draw on BICSI Essentials of Data Center Projects (1st ed., 2019 — change control and acceptance closeout) alongside client specifications and applicable ISO/IEC 22237 facility requirements.',
      sourceUrl: 'project-delivery.html',
      verifiedBy: 'TACHOS Engineering',
      updatedAt: '2026-11-26'
    },
    {
      slug: 'rack-and-stack-installation-standards',
      title: 'Rack & Stack: Physical Platform Preparation, Elevations & Asset Logging',
      workArea: 'rack-stack',
      workAreaLabel: '2 · Rack & Stack',
      status: 'engineer_verified',
      summary:
        'Prepare and install cabinets, compute, storage, and switching hardware strictly against approved rack elevations, airflow containment rules, load limits, and manufacturer instructions.',
      standards: ['Approved Rack Elevations', 'Site RAMS', 'Manufacturer Instructions'],
      deliverables: [
        'Updated as-built rack elevation drawings and verified asset register',
        'Goods-received inspection record and installation checklist',
        'Exception log, authorised power-on checks, and snag closeout list'
      ],
      checklist: [
        'Confirm site access, lifting equipment, ESD protection, and cabinet readiness before handling hardware.',
        'Validate goods received against the delivery inventory and approved rack-elevation U-positions.',
        'Check mechanical load ratings, hot/cold aisle airflow blanking, dual-feed PDU paths, and cable management.',
        'Record serial numbers, asset tags, physical locations, deviations for approval, and authorised power-on checks.'
      ],
      body:
        'Physical platform reliability depends on consistent mechanical execution and disciplined asset traceability. Every cabinet installation follows one agreed rack/U-position notation and equipment identifier scheme.\n\nEach installed unit is physically inspected, identified, checked for airflow and power-feed separation, and logged with exceptions escalated for client sign-off prior to energisation.',
      sourceUrl: 'rack-stack.html',
      verifiedBy: 'TACHOS Engineering',
      updatedAt: '2026-11-26'
    },
    {
      slug: 'structured-cabling-fibre-testing-patch-management',
      title: 'Cabling & Patch Management: Structured Routes, Labelling & Fibre Testing',
      workArea: 'cabling',
      workAreaLabel: '3 · Cabling & Patch Management',
      status: 'engineer_verified',
      summary:
        'Install, dress, label, inspect, and certify optical fibre and structured copper cabling against approved routes, port matrices, and agreed acceptance test plans.',
      standards: ['ISO/IEC 11801', 'ISO/IEC 14763-3', 'Port Matrix Standardisation'],
      deliverables: [
        'Verified cable schedule, patching matrix, and label register',
        'Fibre and copper test evidence plus defect/retest logs',
        'As-built containment route mark-ups and port occupancy records'
      ],
      checklist: [
        'Verify both physical endpoints, polarity/transceiver types, and approved containment routes before pulling or patching.',
        'Apply agreed cable IDs, durable endpoint labels, bend-radius discipline, and clean dressing practices.',
        'Inspect and clean optical end-faces before mating connectors; test links per agreed methods informed by ISO/IEC 14763-3.',
        'Log every pass/fail trace against the cable ID, rectify faults, retest to pass, and reconcile the patching matrix.'
      ],
      body:
        'Structured cabling links every layer of a data-centre deployment. TACHOS works from approved cable routes, port schedules, and labelling rules with ISO/IEC 11801 as a structured-cabling reference where applicable.\n\nOptical fibre inspection, cleaning, and loss/OTDR testing follow agreed client test plans informed by ISO/IEC 14763-3, keeping physical labels and the digital connection matrix synchronised through every approved change.',
      sourceUrl: 'cabling.html',
      verifiedBy: 'TACHOS Engineering',
      updatedAt: '2026-11-26'
    },
    {
      slug: 'network-implementation-change-windows-rollback',
      title: 'Network Implementation: Baselines, Change Windows & Rollback Validation',
      workArea: 'network',
      workAreaLabel: '4 · Network Implementation',
      status: 'engineer_verified',
      summary:
        'Deploy and validate switching, routing, and out-of-band infrastructure using authorised maintenance windows, pre-checks, documented rollback criteria, and service-acceptance tests.',
      standards: ['IEEE 802.3 Ethernet', 'Authorised Change Control', 'Rollback Criteria'],
      deliverables: [
        'Approved implementation runbook, pre-checks, and rollback plan',
        'Configuration/firmware version register and change execution record',
        'Validated connectivity, failover/redundancy test results, and updated topology'
      ],
      checklist: [
        'Confirm approved topology, IP/VLAN addressing plan, software baseline, and authorised change window.',
        'Capture pre-change telemetry, routing/switching tables, and verified out-of-band console access.',
        'Keep credentials and client configurations strictly within authorised private systems.',
        'Execute changes step-by-step, validate links and redundancy against acceptance criteria, or trigger documented rollback.'
      ],
      body:
        'Network cutovers demand predictable repeatability. Implementation starts from an approved topology, addressing plan, and standardised device/interface naming templates aligned to relevant IEEE 802.3 Ethernet requirements and vendor guidance.\n\nEvery change window pairs explicit pre-checks with unambiguous go/no-go rollback triggers so production services remain protected throughout commissioning.',
      sourceUrl: 'network.html',
      verifiedBy: 'TACHOS Engineering',
      updatedAt: '2026-11-26'
    },
    {
      slug: 'as-built-documentation-and-handover-pack',
      title: 'Documentation & Handover: Continuous As-Builts, Snag Closeout & Sign-Off',
      workArea: 'documentation',
      workAreaLabel: '5 · Documentation & Handover',
      status: 'engineer_verified',
      summary:
        'Maintain live as-built evidence throughout installation, close snags transparently, and transfer a controlled handover pack with signed client acceptance.',
      standards: ['BICSI Closeout (2019)', 'Controlled Revision Archive'],
      deliverables: [
        'Approved handover pack: as-built drawings, rack elevations, and patching matrix',
        'Compiled test evidence, snag closeout tracker, and signed acceptance certificate',
        'O&M information, warranties, controlled archive, and outstanding-action owners'
      ],
      checklist: [
        'Capture as-built changes continuously during installation rather than reconstructing records at the end.',
        'Audit the deliverables register against every clause of the agreed acceptance plan.',
        'Close open snags with photographic or test verification and obtain formal owner sign-off.',
        'Archive superseded revisions cleanly and hand over the final approved pack with warranty and O&M references.'
      ],
      body:
        'Documentation begins on day one of installation, not the afternoon before handover. Maintaining revision-controlled rack elevations, cable schedules, test traces, and change records continuously eliminates closeout bottlenecks.\n\nAt completion, TACHOS reconciles as-builts against the acceptance plan, closes snags with evidence, transfers agreed operating data, and records formal sign-off informed by BICSI project closeout guidance.',
      sourceUrl: 'documentation.html',
      verifiedBy: 'TACHOS Engineering',
      updatedAt: '2026-11-26'
    }
  ];

  /* =========================================================================
     Safe DOM & URL Helpers (strictly zero HTML string parsing)
     ========================================================================= */
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs && typeof attrs === 'object') {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'className') {
          node.className = String(v);
        } else if (k === 'textContent') {
          node.textContent = String(v);
        } else if (k === 'dataset' && typeof v === 'object') {
          for (const [dk, dv] of Object.entries(v)) {
            if (dv !== null && dv !== undefined) node.dataset[dk] = String(dv);
          }
        } else if (k.startsWith('on') && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v === true) {
          node.setAttribute(k, '');
        } else {
          node.setAttribute(k, String(v));
        }
      }
    }
    for (const child of children) {
      if (child === null || child === undefined || child === false) continue;
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item !== null && item !== undefined && item !== false) {
            node.appendChild(typeof item === 'string' ? document.createTextNode(item) : item);
          }
        }
      } else {
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      }
    }
    return node;
  }

  function safeUrl(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('//')) return null;
    if (trimmed.startsWith('/') || /^[a-z0-9][a-z0-9._/-]*\.html(#[\w-]+)?$/i.test(trimmed)) {
      return trimmed;
    }
    try {
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function formatDateUK(value) {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(d);
    } catch (_) {
      return String(value);
    }
  }

  function formatDateTimeUK(value) {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch (_) {
      return String(value);
    }
  }

  function appendParagraphs(container, text) {
    const raw = Array.isArray(text) ? text.join('\n\n') : String(text || '');
    const blocks = raw
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!blocks.length) {
      container.appendChild(el('p', { textContent: 'No detailed notes available.' }));
      return;
    }
    for (const block of blocks) {
      container.appendChild(el('p', { textContent: block }));
    }
  }

  async function fetchJson(url, options = {}, timeoutMs = 8000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {})
        },
        signal: controller ? controller.signal : undefined
      });
      let data = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = null;
        }
      }
      if (!res.ok) {
        const err = new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Unexpected non-JSON response');
      }
      return data;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function workAreaLabelFor(article) {
    if (article.workAreaLabel) return article.workAreaLabel;
    const meta = WORK_AREA_META[article.workArea];
    return meta ? meta.label : 'General Infrastructure';
  }

  function normalizeWorkArea(key) {
    if (!key) return '';
    const lower = String(key).toLowerCase().trim();
    if (lower === 'handover') return 'documentation';
    return lower;
  }

  function createStatusBadge(status) {
    if (status === 'ai_drafted') {
      return el('span', {
        className: 'tk-badge tk-badge--ai',
        textContent: '✦ AI-Drafted (Pending Review)'
      });
    }
    return el('span', {
      className: 'tk-badge tk-badge--verified',
      textContent: '✓ Engineer Verified'
    });
  }

  /* =========================================================================
     State
     ========================================================================= */
  const state = {
    kbOnline: false,
    kbStats: null,
    articles: SEEDED_ARTICLES.slice(),
    articleFilter: {
      workArea: '',
      status: '',
      q: ''
    },
    forumOnline: false,
    forumUrl: '/forum/',
    boards: [],
    topics: [],
    selectedBoardId: '',
    activeDrawer: null,
    lastFocus: null,
    currentTopic: null
  };

  /* =========================================================================
     Drawer / Modal Focus Management
     ========================================================================= */
  function closeActiveDrawer() {
    if (!state.activeDrawer) return;
    state.activeDrawer.hidden = true;
    state.activeDrawer = null;
    document.body.classList.remove('tk-modal-open');
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      state.lastFocus.focus();
    }
    state.lastFocus = null;
  }

  function openDrawer(backdropEl, triggerEl) {
    if (state.activeDrawer && state.activeDrawer !== backdropEl) {
      state.activeDrawer.hidden = true;
    }
    state.lastFocus = triggerEl || document.activeElement;
    state.activeDrawer = backdropEl;
    backdropEl.hidden = false;
    document.body.classList.add('tk-modal-open');
    const closeBtn = backdropEl.querySelector('[data-close-drawer]');
    if (closeBtn) closeBtn.focus();
  }

  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape' && state.activeDrawer) {
      evt.preventDefault();
      closeActiveDrawer();
    }
  });

  function wireDrawerChrome(backdropEl) {
    if (!backdropEl) return;
    backdropEl.addEventListener('click', (evt) => {
      if (evt.target === backdropEl) closeActiveDrawer();
    });
    const closeBtns = backdropEl.querySelectorAll('[data-close-drawer]');
    for (const btn of closeBtns) {
      btn.addEventListener('click', () => closeActiveDrawer());
    }
  }

  /* =========================================================================
     1. Knowledge Base — Articles & Reader Drawer
     ========================================================================= */
  const kbGrid = document.getElementById('kb-articles-grid');
  const kbCountStatus = document.getElementById('kb-count-status');
  const kbSourceMode = document.getElementById('kb-source-mode');
  const kbSearchInput = document.getElementById('kb-search-input');
  const kbWorkFilterBtns = Array.from(document.querySelectorAll('#kb-work-filters [data-work-filter]'));
  const kbStatusFilterBtns = Array.from(document.querySelectorAll('#kb-status-filters [data-status-filter]'));

  const readerBackdrop = document.getElementById('kb-article-reader');
  const readerMeta = document.getElementById('kb-reader-meta');
  const readerTitle = document.getElementById('kb-reader-title');
  const readerSubtitle = document.getElementById('kb-reader-subtitle');
  const readerBody = document.getElementById('kb-reader-body');
  const readerFooter = document.getElementById('kb-reader-footer');

  function filterArticlesLocally(list) {
    const { workArea, status, q } = state.articleFilter;
    const needle = q.trim().toLowerCase();
    return list.filter((art) => {
      if (workArea && normalizeWorkArea(art.workArea) !== normalizeWorkArea(workArea)) {
        return false;
      }
      if (status && art.status !== status) {
        return false;
      }
      if (needle) {
        const hay = [
          art.title,
          art.summary,
          art.body,
          workAreaLabelFor(art),
          ...(Array.isArray(art.standards) ? art.standards : []),
          ...(Array.isArray(art.deliverables) ? art.deliverables : [])
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }

  function renderArticles(list) {
    if (!kbGrid) return;
    kbGrid.replaceChildren();

    if (kbCountStatus) {
      const count = list.length;
      kbCountStatus.textContent =
        count === 1 ? 'Showing 1 technical guide' : `Showing ${count} technical guides`;
    }

    if (!list.length) {
      const msg =
        state.articleFilter.status === 'ai_drafted' && !state.kbOnline
          ? 'No AI-drafted articles are queued in static fallback mode. Live community drafts appear automatically once the /kb/ service is active.'
          : 'No technical guides match the current filters. Try clearing your filter or asking the Technical Assistant above.';
      kbGrid.appendChild(
        el(
          'div',
          { className: 'kb-empty' },
          el('p', { textContent: msg }),
          el('button', {
            type: 'button',
            className: 'tk-btn tk-btn--ghost tk-btn--sm',
            textContent: 'Reset filters',
            onClick: () => {
              state.articleFilter = { workArea: '', status: '', q: '' };
              if (kbSearchInput) kbSearchInput.value = '';
              syncFilterButtons();
              loadArticles();
            }
          })
        )
      );
      return;
    }

    for (const article of list) {
      const stdNodes = (Array.isArray(article.standards) ? article.standards.slice(0, 4) : []).map((std) =>
        el('span', { className: 'kb-std-pill', textContent: std })
      );

      const card = el(
        'button',
        {
          type: 'button',
          className: 'kb-card',
          'aria-label': `Read guide: ${article.title}`,
          onClick: (evt) => openArticleReader(article, evt.currentTarget)
        },
        el(
          'div',
          { className: 'kb-card__top' },
          el('span', { className: 'tk-badge tk-badge--work', textContent: workAreaLabelFor(article) }),
          createStatusBadge(article.status)
        ),
        el('h3', { className: 'kb-card__title', textContent: article.title }),
        el('p', { className: 'kb-card__summary', textContent: article.summary || '' }),
        stdNodes.length ? el('div', { className: 'kb-card__standards' }, stdNodes) : null,
        el(
          'div',
          { className: 'kb-card__foot' },
          el('span', { textContent: 'Read guide →' }),
          article.updatedAt
            ? el('span', {
                className: 'tk-post__time',
                textContent: `Updated ${formatDateUK(article.updatedAt)}`
              })
            : null
        )
      );

      kbGrid.appendChild(card);
    }
  }

  async function openArticleReader(articleSummary, triggerEl) {
    if (!readerBackdrop || !readerBody || !readerTitle) return;

    let article = articleSummary;
    renderArticleReaderContent(article, false);
    openDrawer(readerBackdrop, triggerEl);

    if (state.kbOnline && articleSummary.slug) {
      try {
        const res = await fetchJson(`${API_BASE}/articles/${encodeURIComponent(articleSummary.slug)}`, {}, 6000);
        if (res && res.article) {
          article = res.article;
          renderArticleReaderContent(article, false);
        }
      } catch (_) {
        /* Retain summary payload already rendered cleanly. */
      }
    }
  }

  function renderArticleReaderContent(article) {
    readerMeta.replaceChildren(
      el('span', { className: 'tk-badge tk-badge--work', textContent: workAreaLabelFor(article) }),
      createStatusBadge(article.status)
    );

    if (article.verifiedBy && article.status === 'engineer_verified') {
      readerMeta.appendChild(
        el('span', {
          className: 'tk-badge tk-badge--community',
          textContent: `Reviewed by ${article.verifiedBy}`
        })
      );
    }

    readerTitle.textContent = article.title || 'Technical Guide';
    readerSubtitle.textContent = article.summary || '';

    readerBody.replaceChildren();

    if (Array.isArray(article.standards) && article.standards.length) {
      const pills = article.standards.map((std) => el('span', { className: 'kb-std-pill', textContent: std }));
      readerBody.appendChild(
        el(
          'div',
          { className: 'tk-reader-section', style: 'margin-top:0' },
          el('h4', { textContent: 'Referenced Standards & Baselines' }),
          el('div', { className: 'kb-card__standards' }, pills)
        )
      );
    }

    if (article.body) {
      const bodyWrap = el('div', { className: 'tk-reader-body' });
      appendParagraphs(bodyWrap, article.body);
      readerBody.appendChild(
        el(
          'div',
          { className: 'tk-reader-section' },
          el('h4', { textContent: 'Engineering Guidance' }),
          bodyWrap
        )
      );
    }

    if (Array.isArray(article.deliverables) && article.deliverables.length) {
      readerBody.appendChild(
        el(
          'div',
          { className: 'tk-reader-section' },
          el('h4', { textContent: 'Key Deliverables' }),
          el(
            'ul',
            { className: 'tk-list' },
            article.deliverables.map((item) => el('li', { textContent: item }))
          )
        )
      );
    }

    if (Array.isArray(article.checklist) && article.checklist.length) {
      readerBody.appendChild(
        el(
          'div',
          { className: 'tk-reader-section' },
          el('h4', { textContent: 'Site Execution Checklist' }),
          el(
            'ul',
            { className: 'tk-checklist' },
            article.checklist.map((item) =>
              el(
                'li',
                null,
                el('span', { className: 'tk-checklist__mark', 'aria-hidden': 'true', textContent: '✓' }),
                el('span', { textContent: item })
              )
            )
          )
        )
      );
    }

    const workingBasisNote = el(
      'div',
      {
        className:
          article.status === 'ai_drafted' ? 'tk-note-box tk-note-box--warn' : 'tk-note-box'
      },
      el('strong', {
        textContent:
          article.status === 'ai_drafted'
            ? 'AI-Drafted Technical Note (Pending Engineer Review): '
            : 'Working basis: '
      }),
      article.status === 'ai_drafted'
        ? 'This guide was synthesised from TACHOS technical discussions and awaits formal sign-off by a TACHOS engineer. Verify against approved client designs, site RAMS, and manufacturer specifications before execution.'
        : WORKING_BASIS_TEXT.replace(/^Working basis:\s*/i, '')
    );
    readerBody.appendChild(workingBasisNote);

    /* Footer: source links + commercial survey CTA */
    readerFooter.replaceChildren();
    const linksWrap = el('div', { className: 'kb-pills' });

    const validatedSource = safeUrl(article.sourceUrl);
    if (validatedSource) {
      const isExternal = /^https?:\/\//i.test(validatedSource);
      linksWrap.appendChild(
        el('a', {
          className: 'tk-btn tk-btn--ghost tk-btn--sm',
          href: validatedSource,
          target: isExternal ? '_blank' : null,
          rel: isExternal ? 'noopener noreferrer' : null,
          textContent: validatedSource.endsWith('.html') ? 'Open Five Works page →' : 'View source reference ↗'
        })
      );
    }

    if (article.sourceForumTopicId) {
      linksWrap.appendChild(
        el('button', {
          type: 'button',
          className: 'tk-btn tk-btn--ghost tk-btn--sm',
          textContent: 'Read forum thread →',
          onClick: () => {
            openForumThread(article.sourceForumTopicId, null);
          }
        })
      );
    }

    const surveyBtn = el('button', {
      type: 'button',
      className: 'tk-btn tk-btn--primary tk-btn--sm',
      textContent: 'Request a Site Survey for this work area',
      onClick: () => {
        openSurveyModal(normalizeWorkArea(article.workArea), null);
      }
    });

    readerFooter.appendChild(linksWrap);
    readerFooter.appendChild(surveyBtn);
  }

  function syncFilterButtons() {
    for (const btn of kbWorkFilterBtns) {
      const active = btn.dataset.workFilter === state.articleFilter.workArea;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    for (const btn of kbStatusFilterBtns) {
      const active = btn.dataset.statusFilter === state.articleFilter.status;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function updateKbSourceMode() {
    if (!kbSourceMode) return;
    if (!state.kbOnline) {
      kbSourceMode.textContent = 'Five Works Reference Mode (static fallback)';
      return;
    }
    const guideCount =
      state.kbStats && typeof state.kbStats.articles === 'number'
        ? state.kbStats.articles
        : state.articles.length;
    const guideLabel = guideCount === 1 ? '1 guide' : `${guideCount} guides`;
    if (state.kbStats && typeof state.kbStats.documents === 'number') {
      const docCount = state.kbStats.documents;
      const docLabel = docCount === 1 ? '1 technical doc indexed' : `${docCount} technical docs indexed`;
      kbSourceMode.textContent = `Live Knowledge Base · ${guideLabel} · ${docLabel}`;
    } else {
      kbSourceMode.textContent = `Live Knowledge Base · ${guideLabel} connected`;
    }
  }

  async function loadKbStatus() {
    try {
      const data = await fetchJson(`${API_BASE}/status`, {}, 6000);
      if (data && data.stats && typeof data.stats === 'object') {
        state.kbOnline = true;
        state.kbStats = data.stats;
        updateKbSourceMode();
      }
    } catch (_) {
      /* Graceful fallback when /kb/status is unavailable */
    }
  }

  async function loadArticles() {
    const params = new URLSearchParams();
    if (state.articleFilter.workArea) params.set('workArea', state.articleFilter.workArea);
    if (state.articleFilter.status) params.set('status', state.articleFilter.status);
    if (state.articleFilter.q.trim()) params.set('q', state.articleFilter.q.trim());
    const qs = params.toString();
    const endpoint = `${API_BASE}/articles${qs ? `?${qs}` : ''}`;

    try {
      const data = await fetchJson(endpoint, {}, 6000);
      if (data && Array.isArray(data.articles)) {
        state.kbOnline = true;
        state.articles = data.articles;
        updateKbSourceMode();
        renderArticles(data.articles);
        return;
      }
    } catch (_) {
      /* Graceful fallback to built-in Five Works outlines */
    }

    state.kbOnline = false;
    state.articles = SEEDED_ARTICLES.slice();
    updateKbSourceMode();
    renderArticles(filterArticlesLocally(SEEDED_ARTICLES));
  }

  for (const btn of kbWorkFilterBtns) {
    btn.addEventListener('click', () => {
      state.articleFilter.workArea = btn.dataset.workFilter || '';
      syncFilterButtons();
      if (state.kbOnline) {
        loadArticles();
      } else {
        renderArticles(filterArticlesLocally(state.articles));
      }
    });
  }

  for (const btn of kbStatusFilterBtns) {
    btn.addEventListener('click', () => {
      state.articleFilter.status = btn.dataset.statusFilter || '';
      syncFilterButtons();
      if (state.kbOnline) {
        loadArticles();
      } else {
        renderArticles(filterArticlesLocally(state.articles));
      }
    });
  }

  let searchTimer = null;
  if (kbSearchInput) {
    kbSearchInput.addEventListener('input', () => {
      state.articleFilter.q = kbSearchInput.value || '';
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        if (state.kbOnline) {
          loadArticles();
        } else {
          renderArticles(filterArticlesLocally(state.articles));
        }
      }, 220);
    });
  }

  /* =========================================================================
     2. Ask the TACHOS Technical Assistant (#kb-ask-form)
     ========================================================================= */
  const askForm = document.getElementById('kb-ask-form');
  const askInput = document.getElementById('kb-ask-input');
  const askWorkArea = document.getElementById('kb-ask-work-area');
  const askWebResearchToggle = document.getElementById('kb-ask-web-research');
  const askSubmitBtn = document.getElementById('kb-ask-submit');
  const askResultBox = document.getElementById('kb-ask-result');
  const promptChips = Array.from(document.querySelectorAll('[data-kb-prompt]'));

  function runOfflineExtractiveAnswer(question, workArea) {
    const tokens = question
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const pool = workArea
      ? SEEDED_ARTICLES.filter((a) => normalizeWorkArea(a.workArea) === normalizeWorkArea(workArea))
      : SEEDED_ARTICLES;

    const candidates = pool.length ? pool : SEEDED_ARTICLES;

    const scored = candidates
      .map((art) => {
        const hay = [
          art.title,
          art.summary,
          art.body,
          ...(art.standards || []),
          ...(art.deliverables || []),
          ...(art.checklist || [])
        ]
          .join(' ')
          .toLowerCase();
        let score = 0;
        for (const t of tokens) {
          if (hay.includes(t)) score += 2;
          if ((art.title || '').toLowerCase().includes(t)) score += 3;
          if ((art.standards || []).join(' ').toLowerCase().includes(t)) score += 3;
        }
        return { art, score };
      })
      .sort((a, b) => b.score - a.score);

    const top = scored.filter((item) => item.score > 0).slice(0, 2);
    const chosen = top.length ? top.map((i) => i.art) : [candidates[0]];

    const primary = chosen[0];
    const parts = [
      `Based on TACHOS's ${workAreaLabelFor(primary)} guidance (${primary.title}): ${primary.summary}`,
      `Key site checkpoints include: ${(primary.checklist || []).slice(0, 3).join(' ')}`
    ];

    if (chosen[1]) {
      parts.push(
        `Related cross-work area reference — ${workAreaLabelFor(chosen[1])}: ${chosen[1].summary}`
      );
    }

    return {
      answer: parts.join('\n\n'),
      mode: 'Grounded Offline Reference',
      disclaimer:
        'Offline extractive reference from TACHOS Five Works outlines (live AI synthesis activates automatically once /kb/ is connected). Confirm all details against approved client designs, site RAMS, and manufacturer specifications.',
      citations: chosen.map((art) => ({
        type: 'kb_article',
        slug: art.slug,
        title: art.title,
        url: art.sourceUrl,
        status: art.status,
        excerpt: art.summary
      })),
      cta: 'Need boots on the ground in the UK or Europe? Request a Site Survey.'
    };
  }

  function createCitationBadge(cite) {
    const type = String(cite.type || '').toLowerCase();
    if (type === 'drive_document' || type === 'technical_document' || type === 'document') {
      return el('span', {
        className: 'tk-badge tk-badge--library',
        textContent: '📄 Technical Library'
      });
    }
    if (type === 'web_source' || type === 'web') {
      return el('span', {
        className: 'tk-badge tk-badge--web',
        textContent: '🌐 Live Web'
      });
    }
    if (type === 'forum_post' || type === 'forum_topic' || type === 'forum') {
      return el('span', {
        className: 'tk-badge tk-badge--forum',
        textContent: '💬 Forum'
      });
    }
    if (cite.status === 'ai_drafted') {
      return el('span', {
        className: 'tk-badge tk-badge--ai',
        textContent: '✦ AI-Drafted'
      });
    }
    if (cite.status === 'engineer_verified' || type === 'kb_article') {
      return el('span', {
        className: 'tk-badge tk-badge--verified',
        textContent: '✓ Engineer Verified'
      });
    }
    return null;
  }

  function extractHostname(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      return new URL(rawUrl).hostname.replace(/^www\./i, '');
    } catch (_) {
      return '';
    }
  }

  function formatCitationMeta(cite) {
    const type = String(cite.type || '').toLowerCase();
    if (type === 'drive_document' || type === 'technical_document' || type === 'document') {
      const parts = [cite.folderName, cite.heading || cite.section].filter(Boolean);
      return parts.join(' · ');
    }
    if (type === 'web_source' || type === 'web') {
      const host = cite.domain || extractHostname(cite.url);
      const parts = [host, cite.provider || cite.source].filter(Boolean);
      return parts.join(' · ');
    }
    if (type === 'forum_post' || type === 'forum_topic' || type === 'forum') {
      return cite.author ? `Posted by ${cite.author}` : 'Community technical discussion';
    }
    return '';
  }

  function renderAskResponse(payload, selectedArea) {
    if (!askResultBox) return;
    askResultBox.hidden = false;
    askResultBox.replaceChildren();

    let modeLabel = 'Technical Assistant';
    if (payload.researchMode === 'deep' || payload.webSearchUsed) {
      const extraParts = [];
      if (Number(payload.documentHits) > 0) {
        extraParts.push(`${payload.documentHits} library`);
      }
      if (Number(payload.webHits) > 0) {
        extraParts.push(`${payload.webHits} web`);
      }
      modeLabel = extraParts.length
        ? `Deep Research (${extraParts.join(' + ')})`
        : 'Deep Library + Live Web';
    } else if (payload.mode === 'ai' || payload.mode === 'live' || payload.mode === 'llm') {
      modeLabel = 'AI-Assisted Synthesis';
    } else if (payload.mode === 'grounded_search') {
      modeLabel = 'Grounded KB & Library';
    } else if (payload.mode) {
      modeLabel = String(payload.mode);
    }

    const bodyEl = el('div', { className: 'kb-answer__body' });
    appendParagraphs(bodyEl, payload.answer || 'No answer returned.');

    askResultBox.appendChild(
      el(
        'div',
        { className: 'kb-answer__top' },
        el('h4', { className: 'kb-answer__heading', textContent: 'Technical Assistant Response' }),
        el('span', { className: 'kb-answer__mode', textContent: modeLabel })
      )
    );
    askResultBox.appendChild(bodyEl);

    const disclaimerText =
      payload.disclaimer ||
      'Engineering guidance only — verify against approved client specifications, site RAMS, and manufacturer instructions before execution.';
    askResultBox.appendChild(
      el(
        'div',
        { className: 'kb-answer__disclaimer' },
        el('strong', { textContent: 'Engineering note: ' }),
        disclaimerText
      )
    );

    if (Array.isArray(payload.citations) && payload.citations.length) {
      const grid = el('div', { className: 'kb-citations__grid' });
      for (const cite of payload.citations) {
        const citeType = String(cite.type || '').toLowerCase();
        const isKbArticle =
          citeType === 'kb_article' || (!citeType && (cite.slug || cite.status));
        const matchedArticle = isKbArticle
          ? state.articles.find(
              (a) =>
                (cite.slug && a.slug === cite.slug) ||
                (cite.title && a.title === cite.title)
            )
          : null;

        const badge = createCitationBadge(cite);
        const metaLine = formatCitationMeta(cite);
        const excerptText = cite.excerpt || cite.snippet || '';

        if (matchedArticle) {
          grid.appendChild(
            el(
              'button',
              {
                type: 'button',
                className: 'kb-citation-card',
                onClick: (evt) => openArticleReader(matchedArticle, evt.currentTarget)
              },
              badge,
              el('span', { className: 'kb-citation-card__title', textContent: cite.title || 'Technical guide' }),
              excerptText ? el('span', { className: 'kb-citation-card__excerpt', textContent: excerptText }) : null
            )
          );
        } else if (
          (citeType === 'forum_post' || citeType === 'forum_topic' || citeType === 'forum') &&
          cite.topicId &&
          state.forumOnline
        ) {
          grid.appendChild(
            el(
              'button',
              {
                type: 'button',
                className: 'kb-citation-card',
                onClick: (evt) => openForumThread(cite.topicId, evt.currentTarget, { title: cite.title, url: cite.url })
              },
              badge,
              el('span', { className: 'kb-citation-card__title', textContent: cite.title || 'Forum thread' }),
              metaLine ? el('span', { className: 'kb-citation-card__meta', textContent: metaLine }) : null,
              excerptText ? el('span', { className: 'kb-citation-card__excerpt', textContent: excerptText }) : null
            )
          );
        } else {
          const validHref = safeUrl(cite.url || cite.sourceUrl);
          const isWebSource = citeType === 'web_source' || citeType === 'web';
          if (validHref) {
            const isExt = isWebSource || /^https?:\/\//i.test(validHref);
            grid.appendChild(
              el(
                'a',
                {
                  className: 'kb-citation-card',
                  href: validHref,
                  target: isExt ? '_blank' : null,
                  rel: isExt ? 'noopener noreferrer' : null
                },
                badge,
                el('span', {
                  className: 'kb-citation-card__title',
                  textContent: isWebSource ? `${cite.title || 'External reference'} ↗` : cite.title || 'Reference source'
                }),
                metaLine ? el('span', { className: 'kb-citation-card__meta', textContent: metaLine }) : null,
                excerptText
                  ? el('span', { className: 'kb-citation-card__excerpt', textContent: excerptText })
                  : null
              )
            );
          } else {
            grid.appendChild(
              el(
                'div',
                { className: 'kb-citation-card' },
                badge,
                el('span', { className: 'kb-citation-card__title', textContent: cite.title || 'Reference source' }),
                metaLine ? el('span', { className: 'kb-citation-card__meta', textContent: metaLine }) : null,
                excerptText
                  ? el('span', { className: 'kb-citation-card__excerpt', textContent: excerptText })
                  : null
              )
            );
          }
        }
      }

      askResultBox.appendChild(
        el(
          'div',
          { className: 'kb-citations' },
          el('p', { className: 'kb-citations__title', textContent: 'Grounded References' }),
          grid
        )
      );
    }

    const ctaText =
      typeof payload.cta === 'string'
        ? payload.cta
        : (payload.cta && (payload.cta.text || payload.cta.label)) ||
          'Planning a live data-centre build, rack deployment, or cabling handover?';

    askResultBox.appendChild(
      el(
        'div',
        { className: 'kb-answer__cta' },
        el('p', {
          className: 'kb-answer__cta-text',
          textContent: ctaText
        }),
        el('button', {
          type: 'button',
          className: 'tk-btn tk-btn--primary tk-btn--sm',
          textContent: 'Need boots on the ground? Request a Site Survey',
          onClick: (evt) => openSurveyModal(selectedArea || '', evt.currentTarget)
        })
      )
    );
  }

  async function handleAskSubmit(evt) {
    if (evt) evt.preventDefault();
    if (!askInput || !askResultBox) return;

    const question = askInput.value.trim();
    const workArea = askWorkArea ? askWorkArea.value : '';
    const includeWebResearch = askWebResearchToggle ? Boolean(askWebResearchToggle.checked) : true;
    if (!question) {
      askInput.focus();
      return;
    }

    if (askSubmitBtn) {
      askSubmitBtn.disabled = true;
      askSubmitBtn.textContent = includeWebResearch ? 'Researching…' : 'Checking guides…';
    }
    askResultBox.hidden = false;
    askResultBox.replaceChildren(
      el('p', {
        className: 'kb-answer__cta-text',
        textContent: includeWebResearch
          ? 'Searching TACHOS guides, Technical Library, forum threads, and live authoritative web sources…'
          : 'Searching TACHOS verified engineering guides, Technical Library, and technical discussions…'
      })
    );

    const requestBody = {
      question,
      webSearch: includeWebResearch,
      deepResearch: includeWebResearch,
      mode: includeWebResearch ? 'deep' : 'standard'
    };
    if (workArea) requestBody.workArea = workArea;

    try {
      const data = await fetchJson(
        `${API_BASE}/ask`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        },
        includeWebResearch ? 25000 : 14000
      );
      renderAskResponse(data, workArea);
    } catch (_) {
      const offline = runOfflineExtractiveAnswer(question, workArea);
      renderAskResponse(offline, workArea);
    } finally {
      if (askSubmitBtn) {
        askSubmitBtn.disabled = false;
        askSubmitBtn.textContent = 'Ask Technical Assistant';
      }
    }
  }

  if (askForm) {
    askForm.addEventListener('submit', handleAskSubmit);
  }

  for (const chip of promptChips) {
    chip.addEventListener('click', () => {
      if (!askInput) return;
      askInput.value = chip.dataset.kbPrompt || chip.textContent || '';
      if (askWorkArea && chip.dataset.kbWorkArea !== undefined) {
        askWorkArea.value = chip.dataset.kbWorkArea;
      }
      handleAskSubmit(null);
    });
  }

  /* =========================================================================
     3. Native Technical Community Forum (#forum & #tachos-thread-drawer)
     ========================================================================= */
  const forumLiveStatus = document.getElementById('forum-live-status');
  const forumBoardFilters = document.getElementById('forum-board-filters');
  const forumControlsBar = document.getElementById('forum-controls-bar');
  const forumTopicsGrid = document.getElementById('forum-topics-grid');
  const forumFallback = document.getElementById('forum-fallback');

  const threadBackdrop = document.getElementById('tachos-thread-drawer');
  const threadMeta = document.getElementById('thread-drawer-meta');
  const threadTitle = document.getElementById('thread-drawer-title');
  const threadBody = document.getElementById('thread-drawer-body');
  const threadFooter = document.getElementById('thread-drawer-footer');

  function renderForumBoardFilters() {
    if (!forumBoardFilters || !forumControlsBar) return;
    forumBoardFilters.replaceChildren();

    if (!state.boards.length) {
      forumControlsBar.hidden = true;
      return;
    }

    forumControlsBar.hidden = false;

    const allBtn = el('button', {
      type: 'button',
      className: `kb-pill${state.selectedBoardId === '' ? ' is-active' : ''}`,
      'aria-pressed': state.selectedBoardId === '' ? 'true' : 'false',
      textContent: 'All boards',
      onClick: () => {
        state.selectedBoardId = '';
        loadForumTopics('');
      }
    });
    forumBoardFilters.appendChild(allBtn);

    for (const board of state.boards) {
      const id = String(board.id ?? board.boardId ?? '');
      const name = String(board.name ?? board.boardName ?? 'Board');
      if (!id) continue;
      const isActive = state.selectedBoardId === id;
      forumBoardFilters.appendChild(
        el('button', {
          type: 'button',
          className: `kb-pill${isActive ? ' is-active' : ''}`,
          'aria-pressed': isActive ? 'true' : 'false',
          textContent: name,
          onClick: () => {
            state.selectedBoardId = id;
            loadForumTopics(id);
          }
        })
      );
    }
  }

  function renderForumTopics(topics) {
    if (!forumTopicsGrid || !forumFallback) return;
    forumTopicsGrid.replaceChildren();

    if (!topics.length) {
      forumTopicsGrid.hidden = true;
      forumFallback.hidden = false;
      return;
    }

    forumFallback.hidden = true;
    forumTopicsGrid.hidden = false;

    for (const topic of topics) {
      const boardBadge = el('span', {
        className: topic.isAiBoard ? 'tk-badge tk-badge--verified' : 'tk-badge tk-badge--work',
        textContent: topic.isAiBoard
          ? `✦ ${topic.boardName || 'AI Technical Q&A'}`
          : topic.boardName || 'Technical Discussion'
      });

      const replyBadge = topic.canReply
        ? el('span', { className: 'tk-badge tk-badge--community', textContent: 'Replies open' })
        : null;

      const postCountText =
        typeof topic.postCount === 'number'
          ? topic.postCount === 1
            ? '1 post'
            : `${topic.postCount} posts`
          : '';

      const metaParts = [
        postCountText,
        topic.latestAuthor ? `Latest: ${topic.latestAuthor}` : '',
        topic.updatedAt ? formatDateUK(topic.updatedAt) : ''
      ].filter(Boolean);

      const card = el(
        'button',
        {
          type: 'button',
          className: 'forum-topic-card',
          'aria-label': `Open forum discussion: ${topic.title}`,
          onClick: (evt) => openForumThread(topic.topicId, evt.currentTarget, topic)
        },
        el('div', { className: 'forum-topic-card__head' }, boardBadge, replyBadge),
        el('h3', { className: 'forum-topic-card__title', textContent: topic.title || 'Untitled topic' }),
        topic.latestExcerpt
          ? el('p', { className: 'forum-topic-card__excerpt', textContent: topic.latestExcerpt })
          : null,
        el(
          'div',
          { className: 'forum-topic-card__meta' },
          el('span', { textContent: metaParts.join(' · ') }),
          el('span', { style: 'color:var(--teal);font-weight:700', textContent: 'Read thread →' })
        )
      );

      forumTopicsGrid.appendChild(card);
    }
  }

  function showForumOfflineFallback() {
    state.forumOnline = false;
    if (forumControlsBar) forumControlsBar.hidden = true;
    if (forumTopicsGrid) {
      forumTopicsGrid.replaceChildren();
      forumTopicsGrid.hidden = true;
    }
    if (forumFallback) forumFallback.hidden = false;
    if (forumLiveStatus) {
      forumLiveStatus.textContent = 'COMMUNITY FORUM · Browse discussions directly at /forum/';
    }
  }

  async function loadForumTopics(boardId = '') {
    const params = new URLSearchParams({ limit: '16' });
    if (boardId) params.set('boardId', String(boardId));

    try {
      const data = await fetchJson(`${API_BASE}/forum/topics?${params.toString()}`, {}, 7000);
      if (data && Array.isArray(data.topics)) {
        state.forumOnline = true;
        state.forumUrl = safeUrl(data.forumUrl) || '/forum/';
        if (Array.isArray(data.boards)) {
          state.boards = data.boards;
        }
        state.topics = data.topics;
        if (forumLiveStatus) {
          forumLiveStatus.textContent = `LIVE DISCUSSIONS · ${data.topics.length} active technical thread${
            data.topics.length === 1 ? '' : 's'
          } — click any topic to read or reply`;
        }
        renderForumBoardFilters();
        renderForumTopics(data.topics);
        return;
      }
    } catch (_) {
      /* Graceful fallback when /kb/ is not yet active on HostArmada */
    }
    showForumOfflineFallback();
  }

  function isAiAuthor(post) {
    const kind = String(post.authorKind || '').toLowerCase();
    if (kind === 'ai' || kind === 'assistant' || kind === 'bot' || post.viaTavern) return true;
    const name = String(post.displayAuthor || post.author || '').toLowerCase();
    return name.includes('assistant') || name.includes('tachos ai');
  }

  function renderForumThread(topic) {
    state.currentTopic = topic;
    threadMeta.replaceChildren(
      el('span', { className: 'tk-badge tk-badge--work', textContent: topic.boardName || 'Technical Forum' })
    );
    if (topic.canReply) {
      threadMeta.appendChild(
        el('span', { className: 'tk-badge tk-badge--verified', textContent: 'Inline replies enabled' })
      );
    }

    threadTitle.textContent = topic.title || 'Forum Thread';
    threadBody.replaceChildren();

    const posts = Array.isArray(topic.posts) ? topic.posts : [];
    const postList = el('div', { className: 'tk-post-list' });

    if (!posts.length) {
      postList.appendChild(el('p', { textContent: 'No posts found in this discussion yet.' }));
    } else {
      for (const post of posts) {
        const ai = isAiAuthor(post);
        const authorLabel = post.displayAuthor || post.author || 'Community Member';
        const badge = el('span', {
          className: ai ? 'tk-badge tk-badge--verified' : 'tk-badge tk-badge--community',
          textContent: ai ? '✦ AI Technical Assistant' : 'Engineer / Community'
        });

        const bodyEl = el('div', { className: 'tk-post__body' });
        appendParagraphs(bodyEl, post.body || '');

        const timeItems = [];
        if (post.timestamp) {
          timeItems.push(el('span', { className: 'tk-post__time', textContent: formatDateTimeUK(post.timestamp) }));
        }
        const postHref = safeUrl(post.postUrl);
        if (postHref) {
          timeItems.push(
            el('a', {
              href: postHref,
              className: 'tk-post__time',
              target: /^https?:\/\//i.test(postHref) ? '_blank' : null,
              rel: /^https?:\/\//i.test(postHref) ? 'noopener noreferrer' : null,
              textContent: 'Permalink ↗'
            })
          );
        }

        postList.appendChild(
          el(
            'article',
            { className: `tk-post${ai ? ' tk-post--ai' : ''}` },
            el(
              'div',
              { className: 'tk-post__head' },
              el(
                'div',
                { className: 'tk-post__author-group' },
                el('span', { className: 'tk-post__author', textContent: authorLabel }),
                badge
              ),
              el('div', { className: 'tk-post__author-group' }, timeItems)
            ),
            bodyEl
          )
        );
      }
    }

    threadBody.appendChild(postList);

    /* Inline reply form when canReply is true */
    if (topic.canReply) {
      const statusSlot = el('div', { 'aria-live': 'polite' });
      const nameInput = el('input', {
        id: 'thread-reply-author',
        type: 'text',
        className: 'kb-input',
        required: true,
        maxlength: '80',
        placeholder: 'e.g. Alex Carter (Network Engineer)'
      });
      const msgInput = el('textarea', {
        id: 'thread-reply-message',
        className: 'kb-textarea',
        required: true,
        maxlength: '4000',
        placeholder: 'Share practical site notes, questions, or test observations…'
      });
      const submitBtn = el('button', {
        type: 'submit',
        className: 'tk-btn tk-btn--teal',
        textContent: 'Post technical reply'
      });

      const replyForm = el(
        'form',
        {
          id: 'thread-reply-form',
          className: 'tk-form',
          onSubmit: async (evt) => {
            evt.preventDefault();
            const authorName = nameInput.value.trim();
            const message = msgInput.value.trim();
            if (!authorName || !message) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting reply…';
            statusSlot.replaceChildren();

            try {
              const res = await fetchJson(
                `${API_BASE}/forum/topics/${encodeURIComponent(topic.topicId)}/reply`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ authorName, message })
                },
                10000
              );
              if (res && res.topic) {
                renderForumThread(res.topic);
                const latestStatus = threadBody.querySelector('#thread-reply-status');
                if (latestStatus) {
                  latestStatus.replaceChildren(
                    el('div', {
                      className: 'tk-status-box tk-status-box--ok',
                      textContent: 'Your reply has been posted to the thread.'
                    })
                  );
                }
              } else {
                await openForumThread(topic.topicId, null);
              }
              loadForumTopics(state.selectedBoardId);
            } catch (err) {
              statusSlot.replaceChildren(
                el('div', {
                  className: 'tk-status-box tk-status-box--error',
                  textContent:
                    (err && err.message) ||
                    'Could not post reply right now. You can reply directly in phpBB using the link below.'
                })
              );
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Post technical reply';
            }
          }
        },
        el(
          'div',
          { className: 'tk-field' },
          el('label', { for: 'thread-reply-author', textContent: 'Your name / role *' }),
          nameInput
        ),
        el(
          'div',
          { className: 'tk-field' },
          el('label', { for: 'thread-reply-message', textContent: 'Reply *' }),
          msgInput
        ),
        el('div', { id: 'thread-reply-status' }, statusSlot),
        el('div', null, submitBtn)
      );

      threadBody.appendChild(
        el(
          'div',
          { className: 'tk-reply-box' },
          el('h4', { textContent: 'Add a reply to this discussion' }),
          replyForm
        )
      );
    } else {
      threadBody.appendChild(
        el(
          'div',
          { className: 'tk-note-box' },
          'This board requires a forum account to post. Open the thread in phpBB below to sign in and reply.'
        )
      );
    }

    /* Drawer footer: discreet Open in phpBB link + Survey CTA */
    threadFooter.replaceChildren();
    const phpbbHref = safeUrl(topic.url) || '/forum/';
    const isExt = /^https?:\/\//i.test(phpbbHref);
    threadFooter.appendChild(
      el('a', {
        className: 'tk-btn tk-btn--ghost tk-btn--sm',
        href: phpbbHref,
        target: isExt ? '_blank' : null,
        rel: isExt ? 'noopener noreferrer' : null,
        textContent: 'Open in phpBB ↗'
      })
    );
    threadFooter.appendChild(
      el('button', {
        type: 'button',
        className: 'tk-btn tk-btn--primary tk-btn--sm',
        textContent: 'Need site engineering support?',
        onClick: () => openSurveyModal('', null)
      })
    );
  }

  async function openForumThread(topicId, triggerEl, previewTopic = null) {
    if (!threadBackdrop || !threadTitle || !threadBody) return;

    threadMeta.replaceChildren();
    threadTitle.textContent = (previewTopic && previewTopic.title) || 'Loading discussion…';
    threadBody.replaceChildren(el('p', { textContent: 'Loading thread posts…' }));
    threadFooter.replaceChildren();
    openDrawer(threadBackdrop, triggerEl);

    try {
      const data = await fetchJson(`${API_BASE}/forum/topics/${encodeURIComponent(topicId)}`, {}, 8000);
      if (data && data.topic) {
        renderForumThread(data.topic);
        return;
      }
    } catch (_) {
      /* Fall through to clean phpBB link */
    }

    const fallbackHref = safeUrl(previewTopic && previewTopic.url) || '/forum/';
    threadBody.replaceChildren(
      el(
        'div',
        { className: 'tk-status-box tk-status-box--fallback' },
        el('p', {
          textContent:
            'The live thread view could not be loaded right now. Open this discussion directly in the TACHOS forum.'
        }),
        el(
          'div',
          { className: 'tk-status-actions' },
          el('a', {
            className: 'tk-btn tk-btn--ink tk-btn--sm',
            href: fallbackHref,
            textContent: 'Open in phpBB ↗'
          })
        )
      )
    );
  }

  /* =========================================================================
     4. Commercial Site Survey / Quote Modal (#survey-modal)
     ========================================================================= */
  const surveyBackdrop = document.getElementById('survey-modal');
  const surveyForm = document.getElementById('survey-form');
  const surveyStatus = document.getElementById('survey-status');
  const surveySubmitBtn = document.getElementById('survey-submit-btn');

  function openSurveyModal(preselectWorkArea, triggerEl) {
    if (!surveyBackdrop) return;
    if (surveyStatus) surveyStatus.replaceChildren();
    if (preselectWorkArea && surveyForm) {
      const norm = normalizeWorkArea(preselectWorkArea);
      const boxes = surveyForm.querySelectorAll('input[name="workAreas"]');
      for (const box of boxes) {
        box.checked = normalizeWorkArea(box.value) === norm;
      }
    }
    openDrawer(surveyBackdrop, triggerEl);
    const nameInput = document.getElementById('survey-name');
    if (nameInput) setTimeout(() => nameInput.focus(), 20);
  }

  function buildMailtoHref(payload) {
    const areas = payload.workAreas.length
      ? payload.workAreas.map((w) => (WORK_AREA_META[w] ? WORK_AREA_META[w].label : w)).join(', ')
      : 'To be discussed';
    const subject = `Site Survey / Quote Request — ${payload.company || payload.name}`;
    const bodyLines = [
      'Hello TACHOS LTD,',
      '',
      'Please find our data-centre / network infrastructure enquiry below:',
      '',
      `Name: ${payload.name}`,
      `Company: ${payload.company || 'Not specified'}`,
      `Work Email: ${payload.email}`,
      `Work Areas: ${areas}`,
      `Site Region: ${payload.region || 'UK / Europe'}`,
      '',
      'Project Scope & Timeline:',
      payload.scope
    ];
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      bodyLines.join('\n')
    )}`;
  }

  function renderSurveyFallback(payload) {
    if (!surveyStatus) return;
    const mailtoHref = buildMailtoHref(payload);
    const plainSummary = [
      `To: ${CONTACT_EMAIL}`,
      `Name: ${payload.name}`,
      `Company: ${payload.company || 'Not specified'}`,
      `Email: ${payload.email}`,
      `Region: ${payload.region || 'UK / Europe'}`,
      `Work Areas: ${payload.workAreas.join(', ') || 'General'}`,
      `Scope: ${payload.scope}`
    ].join('\n');

    const copyBtn = el('button', {
      type: 'button',
      className: 'tk-btn tk-btn--ghost tk-btn--sm',
      textContent: 'Copy enquiry details',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(plainSummary);
          copyBtn.textContent = 'Copied ✓';
        } catch (_) {
          copyBtn.textContent = 'Email info@tachos.co.uk directly';
        }
      }
    });

    surveyStatus.replaceChildren(
      el(
        'div',
        { className: 'tk-status-box tk-status-box--fallback' },
        el('strong', { textContent: 'Direct email handover ready — no enquiry lost. ' }),
        'Our automated intake service is currently offline, so we have pre-filled your site survey brief for direct delivery to info@tachos.co.uk.',
        el(
          'div',
          { className: 'tk-status-actions' },
          el('a', {
            className: 'tk-btn tk-btn--primary tk-btn--sm',
            href: mailtoHref,
            textContent: 'Open pre-filled email to info@tachos.co.uk →'
          }),
          copyBtn
        )
      )
    );
  }

  if (surveyForm) {
    surveyForm.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      if (!surveyStatus) return;

      const fd = new FormData(surveyForm);
      const payload = {
        name: String(fd.get('name') || '').trim(),
        company: String(fd.get('company') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        workAreas: fd.getAll('workAreas').map((v) => String(v)),
        region: String(fd.get('region') || '').trim(),
        scope: String(fd.get('scope') || '').trim()
      };

      if (!payload.name || !payload.email || !payload.scope) {
        surveyStatus.replaceChildren(
          el('div', {
            className: 'tk-status-box tk-status-box--error',
            textContent: 'Please complete your name, work email, and project scope before submitting.'
          })
        );
        return;
      }

      if (surveySubmitBtn) {
        surveySubmitBtn.disabled = true;
        surveySubmitBtn.textContent = 'Sending request…';
      }
      surveyStatus.replaceChildren();

      try {
        const res = await fetchJson(
          `${API_BASE}/inquiries`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          },
          10000
        );

        if (res && res.ok) {
          const refText = res.inquiryId ? ` (Ref: ${res.inquiryId})` : '';
          surveyStatus.replaceChildren(
            el(
              'div',
              { className: 'tk-status-box tk-status-box--ok' },
              el('strong', { textContent: `Site survey request received${refText}. ` }),
              res.message ||
                'Thank you — a TACHOS delivery engineer will respond directly to confirm scoping details.'
            )
          );
          surveyForm.reset();
        } else {
          renderSurveyFallback(payload);
        }
      } catch (_) {
        renderSurveyFallback(payload);
      } finally {
        if (surveySubmitBtn) {
          surveySubmitBtn.disabled = false;
          surveySubmitBtn.textContent = 'Send Site Survey Request';
        }
      }
    });
  }

  /* Bind all [data-open-survey] triggers across the page */
  document.addEventListener('click', (evt) => {
    const trigger = evt.target && evt.target.closest ? evt.target.closest('[data-open-survey]') : null;
    if (!trigger) return;
    evt.preventDefault();
    openSurveyModal(trigger.dataset.workArea || '', trigger);
  });

  /* Wire drawers and boot live data with graceful static fallback */
  wireDrawerChrome(readerBackdrop);
  wireDrawerChrome(threadBackdrop);
  wireDrawerChrome(surveyBackdrop);

  syncFilterButtons();
  loadKbStatus();
  loadArticles();
  loadForumTopics('');
})();
