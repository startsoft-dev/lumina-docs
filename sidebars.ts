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
        'server/route-groups',
        'server/audit-trail',
        'server/nested-operations',
        'server/generator',
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
        'rails/request-lifecycle',
        'rails/models',
        'rails/validation',
        'rails/querying',
        'rails/policies',
        'rails/soft-deletes',
        'rails/multi-tenancy',
        'rails/route-groups',
        'rails/audit-trail',
        'rails/nested-operations',
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
        'adonis-server/request-lifecycle',
        'adonis-server/models',
        'adonis-server/validation',
        'adonis-server/querying',
        'adonis-server/policies',
        'adonis-server/soft-deletes',
        'adonis-server/multi-tenancy',
        'adonis-server/audit-trail',
        'adonis-server/nested-operations',
        'adonis-server/invitations',
        'adonis-server/postman-export',
        'adonis-server/generator',
      ],
    },
  ],
  djangoServerSidebar: [
    {
      type: 'category',
      label: 'Django Server',
      collapsed: false,
      items: [
        'django/getting-started',
        'django/request-lifecycle',
        'django/models',
        'django/validation',
        'django/querying',
        'django/policies',
        'django/soft-deletes',
        'django/multi-tenancy',
        'django/audit-trail',
        'django/nested-operations',
        'django/testing',
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
