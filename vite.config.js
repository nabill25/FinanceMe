import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false, // sudah tercakup globPatterns (png) di bawah
      // Syarat "Instal aplikasi" di Chrome Android: ikon PNG asli 192 & 512 (purpose "any"),
      // ditambah ikon "maskable" agar ikon adaptif Android tidak terpotong.
      manifest: {
        id: '/',
        name: 'FinanceMe',
        short_name: 'FinanceMe',
        description: 'Kelola uang Anda dengan cerdas menggunakan AI',
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0a0f19',
        background_color: '#060a12',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Tekan lama ikon aplikasi di layar utama untuk membuka halaman ini langsung
        shortcuts: [
          { name: 'Transaksi', url: '/transactions' },
          { name: 'Laporan', url: '/reports' },
          { name: 'Asisten AI', url: '/advisor' },
        ],
      },
      workbox: {
        // Ikon & logo ikut disimpan untuk offline (manifest ditambahkan otomatis oleh plugin)
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // Halaman seperti /reports dibuka dari cache saat offline
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    })
  ],
})
