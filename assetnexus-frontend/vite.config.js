import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend (FastAPI) runs on :8000 — proxying avoids CORS in development.
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
})
  