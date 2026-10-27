import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json,wasm,task}'],
        globIgnores: ['**/vision_wasm_module_internal.*'],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Match do Saber',
        short_name: 'Match do Saber',
        description: 'Jogo de checagem de notícias',
        lang: 'pt-BR',
        display: 'fullscreen',
        start_url: '.',
        scope: '.',
        background_color: '#1b1035',
        theme_color: '#1b1035',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
