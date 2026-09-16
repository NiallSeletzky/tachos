# James Control Visual Reference Architecture

**Version:** 1.0  
**Status:** Canonical working reference  
**Applies to:** James Control, TACHOS LTD, sub-projects, websites, dashboards, reports, presentations, PDFs, internal tools and future AI-generated media  
**Source cues:** James's six visual references supplied 16 September 2026

---

## 1. Design thesis

### Quiet system, vivid signal

The house style combines four apparently different instincts:

1. **Modernist order** — modular grids, strong alignment, restrained typography and clean information architecture.
2. **Panoramic calm** — wide compositions, large fields of breathing room, distant layers and patient visual pacing.
3. **Luminous intervention** — electric mineral colours, backlit surfaces and one decisive signal that carries the eye.
4. **Intelligent mischief** — a selective surreal or illustrated element that makes the work recognisably James rather than generic corporate design.

The result should feel **precise, cultured, technically capable and slightly unexpected**. It must never resemble a generic contractor template, a stock “cyber” website or a children's interface.

**Core sentence:** Build a calm, rigorous world; introduce one impossible thing.

---

## 2. What the reference images contribute

| Reference cue | Extracted principle | Use in the system |
|---|---|---|
| Modernist exhibition / Mondrian grid | Structure is visible; asymmetric modules still feel balanced | Page grids, dashboard tiles, data cards, section rhythm |
| Illuminated Chinese handscroll | Narrative unfolds horizontally; negative space is active; detail rewards attention | Hero bands, timelines, process maps, wide dividers, landscape-like diagrams |
| Yellow-green silk and blue mountains | Earth and technology can coexist; colour can feel ancient and futuristic at once | Foundation palette for TACHOS and James Control |
| Dark Philip Glass interface | Repetition, pulse and high contrast; one saturated control colour | Dark mode, media panels, active states, navigation |
| Bright repeated figures | A disciplined palette can support vivid human imagery | Campaign art, feature cards, editorial moments |
| Cartoon overlay on a real space | Humour, authorship and mixed reality | Easter eggs, personal tools, onboarding, experimental work only |

These are **principles, not assets to imitate literally**. Recognisable third-party characters, artwork or album imagery are not part of the reusable system.

---

## 3. Brand architecture

The system has one common grammar and four expression modes.

### 3.1 Common grammar

- Dark structural frame
- Warm, natural neutral surfaces
- Mineral blue as the primary technical signal
- Acid olive/lime as the organic-energy signal
- Large areas of visual quiet
- Modular, asymmetric composition
- Fine lines and restrained borders
- One memorable intervention per composition

### 3.2 Expression modes

| Mode | Purpose | Restraint | Signature |
|---|---|---:|---|
| **TACHOS / Executive Technical** | Client website, invoices, proposals, data-centre material | High | Dark graphite, parchment, electric blue; fibre-like paths and panoramic bands |
| **James Control / Operational** | Dashboards, trackers, status reports, internal tools | Medium-high | Dense but calm modular grid; lime and blue status signals; excellent scanability |
| **Editorial / Cultural** | Essays, research, travel, philosophy, music | Medium | Expansive landscapes, image-led pacing, warm yellow-green fields |
| **Experimental / Personal** | Avatars, playful tools, AI experiments, hidden details | Flexible | Surreal illustration, mixed reality and visual jokes contained within a disciplined frame |

Use the lowest degree of play appropriate to the audience. Client-facing TACHOS work may be distinctive, but never frivolous.

---

## 4. Colour system

The colours below are working design tokens derived from the references. They are deliberately more controlled than the source photographs.

### 4.1 Foundation

| Token | Hex | Role |
|---|---:|---|
| `ink-950` | `#0D0E13` | Primary dark canvas |
| `graphite-900` | `#17191F` | Raised dark surface |
| `slate-800` | `#262A31` | Panels, navigation, secondary dark |
| `parchment-100` | `#EEE8D7` | Primary light canvas |
| `silk-200` | `#D8D1B8` | Secondary light surface |
| `mist-50` | `#F7F6F0` | Document background |

### 4.2 Signature signals

| Token | Hex | Role |
|---|---:|---|
| `mineral-blue-500` | `#397DFF` | Primary action, links, technical diagrams |
| `scroll-blue-300` | `#73BCEB` | Secondary data series, atmosphere |
| `acid-olive-400` | `#B7C83A` | Progress, energy, approved emphasis |
| `silk-gold-400` | `#D9B83F` | Warm highlight, attention without alarm |
| `violet-pulse-500` | `#6B28D9` | Media, AI and experimental interaction |
| `coral-signal-500` | `#F35E4A` | Urgent emphasis and rare visual counterpoint |

