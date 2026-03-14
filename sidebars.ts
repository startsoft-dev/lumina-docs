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
        'server/models',
        'server/validation',
        'server/querying',
        'server/request-lifecycle',
        'server/policies',
        'server/route-groups',
        'server/nested-operations',
        'server/soft-deletes',
        'server/multi-tenancy',
        'server/audit-trail',
        'server/generator',
        'server/blueprint',
      ],
    },
  ],
  railsSidebar: [
    {
      type: 'category',
      label: 'Rails Server',
      collapsed: false,
      items: [
        'rails/getting-started',
        'rails/models',
        'rails/validation',
        'rails/querying',
        'rails/request-lifecycle',
        'rails/policies',
        'rails/route-groups',
        'rails/nested-operations',
        'rails/soft-deletes',
        'rails/multi-tenancy',
        'rails/audit-trail',
        'rails/generator',
      ],
    },
  ],
  adonisServerSidebar: [
    {
      type: 'category',
      label: 'AdonisJS Server',
      collapsed: false,
      items: [
        'adonis-server/getting-started',
        'adonis-server/models',
        'adonis-server/validation',
        'adonis-server/querying',
        'adonis-server/request-lifecycle',
        'adonis-server/policies',
        'adonis-server/route-groups',
        'adonis-server/nested-operations',
        'adonis-server/soft-deletes',
        'adonis-server/multi-tenancy',
        'adonis-server/audit-trail',
        'adonis-server/invitations',
        'adonis-server/postman-export',
        'adonis-server/generator',
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
