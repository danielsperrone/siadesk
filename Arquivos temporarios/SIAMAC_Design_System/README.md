# SIAMAC Design System

> *Soluções Inteligentes* — design tokens, components and product UI kits for the SIAMAC family of industrial automation and weighing software.

---

## About SIAMAC

SIAMAC is a Brazilian industrial-automation company based in Lauro de Freitas (Bahia) with operations in nine states and a technical team carrying 35+ years of combined experience. The company designs and ships **smart, practical solutions** that span three lines of work:

1. **Pesagem** — Truck and vehicle weighing for highway scales (*balanças rodoviárias*) — the flagship business.
2. **Desenvolvimento de software** — Custom industrial software, built with modern web stacks.
3. **Automação industrial** — Bespoke automation for factory floors and process control.

### Products

| Code | Name | Purpose |
|------|------|---------|
| **OWL** | Software de Pesagem de Veículos | Truck-scale weighing software — entry/exit tickets, anti-fraud monitoring, multi-station access. |
| **SWS** | Software de Pesagem de Carcaças | Carcass weighing for slaughterhouses. |
| **SDN** | Sistema de Dosagem Neural | Neural pump-dosing control system. |

The flagship product — and the one this design system models in its UI kit — is **OWL**: a Windows-based weighing application for highway truck scales, with optional cloud sync. It integrates with virtually every Brazilian scale-indicator brand over RS-232/USB and is the company's strongest market presence.

### Source material

This design system was built from:
- **Logo file:** `uploads/SIAMAC_NOVA_LOGO-01.webp` (1000×147 webp, supplied by the customer)
- **Marketing site:** https://siamac.com.br/ (Home + OWL product page consulted for copy tone, structure, content sections)
- **No codebase or Figma file was provided.** All UI kit screens are reconstructions informed by the OWL product description, feature list, FAQ and the customer's brief ("clean, elegant, big-company feel using SIAMAC colors").

> If you have access to OWL screenshots, the product PDF (`Apresentacao-OWL.pdf`), the WordPress theme, or a Figma file, **please attach them via the Import menu** — the UI kit will become significantly more accurate.

---

## Index — what's in this folder

| Path | Purpose |
|------|---------|
| `README.md` | This file. Brand context, content/visual/iconography rules. |
| `SKILL.md` | Agent skill manifest (Claude Code compatible). |
| `colors_and_type.css` | All color, type, spacing, radius, shadow and motion tokens as CSS custom properties. **Import this in every artifact you build.** |
| `assets/logo/` | Master logo files (color webp, color SVG, white SVG, mark-only). |
| `assets/brand/` | Brand motif fragments (red/green/blue color bars used as accents). |
| `preview/` | Static design-system cards consumed by the Design System tab. |
| `ui_kits/owl/` | OWL weighing-software UI kit — interactive HTML demo + JSX components. |

---

## Content fundamentals

SIAMAC writes for a Brazilian B2B industrial buyer — plant managers, fiscal-station operators, logistics directors, slaughterhouse owners. Copy is **Portuguese (pt-BR)** by default. The voice is **confident, technical, helpful** — never marketing-shouty.

### Voice & tone

- **Helpful expert, not salesperson.** Lead with the customer's problem. Most pages open with the *capability* ("Sistema para pesagem de veículos") before the brand benefit.
- **Plain technical Portuguese.** SIAMAC writes "Sistema desenvolvido com base nas premissas de usabilidade do Google" — long technical sentences, plain words, no jargon-for-jargon's-sake. Acronyms are spelled out (`RS-232C`, `MySQL`, `Power BI`).
- **"Nós" + "você"** — first-person plural for SIAMAC, second-person singular for the customer. Friendly distance, never "vocês" pluralized away.
- **Numbers are proof.** Recurring stats: **35+** anos de experiência, **9** estados, *100 pesagens* on trial, *39 anos* of expertise. Always render numerics with `--font-mono` and tabular figures.
- **Reassurance > hype.** Phrases the brand actually uses: *"Possuímos a solução ideal para sua empresa."* / *"Tem um projeto ou ideia? Não espere, vamos conversar."* / *"Pensaremos junto com você."* / *"Como podemos te ajudar?"* — warm collaborative posture.
- **Strong product naming.** OWL, SWS, SDN — three-letter all-caps codes presented prominently. Use them as proper nouns: "o software **OWL**", "o **OWL** registra…"

### Casing

| Surface | Rule | Example |
|---------|------|---------|
| Page titles & H1 | Sentence case, bold | *"O sistema ideal para realizar as pesagens"* |
| Section headings | Sentence case, occasional **bold inline phrases** | *"**Vigilância** Estabilidade Segurança"* |
| Eyebrows / micro-labels | UPPER-CASE with wide tracking | `PESAGEM` · `OWL` · `SDN` |
| Buttons (CTA) | Sentence case verbs | *"Entrar em contato"*, *"Saiba mais"*, *"Acessar produtos"* |
| Product codes | UPPER-CASE | OWL, SWS, SDN |

### Vibe

