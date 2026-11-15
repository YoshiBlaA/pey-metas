import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuración de Vite: React + Tailwind v4 (plugin oficial, sin tailwind.config.js).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 }, // el backend ya permite CORS desde http://localhost:5173
  preview: { port: 4173 },
})
