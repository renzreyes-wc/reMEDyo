# Proposal

## Why

The current interface works but reads as a generic SaaS product: cool grey neutrals, tight radii, and a single teal doing every job at once. For a health service the look is part of the promise — people decide whether to trust a clinical product before they read a word of it. "Soft Care" warms the ground, softens the geometry, and gives the palette enough range that colour can start carrying meaning instead of decoration.

Rebuilding the visual layer also forces four defects into the open that the current styling has been hiding:

- **The landing page lies to visitors.** Its hero labels a sample doctor list "Suggested for you". The visitor is unauthenticated and the entire matching surface sits behind a patient-only role guard, so no suggestion for that person can exist. Example output is being presented as personalised.
- **No font is actually loaded.** `--font-sans` resolves `var(--font-inter)`, which is defined nowhere in the codebase — there is no `next/font` import anywhere. Every screen has been silently falling back to the system UI font.
- **`apps/web/public/` is empty.** There is no favicon and no Open Graph image, so a shared link renders with a blank icon and no preview card.
- **Two grey steps fail contrast where they carry text.** `ink-400` measures 3.17:1 on white and `ink-500` 4.39:1 on the canvas, both under the 4.5:1 body-text floor. Between them they appear in 78 places in the markup.

## What Changes

- **New token layer.** A warmer ground, a brightened teal, a new lavender support hue, a decorative peach, a four-step radius scale, three elevation steps, and semantic aliases (`--color-border-subtle`, `--color-text-muted`, `--color-surface-sunk`) so markup stops reaching for opacity hacks like `ink-200/70` — 15 of which exist today. Exact values live in design.md.
- **Colour gains meaning.** Amber stays reserved for safety and prototype notices. The lavender support hue takes over informational chips, specialty tags and match explanations, which currently borrow the brand or amber ramps. Peach is decorative only — hero and empty-state art — and never a badge, so it cannot be misread as a warning.
- **Typography.** Fraunces for h1–h3, Nunito Sans for body and UI, both self-hosted through `next/font/google`, which downloads the files at build time and serves them from the application. This closes the missing-font defect and satisfies the existing self-hosted-assets requirement without a runtime CDN request.
- **Honest example content.** The hero's sample list is relabelled "After a one-minute intake" with a caption naming the example symptom, so it reads as an illustration rather than a personalised result.
- **Missing web assets.** A favicon and an Open Graph image are added under `apps/web/public/`, with the corresponding `metadata.icons` and `metadata.openGraph` declarations.
- **Contrast is enforced, app-wide.** Every text and background pair meets WCAG AA — 4.5:1 for body, 3:1 at 24px and above. The 78 `text-ink-400` / `text-ink-500` usages are migrated to compliant tokens.
- **Every surface is rebuilt on the new system:** `globals.css`, the `components/ui` primitives, the marketing pages, the authenticated app shell, and the patient, doctor and admin screens.

Decisions taken during planning, recorded because they change what gets built:

- **`brand-600` moves from `#0E8368` to `#0D7C62`.** The proposed value measured 4.43:1 on the canvas and 4.24:1 on its own `brand-50` tint — it could not satisfy the AA requirement this change introduces. The darkened value clears both (4.86:1 and 4.65:1) at the same hue. Without this the specification would have contradicted itself.
- **The hero stays hand-built markup, restyled**, with decorative peach art behind it. It is a live mock of real match output, which is more honest than stock illustration and needs no asset pipeline. The images-from-`public/` requirement is written as a standing rule that binds whatever images the marketing pages do carry.
- **Contrast and colour-meaning rules live in a new cross-cutting capability**, not in `product-website`. The scope covers every screen, and a requirement filed under the public site would not bind the admin console.
- **`brand-300` and `lavender-500` are non-text tokens** (2.12:1 and 2.66:1 against the canvas). They are for fills, borders and icons; the design records this so nobody reaches for them as a text colour.

## Capabilities

### New Capabilities

- `visual-system`: The cross-cutting presentation contract — colour contrast on every authenticated and public surface, the reserved meanings of the safety and decorative hues, and the requirement that the interface express tone through named semantic tokens rather than ad-hoc opacity.

### Modified Capabilities

- `product-website`: Three requirement changes and one addition. **Public landing page** gains the rule that unauthenticated surfaces must not present example output as personalised to the visitor. **Self-hosted content and assets** is tightened to state that fonts are downloaded at build time and served by the application, with no runtime request to a font or image host. A new requirement covers the favicon and Open Graph image, which have no equivalent today.

## Impact

- **Frontend only.** `apps/web/app/globals.css` (token layer rewritten), `apps/web/app/layout.tsx` (font loading, metadata), `apps/web/components/ui/*`, every route group under `apps/web/app/`, and the feature folders that carry their own markup.
- **New assets** under `apps/web/public/`: favicon, Open Graph image, and the decorative hero art.
- **New dependency-free font loading** via `next/font/google`, already available in Next 16.
- **No backend changes.** No API, Prisma schema, migration, or seed is touched. `apps/api` is untouched by this change.
- **No behavioural product change.** No new features; the booking, consultation, records and admin flows behave exactly as they do now.
- **Out of scope** — dark mode (the semantic tokens are chosen to make it cheap later, but no dark palette ships here), motion or animation work, and any change to copy beyond the hero's mislabelled example.
