import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  introSidebar: [
    'intro',
  ],
  serverSidebar: [
    {
      type: 'category',
      label: 'Laravel Server',
      collapsed: false,
      items: [
        'server/getting-started',
        'server/request-lifecycle',
        'server/models',
        'server/validation',
        'server/querying',
        'server/policies',
        'server/soft-deletes',
        'server/multi-tenancy',
        'server/audit-trail',
        'server/nested-operations',
        'server/generator',
      ],
    },
  ],
  reactSidebar: [
    {
      type: 'category',
      label: 'React Client',
      collapsed: false,
      items: [
        'react/getting-started',
        'react/authentication',
        'react/crud-hooks',
        'react/querying',
        'react/soft-deletes',
        'react/nested-operations',
        'react/invitations',
        'react/utilities',
      ],
    },
  ],
};

export default sidebars;