### 4.3 Status colours

| State | Colour | Rule |
|---|---|---|
| Complete / healthy | `#7FAE3A` | Pair with text or icon, never colour alone |
| Active / in progress | `#397DFF` | Default operational status |
| Waiting / external dependency | `#D9B83F` | Amber-gold, not warning orange |
| At risk | `#F35E4A` | Use sparingly |
| Inactive / archival | `#777B84` | Maintain accessible contrast |

### 4.4 Colour ratios

- 65–80% foundation neutrals
- 15–25% one environmental hue: parchment, olive or blue atmosphere
- 5–10% active signal colour
- 0–3% counterpoint colour

Never use all signature colours at equal strength. One leads, one supports, the rest remain absent.

---

## 5. Typography

### 5.1 Recommended stack

- **Interface and body:** Inter, IBM Plex Sans or system sans-serif
- **Technical labels and numbers:** IBM Plex Mono or JetBrains Mono
- **Editorial accent:** Source Serif 4 or a restrained high-contrast serif

Use open, widely available fonts unless a licensed brand font is deliberately adopted later.

### 5.2 Hierarchy

- Headlines: compact, confident, sentence case; avoid marketing hyperbole
- Body: generous line height, narrow enough to read comfortably
- Labels: small, precise and slightly tracked; never tiny grey decoration
- Numbers: tabular figures in operational views
- Maximum two font families in one artifact

The typography should feel closer to an exhibition caption or engineering drawing than a software start-up advertisement.

---

## 6. Grid and composition

### 6.1 Base grid

- Use a 12-column web grid or a compatible 4-column mobile reduction.
- Build modules on an 8 px spacing unit.
- Prefer asymmetric spans such as 7/5, 8/4 and 5/3/4.
- Keep strong shared edges even when card sizes vary.
- Use one panoramic element across most or all columns when a page needs emotional scale.

### 6.2 The scroll principle

For timelines, service journeys, infrastructure explanations and project history, think like a handscroll:

- Reveal information progressively from left to right or top to bottom.
- Alternate open space with clusters of detail.
- Use distant, middle and foreground layers.
- Let connecting lines behave like routes through a landscape.
- Preserve orientation; the user should always know where they are.

### 6.3 Negative space

Empty space is content. It conveys confidence, separates operational priorities and prevents the colour system from becoming noisy. A useful default is to remove one card, rule or decoration after the composition appears complete.

---

## 7. Form language

- Corners: 6–12 px for interfaces; near-square for formal documents
- Borders: 1 px, low contrast; use dividers more often than shadows
- Shadows: broad and subtle, never glossy or skeuomorphic
- Lines: fine network paths, contour lines and modular rules
- Curves: reserved for panoramic ribbons, route lines and selected image masks
- Surfaces: matte, lightly textured, silk/paper/grain rather than glassmorphism
- Light: backlit bands and soft edge illumination are preferred to neon glows

Avoid visual clichés: server-rack stock photography, glowing padlocks, random circuit traces, hexagon wallpaper, blue-on-black “cyber” overload and indiscriminate gradients.

---

## 8. Imagery and illustration

### 8.1 Primary imagery

Choose images with:

- Wide spatial depth or strong architectural geometry
- Human scale within technical environments
- Routes, layers, thresholds, reflections or liminal spaces
- Controlled colour grading toward graphite, parchment, olive and mineral blue
- Evidence of real work, not corporate handshakes

### 8.2 Illustration

Illustration should be:

- Line-led and editorial rather than mascot-heavy
- Capable of mixing real environments with one surreal intervention
- Textured enough to feel authored
- Used as a focal event, not wallpaper

Do not reuse protected characters as brand devices. Translate the energy into original creatures, avatars, tools or visual anomalies.

### 8.3 Technical diagrams

Use accurate topology first. Add atmosphere only after clarity is secure. Recommended visual metaphor: a technical network rendered with the spatial calm of a landscape—nodes as settlements, routes as terrain paths, hierarchy as depth.

---

## 9. Motion and interaction

The default system is **static and composed**. Motion must explain state, direction or causality.

- 120–180 ms for direct interface feedback
- 240–400 ms for panels and contextual transitions
- Slow ambient movement only in explicitly experiential work
- Respect reduced-motion preferences
- No perpetual decorative animation on TACHOS client pages
- Hover states may reveal a fine route, contour or colour shift rather than moving the whole object

Philip Glass is the motion model: repetition with controlled variation, never random spectacle.

---

## 10. Application rules

### 10.1 TACHOS website

