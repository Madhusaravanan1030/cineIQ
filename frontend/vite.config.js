import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // proxy only works in local dev — Vercel uses env var instead
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})