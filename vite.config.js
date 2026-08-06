import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages sert le site depuis https://<user>.github.io/<repo>/, donc
  // "base" doit correspondre au nom du repo. Sur un hébergeur qui sert
  // depuis la racine du domaine (Cloudflare Pages, Netlify, ...), build avec
  // BASE_PATH=/ npm run build pour écraser cette valeur par défaut.
  base: process.env.BASE_PATH ?? '/foot-tracker/',
})
