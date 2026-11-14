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
})
