import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use relative asset paths so GitHub Pages project-site URLs always resolve
// correctly regardless of repository casing/path nuances.
export default defineConfig({
  base: './',
  plugins: [react()]
})
