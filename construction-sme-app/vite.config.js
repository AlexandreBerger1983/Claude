import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Le dépôt "Claude" contient plusieurs projets mais GitHub Pages n'offre
  // qu'un seul site par dépôt. Chaque application est donc publiée dans un
  // sous-dossier au nom de sa branche (convention déjà utilisée par
  // .github/workflows/pages.yml pour l'app « Mobilité articulaire ») :
  //   https://<user>.github.io/Claude/claude/construction-sme-app-rc82di/
  // Les assets doivent porter ce préfixe. Le routage applicatif utilise
  // HashRouter (voir main.jsx), donc lui ne dépend pas de "base".
  base: '/Claude/claude/construction-sme-app-rc82di/',
})
