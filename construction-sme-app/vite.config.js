import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Le site est publié sur GitHub Pages à la racine du dépôt "Claude"
  // (https://<user>.github.io/Claude/), donc les assets doivent être
  // référencés avec ce sous-chemin. Le routage applicatif utilise
  // HashRouter (voir main.jsx), donc il ne dépend pas de "base".
  base: '/Claude/',
})
