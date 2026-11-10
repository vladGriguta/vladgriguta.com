import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    lang: z.enum(['ro', 'en']),
    draft: z.boolean().default(false),
    // Shows the "not investment advice" note under the article
    disclaimer: z.boolean().default(false),
  }),
});

export const collections = { posts };
