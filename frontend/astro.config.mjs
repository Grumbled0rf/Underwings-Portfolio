// ===========================================
// ASTRO CONFIGURATION
// Underwings Cybersecurity Solutions Frontend
// ===========================================

import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'hybrid',
  adapter: node({
    mode: 'standalone'
  }),
  // Canonicalisation: enforce a single no-trailing-slash URL form so the
  // homepage (and every page) is not indexed as both /foo and /foo/.
  trailingSlash: 'never',
  integrations: [sitemap()],
  compressHTML: true,
  server: {
    port: 4321,
    host: true
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'viewport'
  },
  vite: {
    define: {
      'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(process.env.PUBLIC_SUPABASE_URL),
      'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY)
    },
    build: {
      cssMinify: true,
      minify: 'esbuild'
    }
  },
  site: process.env.PUBLIC_SITE_URL || 'https://underwings.org'
});
