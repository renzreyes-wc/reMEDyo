# Design

## Context

The current token layer is a Tailwind 4 `@theme` block in `apps/web/app/globals.css`: a teal `brand` ramp, a grey `ink` ramp, `alert` and `danger`, two surface colours, and a single `--radius-card`. Components consume it through Tailwind utilities. See proposal.md — Why for the four defects this rebuild exposes; the specs in `specs/` are the contract.

What constrains the approach:

- **Tailwind 4 is CSS-first.** There is no `tailwind.config.js`; `@theme` *is* the configuration, and every `--color-x-y` token in it generates `text-x-y`, `bg-x-y`, `border-x-y` automatically. Renaming a token renames every utility built from it.
- **78 usages of `text-ink-400` / `text-ink-500`** and **15 slash-opacity expressions** are spread across the marketing pages, the UI primitives and all three role areas. This is a wide, shallow migration, not a deep one.
- **Fonts are currently broken, not merely external.** `--font-sans` resolves `var(--font-inter)`, which nothing defines. The fix is to load fonts properly, not to move an existing load.
- **No backend involvement.** `apps/api` is untouched.

## Goals / Non-Goals

**Goals:**

- One token layer that every surface reads from, where a role has a name.
- A palette that provably satisfies the contrast requirement it ships with — checked numerically, not by eye.
- Colour meaning that survives the restyle: alert stays alert, decorative stays decorative.
- A migration a reviewer can follow: tokens first, primitives second, screens last.

**Non-Goals:**

- Dark mode. The semantic layer is shaped so a dark palette is a second `:root` block later, but no dark values ship here.
- Motion, animation or transition work beyond what already exists.
- Restructuring components. This changes how things look, not what they are or where they live.
- Copy changes beyond the hero's mislabelled example.

## Decisions

### The palette, and why `brand-600` moved

Ground `#F2FAF7` canvas, `#FFFFFF` surfaces. Text `#17332C` primary, `#55706A` muted.

```
brand    50 #E6F7F1   100 #D8F0E7   300 #5FBE9E   600 #0D7C62   900 #0C4A3E
support  100 #F0EEFB  300 #D9D4F6   500 #9A90E0   600 #6B5FC4   700 #4A3F9E
peach    #FFE2C9  (decorative only)
```

`brand-600` is `#0D7C62`, not the `#0E8368` originally proposed. Measured against the requirement this change introduces:

| pair | `#0E8368` | `#0D7C62` | needs |
| --- | --- | --- | --- |
| on canvas `#F2FAF7` | 4.43:1 ✗ | **4.86:1** ✓ | 4.5:1 |
| on `brand-50` tint | 4.24:1 ✗ | **4.65:1** ✓ | 4.5:1 |
| on white | 4.70:1 ✓ | 5.15:1 ✓ | 4.5:1 |

The original value failed as text on the two tinted grounds it is most used on, which would have made the specification contradict itself on day one. Darkening one step on the same hue clears both. *Alternative considered:* keep `#0E8368` as a fill-only colour and use `brand-900` for all brand-coloured text — correct but noisier, since every brand text token in the markup would have to change.

Everything else in the palette already passes: primary text 12.80:1, muted 5.06:1, `support-600` 4.88:1, `support-700` 7.93:1, `support-700` on `support-100` 7.34:1.

**`brand-300` (2.12:1) and `support-500` (2.66:1) are non-text tokens.** Fills, borders, icons, chart marks. They are named in this table so nobody reaches for them as a text colour later; the spec's contrast requirement is what catches it if they do.

**Peach carries primary text only** (10.98:1). Muted text on peach measures 4.34:1 and fails. Since peach is art-only this should rarely arise, but the constraint is recorded rather than left to be rediscovered.

### Colour gains a job

The present interface has one hue doing everything, which is why badges drift toward amber. The split:

- **Alert (amber)** — emergency guidance, safety messaging, the prototype disclaimer, the non-dispensable prescription label. Nothing else. This is the one hue whose meaning the product depends on.
- **Support (lavender)** — informational chips, specialty tags, match explanations, neutral states. New, and its entire purpose is to give ordinary badges somewhere to go so they stop borrowing amber.
- **Brand (teal)** — primary actions, active navigation, brand moments.
- **Peach** — hero and empty-state art. Never a badge, so a decorative panel can never read as a warning at a glance.
- **Danger (red)** — destructive actions and errors, unchanged.

The spec adds that state is never conveyed by colour alone; the existing badges already pair colour with a word, and that stays.

### The semantic layer is the point

Two tiers. A *palette* tier holds raw ramps. A *semantic* tier names roles, and components only ever touch the second:

```
--color-surface          #FFFFFF     --color-text-primary     #17332C
--color-surface-sunk     #F2FAF7     --color-text-muted       #55706A
--color-canvas           #F2FAF7     --color-text-on-brand    #FFFFFF
--color-border-subtle    #D8F0E7     --color-border-strong    #3A9E7C
```

