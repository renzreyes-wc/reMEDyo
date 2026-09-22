#!/usr/bin/env node
/**
 * Asserts the design tokens meet WCAG AA.
 *
 * The visual-system spec requires 4.5:1 for body text and 3:1 at 24px and
 * above, on every surface. That is arithmetic, so it should be checked rather
 * than eyeballed — this is what caught brand-600 at 4.43:1 on the canvas
 * during planning, before the value shipped.
 *
 * Values are read out of app/globals.css so the check cannot drift from the
 * tokens it is checking.
 *
 *   node scripts/check-contrast.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'app', 'globals.css'), 'utf8');

/** Pull every --color-* declaration out of the theme block. */
function readTokens(source) {
  const tokens = {};
  for (const [, name, value] of source.matchAll(
    /--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g,
  )) {
    tokens[name] = value;
  }
  return tokens;
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const channel = (i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const t = readTokens(css);

const BODY = 4.5;
const LARGE = 3;

/** [foreground, background, minimum, description] */
const pairs = [
  // Body text on the two grounds.
  ['text-primary', 'canvas', BODY, 'primary text on canvas'],
  ['text-primary', 'surface', BODY, 'primary text on surface'],
  ['text-muted', 'canvas', BODY, 'muted text on canvas'],
  ['text-muted', 'surface', BODY, 'muted text on surface'],

  // Brand used as text.
  ['brand-600', 'canvas', BODY, 'brand text on canvas'],
  ['brand-600', 'surface', BODY, 'brand text on surface'],
  ['brand-900', 'brand-50', BODY, 'brand text on brand tint'],
  ['brand-600', 'brand-50', BODY, 'brand-600 on its own tint'],

  // Support hue carries informational chips and tags.
  ['support-700', 'support-100', BODY, 'support text on support tint'],
  ['support-600', 'support-100', BODY, 'support-600 on support tint'],
  ['support-700', 'canvas', BODY, 'support text on canvas'],
  ['support-600', 'surface', BODY, 'support-600 on surface'],

  // Reserved meanings.
  ['alert-900', 'alert-50', BODY, 'alert text on alert tint'],
  ['alert-700', 'alert-50', BODY, 'alert-700 on alert tint'],
  ['danger-700', 'danger-50', BODY, 'danger text on danger tint'],

  // Labels on filled buttons.
  ['text-on-brand', 'brand-600', BODY, 'button label on brand fill'],

  // Peach is decorative, but if it ever carries text it carries primary.
  ['text-primary', 'peach', BODY, 'primary text on peach art'],

  // Borders and focus rings only need the non-text ratio.
  ['border-strong', 'surface', LARGE, 'strong border against surface'],
  ['brand-600', 'canvas', LARGE, 'focus ring against canvas'],
];

/**
 * Tokens that must never carry text. Recorded here so the check fails if
 * someone promotes one to a text colour later.
 */
const NON_TEXT = ['brand-300', 'support-500', 'support-300', 'peach', 'peach-deep'];

let failures = 0;
console.log('WCAG AA contrast — design tokens\n');

for (const [fg, bg, min, label] of pairs) {
  if (!t[fg] || !t[bg]) {
    console.log(`  MISSING TOKEN  ${!t[fg] ? fg : bg}  (${label})`);
    failures += 1;
    continue;
  }
  const r = ratio(t[fg], t[bg]);
  const ok = r >= min;
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  needs ${min}  ${label}`,
  );
}

console.log('\nNon-text tokens (must not be used as a text colour):');
for (const name of NON_TEXT) {
  if (!t[name]) continue;
  const r = ratio(t[name], t['canvas']);
  console.log(`  ${name.padEnd(13)} ${r.toFixed(2)}:1 on canvas — fills, borders and art only`);
}

if (failures > 0) {
  console.error(`\n${failures} contrast failure(s). Fix the token, not the check.`);
  process.exit(1);
}
console.log('\nAll pairs meet WCAG AA.');
