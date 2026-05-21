import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'WindPanel',
    description: 'A browser extension for Tailwind CSS theme variable inspection and customization.',
    tags: ['tailwind', 'css', 'theme', 'variables', 'inspection', 'customization'],
    action: {
      default_title: 'No Tailwind theme variables present on this website',
    },
  },
  webExt: {
    startUrls: ['http://localhost:4321/'],
  },
});
