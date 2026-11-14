import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // App shell precache; fonts sirf jab chahiye tab (runtime cache) — pehli install halki
        globPatterns: ['**/*.{js,css,html,webp,png,svg}'],
        runtimeCaching: [
          { urlPattern: ({ request }) => request.destination === 'font', handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 31536000 } } },
        ],
      },
      includeAssets: ['logo.png', 'icon-192.png'],
      manifest: {
        name: 'Chinmay Wellness — डॉ. हराळे',
        short_name: 'Chinmay',
        description: 'डॉ. हराळे यांची रोजची साथ — Chinmay Wellness Club',
        lang: 'mr',
        start_url: '/',
        display: 'standalone',
        background_color: '#FBF9F5',
        theme_color: '#0F6B4C',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Libraries alag chunks me: app update ho to user ko sirf chhota app-code dobara download karna pade
        manualChunks: { react: ['react', 'react-dom', 'react-dom/client', 'scheduler'], supabase: ['@supabase/supabase-js'], i18n: ['i18next', 'react-i18next'] },
      },
    },
  },
})