`--color-border-strong` is `#3A9E7C` — a new `brand-400` step — rather than
`brand-300 #5FBE9E` as first planned. The contrast script caught it: a form
control's boundary has to reach 3:1 against its surface (WCAG 1.4.11) or the
control is not distinguishable, and `brand-300` measures 2.25:1. `#3A9E7C`
clears both grounds (3.30:1 on surface, 3.11:1 on canvas) at the same hue.
This also fixes a defect that predates the restyle: inputs were bordered with
`ink-200 #D5D9DD`, which measures **1.42:1**.

This is what kills the 15 `ink-200/70`-style expressions: each exists because a role had no name, so the markup invented one with an opacity modifier. Naming the role removes the need. It is also the whole of the dark-mode preparation — a later change redefines the semantic tier and the palette tier stays put.

*Alternative considered:* one flat tier with better names. Rejected — the raw ramps are still needed for the cases where a specific step is genuinely wanted, and collapsing the tiers means dark mode has to rewrite every value rather than the dozen that describe roles.

### Radius and elevation

Radius `12 / 18 / 24 / full`, with `--radius-card` moving `0.875rem → 1.5rem`. The jump is the single biggest contributor to the softer feel, and because every card already reads `--radius-card`, it lands everywhere at once.

Elevation collapses to three steps — `flat` (border only), `raised` (cards), `floating` (popovers, the notification panel). The current shadows are ad-hoc one-offs; three named steps are enough for this product and make "which shadow?" a decision with three answers rather than infinite.

### Typography

Fraunces for `h1`–`h3`, Nunito Sans for body and UI, both through `next/font/google` in `apps/web/app/layout.tsx`. `next/font` downloads the files at build time and serves them from the app's own origin, which satisfies the self-hosted-assets requirement with no runtime font request — and fixes the current silent fallback, since `next/font` produces a real CSS variable instead of the undefined `--font-inter` the stylesheet references today.

Fraunces is a variable display serif with an optical-size axis; it is used only at heading sizes, where a serif reads as considered rather than clinical. Nunito Sans carries everything else. Both are subset to `latin`.

*Alternative considered:* self-host the `.woff2` files directly. Equivalent at runtime, more to maintain, and `next/font` already handles subsetting, preloading and the fallback-metrics adjustment that prevents layout shift.

### The hero stays markup

The hero's sample doctor list is hand-built markup — a live mock of real match output — and it stays that way, restyled, with decorative peach art behind it. It is more honest than stock illustration and needs no asset pipeline.

What changes is the label. "Suggested for you" becomes **"After a one-minute intake"**, with a caption naming the example symptom ("Example: chest tightness"). The visitor is unauthenticated and matching is patient-only, so nothing suggested *for them* can exist; the old label claimed a personalisation the product cannot have performed.

### Assets

`apps/web/public/` gains a favicon, an Open Graph image, and the hero's decorative art, all as SVG where possible so they stay small and sharp. `metadata.icons` and `metadata.openGraph` are declared in the root layout, with `metadataBase` set so the OG URL resolves absolutely.

### Migration order

Tokens, then primitives, then screens. `components/ui` is the choke point — nearly every screen composes `Card`, `Badge`, `Button`, `Alert`, `EmptyState`, so getting the primitives right moves most of the interface before a single page file is edited. The per-screen work that remains is mostly replacing `text-ink-400` / `text-ink-500` with `text-text-muted` and dropping the opacity hacks.

## Risks / Trade-offs

- **A wide mechanical sweep is easy to do incompletely** → `text-ink-*` and `ink-*/NN` are both greppable; the old `ink` ramp is deleted from `@theme` at the end, so any missed usage fails the build rather than silently rendering an undefined colour.
- **Contrast can regress in a later edit** → the ratios are recorded in this document and the requirement is in `specs/visual-system/`. Any new pair is checkable against the same arithmetic.
- **Fraunces at body size would hurt readability** → it is scoped to `h1`–`h3` only; everything else is Nunito Sans.
- **Two font families cost bytes** → both are subset to `latin` and served from the app's origin; Fraunces is variable, so one file covers the heading weights.
- **The peach/amber distinction is a judgement a future contributor could blur** → it is written as a requirement with its own scenarios, not left as a convention.
- **Deleting the `ink` ramp touches many files at once** → the change is confined to `apps/web`, no backend or data is involved, and reverting is a single revert.

## Migration Plan

Frontend-only; there is no data migration and no deployment coordination. The new token layer lands with the components that consume it, so no intermediate state ships where tokens exist but nothing uses them. Rolling back is reverting the change — `apps/api`, Prisma and the seed are untouched, so a revert cannot strand the database.

## Open Questions

- The exact Open Graph image artwork — composition and wording — is a design detail that changes no requirement and no task.
- Whether `Fraunces` also suits `h4` is worth trying at implementation time; the type scale allows either and neither choice alters the spec.
