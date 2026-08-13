import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ----------------------------------------------------------------------------
// Offline-first strategy summary (see README "Offline architecture" section):
//   - App shell (JS/CSS/HTML): precached, so the app itself boots with zero
//     network — this is what makes the PWA installable and usable at a rural
//     clinic with no signal.
//   - Read-type API calls (GET record history, GET patient profile): NetworkFirst
//     with a short timeout, falling back to the cached response. Clinics see the
//     last-synced data even if offline.
//   - Write-type API calls (POST/PUT records, consent, sync): NOT cached here —
//     those go through the app's own PouchDB/IndexedDB sync queue
//     (src/lib/syncQueue.js), not the service worker cache, because writes need
//     conflict-resolution logic the service worker can't provide.
// ----------------------------------------------------------------------------

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Portable Health Record',
        short_name: 'HealthID',
        description: "Portable, patient-owned health records for India's migrant workforce.",
        theme_color: '#0F6E56',
        background_color: '#F1EFE8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // GET-only record reads: NetworkFirst so a synced clinic sees fresh
            // data, but a 3s timeout means a poor-connectivity clinic falls back
            // to cache instead of hanging.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/records'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'records-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Reference/lookup data (FHIR code lists, scheme metadata) changes
            // rarely — CacheFirst avoids hitting the network at all once warm.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/reference'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'reference-data-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // flip to true only when actively testing SW behavior in dev
      },
    }),
  ],
  server: {
    host: true, // exposes on LAN so you can test on a phone during development
    port: 5173,
  },
})
