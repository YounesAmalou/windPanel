import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    action: {
      default_title: 'No Tailwind theme variables present on this website',
    },
  },
  webExt: {
    startUrls: ['http://localhost:4321/'],
  },
});
