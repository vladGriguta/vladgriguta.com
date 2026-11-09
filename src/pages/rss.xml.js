import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts', (p) => !p.data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: 'Vlad Griguta',
    description: 'Analize scurte, cu date și grafice interactive.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: p.data.lang === 'ro' ? `/${p.id.split('/').pop()}/` : `/en/${p.id.split('/').pop()}/`,
    })),
  });
}
