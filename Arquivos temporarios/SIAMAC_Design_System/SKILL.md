---
name: siamac-design
description: Use this skill to generate well-branded interfaces and assets for SIAMAC — an industrial automation and truck-weighing software company based in Brazil. Useful for production UI, throwaway prototypes, marketing mocks, internal slides, ticket layouts, balance-control dashboards, and anything else that needs to feel like an authentic part of the SIAMAC family of products (OWL, SWS, SDN).
user-invocable: true
---

Read the `README.md` file at the root of this skill — it contains the full brand context (the company, products, content fundamentals, visual foundations, iconography). Then explore the other available files:

- `colors_and_type.css` — the single source of truth for design tokens. Import it into every artifact: `<link rel="stylesheet" href="colors_and_type.css">` (adjust path).
- `assets/logo/` — the SIAMAC wordmark (color, white, mark-only).
- `assets/brand/` — the bordeaux/emerald/navy bar motifs.
- `preview/` — small static cards demonstrating every token, component, and pattern. Read these to understand correct usage before you build.
- `ui_kits/owl/` — a working React-based UI kit for SIAMAC's flagship product OWL (truck-scale weighing software). `components.jsx` exposes `<Button>`, `<Pill>`, `<Card>`, `<Field>`, `<StatTile>`, `<Plate>`, `<Eyebrow>`, `<BrandBars>` and `<Icon>` (Lucide-backed). Lift these whenever you build SIAMAC product surfaces.

## Working rules for SIAMAC

1. **Language is Portuguese (pt-BR)** unless told otherwise. Use the brand's exact vocabulary — *balança rodoviária, ticket de pesagem, pesagem de veículos, tara, peso bruto, peso líquido, carga / descarga*.
2. **Navy primary, restrained accents.** `--color-primary` (navy) does the workhorse work — buttons, links, focus rings. Bordeaux and emerald are reserved for the brand-bar motif, semantic alerts, and success states. Never paint surfaces in red or green.
3. **The three-color bar is the brand signature.** Use `<BrandBars>` or `assets/brand/fragment-stack.svg` as section dividers, left-edge accents on hero panels, and document headers. Always in the same order: red → green → blue.
4. **Industrial corners.** Default radii are small (6 px buttons, 10 px cards). Never round more.
5. **Numerics use JetBrains Mono with tabular figures.** Every weight, ticket number, plate, count, percentage.
6. **No emoji, no gradients on surfaces, no hand-drawn illustrations.** A single radial glow on inverse heroes is the only gradient permitted.
7. **Icons are Lucide line, 1.75 px stroke.** Use `<Icon name="truck" />` from `ui_kits/owl/components.jsx`, or load `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js` directly.
8. **Trustworthy, technical tone.** Sentence-case headings, eyebrows in ALL CAPS with `.14em` tracking, "nós + você" voice, technical Portuguese, occasional inline bold for emphasis. Never exclamation-shouty.

## When invoked

If creating **visual artifacts** (slides, mocks, throwaway prototypes), copy the assets you need into the working folder and build static HTML that imports `colors_and_type.css`. For decks: light surfaces with the brand-bar fragments as section dividers; inverse hero (`--ink-900` with a navy radial glow) for title slides. For mocks: use the OWL UI kit as a reference for chrome, layout density and component behavior.

If working on **production code**, you don't need to copy assets — read the rules in `README.md` and the CSS variables in `colors_and_type.css`, and apply them in your own codebase.

If the user invokes this skill without specific guidance, ask them what they want to build, ask a handful of focused questions (what product surface, audience, fidelity, in pt-BR or en-US, whether they want options), then act as an expert designer who outputs HTML artifacts or production code depending on the need.