- **No emoji.** Industrial B2B brand — emoji breaks the tone.
- **No exclamation overdose.** One exclamation per section, max. The brand says *"Não espere, vamos conversar."* (period), not *"!"*.
- **Trustworthy, not playful.** Aim for the feel of Schneider Electric or Toledo do Brasil, never of a SaaS landing page.
- **Numbered lists are a brand signature.** The OWL feature page numbers 1 → 14 the recurring "Recursos do software" grid. Use numbered enumerations for feature lists rather than bullets when possible.

### Vocabulary (use this exact phrasing)

- *balança rodoviária* — highway truck scale
- *pesagem de veículos / caminhões* — vehicle / truck weighing
- *ticket de pesagem* — weighing ticket
- *indicador de peso* — scale indicator
- *carga / descarga* — load / unload
- *tara* — tare weight
- *fraude* — fraud (a key OWL value prop)
- *solução customizada* / *softwares customizados* — custom software solution
- *corpo técnico* — engineering / technical team

---

## Visual foundations

### Core color palette

The brand owns three highly saturated logo colors stacked vertically as horizontal bars to the left of the wordmark — bordeaux, emerald, navy. The wordmark itself is near-black. All three colors carry equal hierarchical weight in the mark.

| Role | Hex | Where to use |
|------|-----|--------------|
| **Bordeaux (red)** | `#800000` | Brand accent, alert states, the "fragmento vermelho" graphic motif. Sparingly — never as a primary surface. |
| **Emerald (green)** | `#018743` | Success states, positive numerics, the "fragmento verde" motif. Approved/within-tolerance weights. |
| **Navy (blue)** | `#004788` | **Primary UI color.** Buttons, links, focus rings, the "azul" motif. The most trustworthy of the three. |
| **Near-black** | `#0B0F14` | Wordmark, headings, primary text. Slightly warm so it sits next to navy without clashing. |

For UI work, **navy is the workhorse primary**; red and green are reserved for the brand bars motif and for semantic alerts/success. This restraint is what differentiates "SIAMAC industrial-clean" from "WordPress-colorful".

### Neutral scale

A graphite scale tuned slightly cool (a hint of blue) so it harmonizes with the navy primary rather than fighting it. See `colors_and_type.css` → `--ink-0…--ink-900`.

### Typography

| Role | Family | Notes |
|------|--------|-------|
| **Display / brand** | **Manrope** (700–800) | Geometric sans with a closed-top M and pointed-A apex — the closest free match to the heavy geometric letters in the SIAMAC wordmark. |
| **UI / body** | **Inter** (400–600) | Industry-standard, exhaustive language support including pt-BR diacritics. |
| **Numerics / readouts** | **JetBrains Mono** (400–700) | Used for the weight readout on the OWL dashboard, ticket numbers, IDs and code samples. Tabular figures by default. |

> ⚠️ **Font substitution flag.** The customer did not supply font files; the original WordPress site uses a default theme stack. Manrope + Inter + JetBrains Mono is my best-guess match for the wordmark and the desired "big-company industrial" feel. **If SIAMAC has a brand font on file, please share it and we'll swap.**

### Spacing & rhythm

A 4-px base grid with named tokens (`--space-1` … `--space-24`). Page gutters on desktop default to **48px** (`--space-12`); section vertical rhythm uses **96px** (`--space-24`). Industrial UI density — components sit closer than a typical SaaS marketing page.

### Corners

SIAMAC is **not a "rounded" brand.** The logo is built from hard rectangles; the UI follows. Default radii are small:

- Inputs and buttons: **6 px** (`--radius-md`)
- Cards and panels: **10 px** (`--radius-lg`)
- Dialogs / sheets: **16 px** (`--radius-xl`)
- Pills / status chips: **999 px** (the only exception)

### Shadows & elevation

Soft, blue-tinted shadows — never blurry purple bloom. Four steps from `--shadow-1` (resting cards) to `--shadow-4` (modals). Plus `--shadow-focus` — a 3-px navy ring at 22 % opacity for focus states.

### Borders

Components rely more on borders than shadows for definition — appropriate to an industrial control-room feel. Default border is `var(--ink-100)` 1 px. Hovered/active inputs upgrade to `var(--ink-200)`; focused inputs use `var(--siamac-blue-500)` 1 px plus the focus shadow.

### Backgrounds & imagery

- **Page background:** `var(--ink-50)` — a near-white with a hint of blue.
- **Surfaces:** pure white (`#FFFFFF`).
- **Inverse hero / footer:** `var(--ink-900)` (near-black), with the white logo SVG.
- **Photography vibe:** real industrial photography — trucks, scales, factory floors. Slightly cool color grade, never warm sepia. Reference the marketing site's hero image (`whells.jpg` — semi-truck wheels).
- **Brand fragments** (the bordeaux/emerald/navy bars from the logo, isolated) are SIAMAC's signature graphic motif — used as **section dividers**, left-edge accents on hero blocks, and overlay shapes. Files at `assets/brand/fragment-*.svg`.
- **No gradients on surfaces.** A single radial glow on inverse heroes is OK; gradient backgrounds on cards are not on-brand.
- **No hand-drawn illustrations.** SIAMAC is an industrial brand; rely on real photography + the brand-bar motif + clean geometry.
- **No textures, patterns or grain.** Flat surfaces. Industrial precision.

