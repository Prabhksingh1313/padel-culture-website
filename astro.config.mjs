import { defineConfig } from 'astro/config';

// Change `site` to your real domain once it's connected (used for SEO tags).
export default defineConfig({
  site: 'https://www.padelculture.in',
  build: { inlineStylesheets: 'always', format: 'file' },
});
