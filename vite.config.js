import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages sert le site depuis https://<user>.github.io/<repo>/
  // "base" doit donc correspondre EXACTEMENT au nom du repo GitHub.
  // Si tu renommes le dossier/repo, mets à jour cette valeur (voir README).
  base: '/foot-tracker/',
})