### Layout rules

- **12-column grid** at desktop, 1280-px max content width inside a 1440-px frame.
- **Page header is fixed-top** with a white-on-white border-bottom; sidebar in the OWL app is fixed-left at 240 px.
- **Eyebrow → Title → Body** is the canonical content stack on marketing-style sections, separated by `--space-3` then `--space-4`.
- **Stats blocks** (the recurring `35+` and `9` from the site) use a **huge mono numeral** + a thin rule + small body — defined in `preview/stat-block.html`.

### Motion

Restrained. Industrial software — not a marketing site.

- **Default duration:** 200 ms (`--dur-base`) with `var(--easing-standard)`.
- **Hover transitions:** background-color and border-color fade in 120 ms.
- **Press states:** no shrink, no bounce — just a one-step-darker background and a 1-px inset border.
- **Focus rings:** appear instantly, do not animate.
- **No parallax, no scroll-triggered zoom, no autoplay video, no Lottie.**

### Hover & press states

| State | Buttons (primary) | Buttons (secondary) | Cards |
|-------|------------------|---------------------|-------|
| Rest | `--color-primary` bg, white fg | white bg, `--ink-100` border, `--fg-1` fg | white bg, `--ink-75` border |
| Hover | `--color-primary-hover` bg | `--ink-25` bg | `--shadow-2` elevates, border `--ink-100` |
| Press | `--color-primary-press` bg | `--ink-75` bg | shadow returns to `--shadow-1` |
| Focus | + `--shadow-focus` ring | + `--shadow-focus` ring | + 2-px `--border-focus` outline |
| Disabled | `--ink-200` bg, `--fg-disabled` fg | same, no border | 60% opacity |

### Transparency & blur

- **Modal overlay:** `rgba(11,15,20,0.56)` — no blur. Crisp, industrial.
- **Sticky table headers** get a `backdrop-filter: blur(8px)` on a 92%-opaque white background.
- **No "frosted glass" panels** elsewhere — it does not match the brand's confidence.

### Card anatomy

```
┌──────────────────────────────────┐  white surface
│  EYEBROW (mono, 11px, navy)      │  10-px radius
│                                  │  1-px ink-75 border
│  Title (display 600, 22px)       │  shadow-1 at rest
│  Body copy in fg-2.              │  hover → shadow-2
│                                  │
│  [Primary CTA]  Secondary link → │
└──────────────────────────────────┘
```

---

## Iconography

SIAMAC's existing marketing site uses **PNG icons exported from the "Icons8 Carbon Copy" set** (e.g. `icons8_computer_chat_96px.png`, `icons8_show_property_96px.png`) — colored line illustrations with rounded strokes and brand-blue/green fills. They are decorative, not functional UI icons.

For **product UI** (the OWL dashboard etc.) the brand has no documented icon system. To keep things clean and industrially appropriate, this design system pulls from **[Lucide](https://lucide.dev/)** — a popular open-source line-icon set with a consistent 24×24 grid and 1.5-px stroke that reads as confident and technical.

- **Stroke weight:** 1.75 px in 24-px icons (slightly heavier than Lucide's default 2 px feels right at SIAMAC's "industrial-clean" density).
- **Default size:** 16, 20, 24 px. The "lg" desktop UI default is 20 px.
- **Default color:** `currentColor` so icons inherit text color — `--fg-3` in resting UI, `--color-primary` in active nav, `--color-success`/`--color-danger` in semantic contexts.
- **Loaded from CDN** in this design system (`https://unpkg.com/lucide@latest`) — switch to a self-hosted bundle for production.

> ⚠️ **Substitution flag.** Lucide is a substitute, not the brand's own icon set. If SIAMAC has a specific icon library or wants to commission one, please share and we'll re-skin the UI kit.

### Emoji & unicode

- **Emoji are never used** in product UI or marketing.
- **Unicode geometry** (✓ ✕ → ↗) is used sparingly in status indicators and inline arrows — see the `preview/icons-set.html` card.
- **No favicons-as-icons** in the product UI.

### Logo usage

| File | When |
|------|------|
| `assets/logo/siamac-logo-color.webp` | **Default. Use this everywhere.** The official SIAMAC artwork. |
| `assets/logo/siamac-logo-color.webp` + `filter: brightness(0) invert(1)` | Dark/inverse backgrounds — invert the official artwork via CSS rather than swapping files, so the letterforms stay exact. |
| `assets/logo/siamac-mark.svg` | App icons / favicons / anywhere ≤32 px where only the three-bar mark is needed. (Bars only — no wordmark involved, so the SVG approximation is safe.) |

**Clear space** around the logo is the height of one bar (~32 px at native size). Never put the logo on top of the brand-fragment motif. Never stretch, recolor or rearrange the bars.
