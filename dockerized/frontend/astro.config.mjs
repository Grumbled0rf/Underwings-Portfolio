// ===========================================
// ASTRO CONFIGURATION
// Underwings Technologies Frontend
// ===========================================

import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
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
