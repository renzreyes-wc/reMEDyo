# Tasks

Ordered tokens → primitives → screens. `components/ui` is the choke point: nearly every screen composes `Card`, `Badge`, `Button`, `Alert` and `EmptyState`, so most of the interface moves before a single page file is edited. 32 files reference the `ink` ramp today; the ramp is deleted last so any missed usage fails the build instead of silently rendering nothing.

## 1. Token layer

- [x] 1.1 Rewrite the `@theme` block in `apps/web/app/globals.css` with the Soft Care palette tier — canvas `#F2FAF7`, surface `#FFFFFF`, brand `50 #E6F7F1 / 100 #D8F0E7 / 300 #5FBE9E / 600 #0D7C62 / 900 #0C4A3E`, support `100 #F0EEFB / 300 #D9D4F6 / 500 #9A90E0 / 600 #6B5FC4 / 700 #4A3F9E`, peach `#FFE2C9`, text `#17332C` / `#55706A` — keeping the existing `alert` and `danger` ramps untouched; verify `pnpm --filter @remedyo/web build` succeeds and the generated utilities (`bg-brand-600`, `text-support-700`) resolve
- [x] 1.2 Add the semantic token tier — `--color-surface`, `--color-surface-sunk`, `--color-border-subtle`, `--color-border-strong`, `--color-text-primary`, `--color-text-muted`, `--color-text-on-brand` — each aliasing a palette step; verify each generates its utility and that changing one alias value visibly moves every surface expressing that role
- [x] 1.3 Replace the radius scale with `12 / 18 / 24 / full` and set `--radius-card` to `1.5rem`; verify all 10 existing `radius-card` references pick up the new value with no per-component override
- [x] 1.4 Define exactly three elevation tokens — flat, raised, floating — and remove the ad-hoc inline shadow expressions currently in `components/ui` and the marketing page; verify no `shadow-[...]` arbitrary value remains outside the token definitions
- [x] 1.5 Write a contrast check script that asserts every semantic text/background pair meets 4.5:1 (3:1 at 24px+) and run it against the new tokens; verify it passes for primary, muted, brand-600 and support-600/700 on both canvas and surface, and that it fails loudly if a value is regressed

## 2. Typography

- [x] 2.1 Load Fraunces and Nunito Sans via `next/font/google` in `apps/web/app/layout.tsx`, subset to `latin`, exposing each as a CSS variable; verify the variables are emitted on `<html>` and that no `--font-inter` reference survives anywhere
- [x] 2.2 Point `--font-sans` at Nunito Sans and add `--font-display` for Fraunces, applying the display face to `h1`–`h3` only; verify a rendered heading computes to Fraunces and body text to Nunito Sans rather than falling back to a system font
- [x] 2.3 Confirm no runtime font request leaves the application — load the landing page with devtools open and verify every font file is served from the app's own origin, satisfying the self-hosted-assets requirement

## 3. UI primitives

- [x] 3.1 Restyle `Card`, `CardHeader` and `PageHeading` in `apps/web/components/ui/index.tsx` onto the semantic tokens and the new radius, removing the `ink-200/70` and `ink-100/*` opacity expressions; verify no slash-opacity colour remains in the file
- [x] 3.2 Restyle `Button` and `ButtonLink` across all four variants on the new brand tokens; verify the primary variant's white label on `brand-600` and the secondary variant's text on surface both meet 4.5:1
- [x] 3.3 Move `Badge` tones onto the support hue for informational and neutral states, leaving the alert tone for safety and prototype notices only; verify no badge renders in peach and that every tone's text clears 4.5:1 against its own tint
- [x] 3.4 Restyle `Alert` so the warning and danger tones keep their reserved meaning and the info tone moves to the support hue; verify the emergency guidance on the landing page and the prototype disclaimer both still render in the alert hue
- [x] 3.5 Restyle `Input`, `Textarea`, `Select` and `Field` on the new border and text tokens; verify the focus ring meets 3:1 against the adjacent surface and that placeholder text meets 4.5:1
- [x] 3.6 Restyle `Avatar`, `Spinner` and `EmptyState`, using peach for the empty-state artwork only; verify the empty state carries no element a reader could mistake for a status indicator
- [x] 3.7 Restyle `logo.tsx` on the new brand value; verify it reads correctly on both the white marketing header and the canvas-grounded app shell

