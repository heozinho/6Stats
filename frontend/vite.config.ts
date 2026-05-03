import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Local tunnel hosts for dev — safe to keep, ignored in production
    allowedHosts: ['proud-oranges-care.loca.lt', 'rjtkz-2a00-23c7-175a-801-a074-e3b3-5d74-9d76.run.pinggy-free.link'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