- Dark graphite or parchment foundation
- One broad, static panoramic hero composition
- Mineral blue for fibre/data routes; acid olive as a secondary accent
- Clear evidence, capabilities and contact path
- No vague “future of technology” slogans
- No continuous animation; a single deliberate transition is sufficient

### 10.2 James Control dashboard

- Operational grid first
- Status colour always paired with a word or symbol
- High information density in the centre; calm margins around it
- Mono numerals for dates, amounts and progress
- Active priorities receive one vivid signal; routine items remain neutral

### 10.3 Reports, invoices and formal documents

- Mist or parchment background, ink text
- Restrained blue/olive rule or section marker
- Square geometry, generous margins, exact tables
- Experimental imagery excluded unless the document is editorial
- Print legibility and monochrome survival are mandatory

### 10.4 Presentations

- One main idea per slide
- Use panoramic separators or edge-to-edge scenes sparingly
- Modular caption cards can echo the exhibition reference
- Alternate dense evidence slides with quiet synthesis slides

### 10.5 Personal and experimental work

- The surreal layer may become prominent
- Preserve the common grid and typography so play still feels intentional
- Original characters and mixed-media overlays are encouraged

---

## 11. Design tokens starter

```css
:root {
  --jc-ink-950: #0d0e13;
  --jc-graphite-900: #17191f;
  --jc-slate-800: #262a31;
  --jc-parchment-100: #eee8d7;
  --jc-silk-200: #d8d1b8;
  --jc-mist-50: #f7f6f0;
  --jc-mineral-blue-500: #397dff;
  --jc-scroll-blue-300: #73bceb;
  --jc-acid-olive-400: #b7c83a;
  --jc-silk-gold-400: #d9b83f;
  --jc-violet-pulse-500: #6b28d9;
  --jc-coral-signal-500: #f35e4a;

  --jc-space-1: 0.5rem;
  --jc-space-2: 1rem;
  --jc-space-3: 1.5rem;
  --jc-space-4: 2rem;
  --jc-space-6: 3rem;
  --jc-space-8: 4rem;

  --jc-radius-interface: 8px;
  --jc-radius-feature: 12px;
  --jc-border: 1px solid color-mix(in srgb, currentColor 16%, transparent);

  --jc-font-sans: Inter, "IBM Plex Sans", system-ui, sans-serif;
  --jc-font-mono: "IBM Plex Mono", "JetBrains Mono", monospace;
  --jc-font-editorial: "Source Serif 4", Georgia, serif;
}
```

These tokens are a starting point, not a substitute for checking WCAG contrast in the final context.

---

## 12. AI creation brief

Use this compact brief when commissioning a new artifact:

> Create within the James Control visual system: quiet modernist structure, panoramic spatial calm, graphite and warm parchment foundations, mineral-blue and acid-olive signals, fine technical lines, matte texture and one intelligent unexpected element. Prioritise clarity and real-world credibility. Avoid generic corporate templates, cyber clichés, glossy gradients, excessive animation and unstructured colour. Choose the appropriate expression mode: TACHOS Executive, James Control Operational, Editorial Cultural or Experimental Personal.

Add the artifact's audience, purpose, content and required mode after this paragraph.

---

## 13. Review checklist

Before approving any artifact, ask:

1. Is the information hierarchy obvious within five seconds?
2. Is the composition calm before colour is added?
3. Does one colour lead rather than several competing?
4. Is there enough negative space to signal confidence?
5. Is the distinctive element purposeful and appropriate to the audience?
6. Could this be mistaken for a generic tech template? If yes, revise.
7. Does it remain clear in monochrome, at mobile width and with reduced motion?
8. Are text and status distinctions accessible without relying on colour alone?
9. Is the work recognisably part of the same family as TACHOS and James Control?
10. Has every decorative element earned its place?

---

## 14. Governance

- This file is the canonical visual reference until superseded by a numbered revision.
- Future brand decisions should update this architecture rather than create disconnected styles.
- Sub-projects inherit the common grammar and select one expression mode.
- TACHOS client material defaults to Executive Technical.
- James Control defaults to Operational.
- New visual references should be recorded with: source, extracted principle, affected tokens/rules and approval date.
- Exceptions are allowed when deliberate; record the reason if they establish a reusable precedent.

### Current unresolved decisions

- Final TACHOS logotype and mark
- Exact production typefaces
- Whether TACHOS uses graphite-first or parchment-first as its dominant website theme
- Original illustration language for the personal/experimental mode
- Accessibility-tested component library

---

**Working name for the aesthetic:** **Luminous Systems**  
**Internal maxim:** **Order, distance, signal, mischief.**
