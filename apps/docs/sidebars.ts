import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * The five top-level sections the change agreed on.
 *
 * The API reference is a generated route rather than a document, so it is a
 * link rather than an entry in a category.
 */
const sidebars: SidebarsConfig = {
  docs: [
    'index',
    {
      type: 'category',
      label: 'Technical Overview',
      collapsed: false,
      items: ['overview/context', 'overview/features'],
    },
    {
      type: 'category',
      label: 'High-level Architecture',
      collapsed: false,
      items: [
        'architecture/system-context',
        'architecture/containers',
        'architecture/components',
        'architecture/deployment',
      ],
    },
    {
      type: 'category',
      label: 'Detailed Architecture',
      items: [
        'modules/index',
        'modules/auth',
        'modules/users',
        'modules/doctors',
        'modules/availability',
        'modules/appointments',
        'modules/consultations',
        'modules/records',
        'modules/llm',
        'modules/matching',
        'modules/admin',
        'modules/notifications',
        'modules/health',
      ],
    },
    {
      type: 'category',
      label: 'Data Model',
      items: ['data-model/index', 'data-model/enums', 'data-model/constraints'],
    },
    {
      type: 'link',
      label: 'API Reference',
      href: '/api/',
    },
  ],
};

export default sidebars;
