import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

/**
 * The published site is a GitHub Pages *project* site, so it is served from
 * https://renzreyes-wc.github.io/reMEDyo/ rather than from a domain root.
 * `url` is the origin and `baseUrl` the path prefix; both must be right or
 * every asset and internal link in the build points at the wrong place.
 */
const config: Config = {
  title: 'reMEDyo',
  tagline: 'Technical documentation for a fictional telehealth prototype',

  url: 'https://renzreyes-wc.github.io',
  baseUrl: '/reMEDyo/',

  organizationName: 'renzreyes-wc',
  projectName: 'reMEDyo',

  // The spec requires a build that links to a page that does not exist to
  // fail rather than publish. This is that: the build aborts.
  onBrokenLinks: 'throw',

  favicon: 'img/favicon.svg',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Diagrams are Mermaid source in version control, rendered at build time.
  // A diagram change is therefore a reviewable text diff, and no binary image
  // is ever committed.
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          // The documentation *is* the site: there is no separate marketing
          // page above it, so the docs are served from the root.
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/renzreyes-wc/reMEDyo/edit/main/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
    // Redocusaurus is a preset, not a plugin: it expands into the Redoc theme
    // and one plugin per specification.
    [
      'redocusaurus',
      {
        specs: [
          {
            id: 'remedyo-api',
            // Emitted by `pnpm --filter api openapi:emit` before this build
            // runs — locally and in CI alike. It is never edited by hand and
            // never committed, which is what keeps the reference honest.
            spec: '../api/openapi.json',
            route: '/api/',
          },
        ],
        theme: {
          primaryColor: '#1f6feb',
        },
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'reMEDyo',
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Documentation' },
        { to: '/api/', label: 'API Reference', position: 'left' },
        {
          href: 'https://github.com/renzreyes-wc/reMEDyo',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Technical Overview', to: '/' },
            { label: 'Architecture', to: '/architecture/system-context' },
            { label: 'Modules', to: '/modules/' },
            { label: 'Data Model', to: '/data-model/' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'API Reference', to: '/api/' },
            {
              label: 'Repository',
              href: 'https://github.com/renzreyes-wc/reMEDyo',
            },
          ],
        },
      ],
      copyright: 'reMEDyo is a fictional prototype, not a real clinical service.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
