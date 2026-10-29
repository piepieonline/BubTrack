import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const TUNNEL_HOST = 'dev.piepieonline.com'

export default defineConfig({
  base: '/BubTrack/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'Dev'),
  },
  server: { allowedHosts: [TUNNEL_HOST] },
  preview: { allowedHosts: [TUNNEL_HOST] },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'BubTrack',
        short_name: 'BubTrack',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2f6f62',
        background_color: '#f3efe4',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