## 4. Marketing pages

- [x] 4.1 Relabel the hero's sample doctor list from "Suggested for you" to "After a one-minute intake" and add a caption naming the example symptom; verify no label on any unauthenticated surface states or implies the output was generated for that visitor
- [x] 4.2 Restyle the hero on the Soft Care tokens with decorative peach art behind the sample list, keeping the list as markup rather than an image; verify the peach appears only as artwork and never as a badge or status surface
- [x] 4.3 Restyle the how-it-works, capabilities and trust sections of `app/(marketing)/page.tsx`; verify the emergency guidance block still renders in the alert hue and remains visible without interaction
- [x] 4.4 Restyle `app/(marketing)/layout.tsx` header and footer, and the `terms` and `privacy` pages; verify all three routes still return 200 and the footer legal links still resolve
- [x] 4.5 Restyle `app/(auth)/layout.tsx` and the sign-in and both registration forms; verify inline validation errors meet 4.5:1 against their background
- [x] 4.6 Verify the landing page at 375px width still reads in a single column with no horizontal page scroll after the restyle

## 5. Web assets and metadata

- [x] 5.1 Add a favicon to `apps/web/public/` and declare it in `metadata.icons`; verify a browser tab shows the icon and the file is served from the application
- [x] 5.2 Add an Open Graph image to `apps/web/public/`, declare `metadata.openGraph` and set `metadataBase` so the URL resolves absolutely; verify the rendered `<head>` carries an absolute `og:image` URL
- [x] 5.3 Add the hero's decorative art as a file under `apps/web/public/`; verify the marketing pages request it from the application's own origin and no external image host appears in the page's network activity

## 6. Authenticated screens

- [x] 6.1 Restyle `features/shell/app-shell.tsx` — header, role chip, nav tabs and footer — on the semantic tokens; verify the active nav tab's indicator meets 3:1 against its surround
- [x] 6.2 Restyle `features/notifications/notification-bell.tsx`, moving the unread badge and the "starting soon" panel onto brand and support tones; verify the unread count badge meets 4.5:1 and does not use the alert hue
- [x] 6.3 Restyle the patient screens — overview, profile, find-doctor, doctor detail, appointments, records; verify the prescription's non-dispensable label still renders in the alert hue
- [x] 6.4 Restyle `features/doctors/doctor-card.tsx` and `features/appointments/{appointment-card,slot-picker}.tsx`, moving specialty tags and match explanations onto the support hue; verify each appointment state badge still names its state in text as well as colour
- [x] 6.5 Restyle the doctor screens — overview, profile, schedule, consultations queue, record form; verify the "needs a written record" emphasis no longer borrows the alert hue unless it is a safety notice
- [x] 6.6 Restyle the admin screens — dashboard, users, doctor review, appointments, audit log — including the table headers and row borders; verify table text meets 4.5:1 against both striped and plain rows
- [x] 6.7 Restyle `app/consultation/[id]/page.tsx`, keeping the patient-context panel's allergy emphasis legible; verify the allergy rows meet 4.5:1 and the session state badge names its state in text

## 7. Completion

- [x] 7.1 Delete the old `ink` ramp and any now-unused colour tokens from `@theme`; verify `pnpm --filter @remedyo/web build` succeeds, which proves no file still references a removed token
- [x] 7.2 Confirm no `text-ink-*` usage and no slash-opacity colour expression remains anywhere under `apps/web`; verify by grep returning zero matches for both patterns
- [x] 7.3 Run the contrast check script from task 1.5 across every token pair the finished interface actually uses; verify it reports no failures
- [x] 7.4 Run `pnpm -r typecheck` and `pnpm build`, then walk the app in a browser across all three roles; verify every route renders on the new system with no unstyled or invisible text
