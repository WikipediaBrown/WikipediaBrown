import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default {
  preprocess: vitePreprocess(),
  kit: {
    files: {
      assets: 'website/static',
      lib: 'website/src/lib',
      routes: 'website/src/routes',
      appTemplate: 'website/src/app.html',
    },
    adapter: adapter({ fallback: '404.html' }),
  },
};
