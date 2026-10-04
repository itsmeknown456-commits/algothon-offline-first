import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [VitePWA({ registerType: 'autoUpdate', manifest: false })],
  server: { proxy: { '/sync': 'http://localhost:3000', '/health': 'http://localhost:3000' } }
})
