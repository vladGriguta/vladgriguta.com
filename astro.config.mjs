import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// English home at /, Romanian home at /ro/. Article URLs are unchanged:
// Romanian articles at /<slug>/, English ones at /en/<slug>/.
export default defineConfig({
  site: 'https://vladgriguta.com',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith('/en/') })],
  redirects: { '/en/': '/' },
});
