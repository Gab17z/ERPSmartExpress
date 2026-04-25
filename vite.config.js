import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'Smart Express',
        short_name: 'SmartExpress',
        description: 'Sistema ERP para lojas de celular',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Smart Express - Dashboard Desktop'
          },
          {
            src: 'screenshot-mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Smart Express - Dashboard Mobile'
          }
        ]
      },
      workbox: {
        // Cache de arquivos estáticos do app (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Limite de tamanho para precache (5MB)
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // FIX: era 5MB, reduzido para evitar QuotaExceededError
        cleanupOutdatedCaches: true, // FIX: limpar caches antigos ao atualizar
        runtimeCaching: [
          {
            // Cache de imagens do Supabase Storage (fotos de OS, produtos, etc)
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: {
                maxEntries: 60,   // FIX: era 500 — reduzido para evitar QuotaExceededError
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias (era 30)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // APIs do Supabase — NetworkOnly (dados frescos, sem cache de API)
            // FIX: era NetworkFirst com cache de 200 entradas — causava QuotaExceededError
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-api',
            },
          },
          {
            // Cache de fontes do Google
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache de imagens externas (QR codes, barcodes)
            urlPattern: /^https:\/\/(api\.qrserver\.com|bwipjs-api\.metafloor\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
}) 