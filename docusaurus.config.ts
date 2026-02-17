import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Lumina',
  tagline: 'Built for the AI era. Automatic REST APIs for any framework.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: process.env.SITE_URL ?? 'https://lumina.startsoft.dev',
  baseUrl: process.env.BASE_URL ?? '/',

  organizationName: 'startsoft-dev',
  projectName: 'lumina-docs',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/startsoft-dev/lumina-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/lumina-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Lumina',
      items: [
        {
          type: 'custom-frameworkDropdown',
          position: 'left',
        },
        {
          type: 'docSidebar',
          sidebarId: 'serverSidebar',
          position: 'left',
          label: 'Laravel Server',
        },
        {
          type: 'docSidebar',
          sidebarId: 'reactSidebar',
          position: 'left',
          label: 'React Client',
        },
        {
          href: 'https://github.com/startsoft-dev/lumina-server',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Servers',
          items: [
            { label: 'Laravel Server', to: '/docs/server/getting-started' },
          ],
        },
        {
          title: 'Clients',
          items: [
            { label: 'React Client', to: '/docs/react/getting-started' },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/startsoft-dev/lumina-server',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Startsoft. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['php', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
