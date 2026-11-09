import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vladgriguta.com',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  i18n: {
    defaultLocale: 'ro',
    locales: ['ro', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
