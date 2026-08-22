// Assemble l'application construite (dist/) en un seul fichier HTML autonome,
// tout le CSS et le JS étant intégrés en ligne. Sert à publier une version
// consultable de ConstructPro sans dépendre d'un hébergement externe.
//
// Le fichier produit ne contient volontairement ni <!DOCTYPE>, ni <html>,
// <head> ou <body> : l'hébergeur d'artefacts fournit lui-même ce squelette.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = new URL('./dist/', import.meta.url).pathname
const assets = readdirSync(join(DIST, 'assets'))
const jsFile = assets.find(f => f.endsWith('.js'))
const cssFile = assets.find(f => f.endsWith('.css'))
if (!jsFile || !cssFile) throw new Error('Assets introuvables dans dist/assets')

const css = readFileSync(join(DIST, 'assets', cssFile), 'utf8')
const js = readFileSync(join(DIST, 'assets', jsFile), 'utf8')

// Une occurrence de "</script" dans le bundle fermerait la balise prématurément.
const safeJs = js.replace(/<\/script/gi, '<\\/script')

const out = `<title>ConstructPro</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏗️</text></svg>">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`

const target = process.argv[2]
if (!target) throw new Error('Usage : node build-artifact.mjs <fichier-de-sortie.html>')
writeFileSync(target, out)
console.log(`Écrit ${target} — ${(out.length / 1024 / 1024).toFixed(2)} Mo (CSS ${cssFile}, JS ${jsFile})`)
