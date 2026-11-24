import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

const STUDIO_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function studioSecurityHeaders(): Plugin {
  return {
    name: 'studio-security-headers',
    apply: 'build',
    transformIndexHtml(html) {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: STUDIO_CSP },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), studioSecurityHeaders()],
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 2500 },
  test: { environment: 'jsdom' },
})
