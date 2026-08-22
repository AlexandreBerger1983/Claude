// Export des soumissions aux formats Excel et Word, calqués sur les gabarits
// de l'entreprise :
//   - Excel : feuilles « Calcul des coûts » et « Formulaire soumission », avec
//     les VRAIES formules du gabarit, pour que le fichier reste modifiable
//     dans Excel exactement comme celui utilisé aujourd'hui.
//   - Word  : le modèle « SOUMISSION / CONTRAT D'ENTREPRISE » (en-tête,
//     client, description des travaux, totaux, conditions, signatures).
//
// Les deux bibliothèques sont chargées à la demande (import dynamique) : elles
// ne pèsent donc rien tant que l'utilisateur n'exporte pas.

import { TRADES } from '../data/quoteCosting'
import { CONDITIONS_GENERALES, ACCEPTANCE_TEXT } from '../data/legalTerms'

const num = (v) => parseFloat(v) || 0

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const safeName = (s) => (s || 'soumission').replace(/[\\/:*?"<>|]/g, '-').trim()

// Pourcentage à la française (virgule décimale), pour les libellés « TPS 5 % ».
const pct = (n) => Number(n).toLocaleString('fr-CA', { maximumFractionDigits: 3 })
// Multiplicateur d'un pourcentage, arrondi pour éviter le bruit en virgule
// flottante dans les formules du fichier (0.09975 et non 0.09974999999999999).
const rate = (n) => +(Number(n) / 100).toFixed(6)

// ─── Excel ────────────────────────────────────────────────────────────────────
export async function exportExcel(data) {
  const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'))
  const wb = new ExcelJS.Workbook()
  wb.creator = data.company?.companyName || 'ConstructPro'
  wb.created = new Date()

  const money = '#,##0.00 $'
  const bold = { bold: true }

  // ── Feuille 1 : Calcul des coûts ───────────────────────────────────────────
  const cc = wb.addWorksheet('Calcul des coûts')
  cc.columns = [
    { width: 3 }, { width: 52 }, { width: 13 }, { width: 11 },
    { width: 9 }, { width: 13 }, { width: 13 }, { width: 16 },
  ]

  cc.getCell('B2').value = `ESTIMÉ DES COÛTS — ${data.title || 'Soumission'}`
  cc.getCell('B2').font = { bold: true, size: 14 }

  cc.getCell('B4').value = 'RÉSUMÉ:'
  cc.getCell('B4').font = bold
  cc.getCell('C4').value = '$'
  cc.getCell('C4').font = bold
  cc.getCell('D4').value = 'Hrs'
  cc.getCell('D4').font = bold

  // Le détail commence à la ligne 22 (en-têtes ligne 20), comme le gabarit.
  const FIRST = 22
  const last = FIRST + data.items.length - 1

  // Résumé par corps de métier : chaque ligne somme les lignes de détail de ce
  // corps de métier, via SUMIF sur la colonne « corps de métier » (I).
  TRADES.forEach((t, i) => {
    const r = 5 + i
    cc.getCell(`B${r}`).value = t.label
    cc.getCell(`C${r}`).value = data.items.length
      ? { formula: `SUMIF(I${FIRST}:I${last},"${t.key}",G${FIRST}:G${last})` }
      : 0
    cc.getCell(`C${r}`).numFmt = money
  })
  const rTotal = 5 + TRADES.length          // Total avant profit
  const rProfit = rTotal + 1                // Admin et Profit
  const rAvec = rTotal + 2                  // Total avec profit

  cc.getCell(`D5`).value = data.laborRate > 0 ? { formula: `C5/${data.laborRate}` } : 0
  cc.getCell(`D5`).numFmt = '#,##0.0'

  cc.getCell(`B${rTotal}`).value = 'Total avant profit'
  cc.getCell(`B${rTotal}`).font = bold
  cc.getCell(`C${rTotal}`).value = { formula: `SUM(C5:C${rTotal - 1})` }
  cc.getCell(`C${rTotal}`).numFmt = money
  cc.getCell(`C${rTotal}`).font = bold
  cc.getCell(`D${rTotal}`).value = data.items.length ? { formula: `SUM(G${FIRST}:G${last})` } : 0
  cc.getCell(`D${rTotal}`).numFmt = money
  cc.getCell(`E${rTotal}`).value = { formula: `IF(ROUND(C${rTotal},2)=ROUND(D${rTotal},2),"BON","ERREUR")` }
  cc.getCell(`F${rTotal}`).value = 'Vérification de la formule'

  cc.getCell(`B${rProfit}`).value = 'Admin et Profit'
  cc.getCell(`C${rProfit}`).value = { formula: `D${rTotal}*D${rProfit}` }
  cc.getCell(`C${rProfit}`).numFmt = money
  cc.getCell(`D${rProfit}`).value = (data.adminProfitPct ?? 20) / 100
  cc.getCell(`D${rProfit}`).numFmt = '0%'

  cc.getCell(`B${rAvec}`).value = 'Total avec profit'
  cc.getCell(`B${rAvec}`).font = bold
  cc.getCell(`C${rAvec}`).value = { formula: `D${rTotal}+C${rProfit}` }
  cc.getCell(`C${rAvec}`).numFmt = money
  cc.getCell(`C${rAvec}`).font = bold

  // En-têtes du détail (ligne 20), identiques au gabarit
  const head = ['Description des travaux', 'Inclus ou non', 'Quantités', 'Unité',
                'Coût unitaire', 'coût total', 'Montant Minimum', 'Corps de métier']
  head.forEach((h, i) => {
    const c = cc.getCell(20, 2 + i)
    c.value = h
    c.font = bold
    c.border = { bottom: { style: 'thin' } }
  })

  // Lignes de détail, avec la formule exacte du gabarit :
  //   G = SI(C=1 ; MAX(C*D*F ; H) ; 0)
  data.items.forEach((it, i) => {
    const r = FIRST + i
    cc.getCell(`B${r}`).value = it.description
    cc.getCell(`C${r}`).value = 1
    cc.getCell(`D${r}`).value = num(it.qty)
    cc.getCell(`E${r}`).value = it.unit || ''
    cc.getCell(`F${r}`).value = +(num(it.unitMat) + num(it.unitLabor)).toFixed(2)
    cc.getCell(`F${r}`).numFmt = money
    cc.getCell(`G${r}`).value = { formula: `IF(C${r}=1,MAX(C${r}*D${r}*F${r},H${r}),0)` }
    cc.getCell(`G${r}`).numFmt = money
    cc.getCell(`H${r}`).value = num(it.min)
    cc.getCell(`H${r}`).numFmt = money
    cc.getCell(`I${r}`).value = it.trade || 'menuiserie'
  })
  cc.getColumn(9).hidden = true // colonne technique du corps de métier

  // ── Feuille 2 : Formulaire soumission ──────────────────────────────────────
  const fs = wb.addWorksheet('Formulaire soumission')
  fs.columns = [{ width: 3 }, { width: 62 }, { width: 14 }, { width: 14 }, { width: 18 }]

  let r = 2
  const put = (text, font) => { const c = fs.getCell(`B${r}`); c.value = text; if (font) c.font = font; r++ }

  put(data.company?.companyName || 'Votre entreprise', { bold: true, size: 14 })
  if (data.company?.address) put(data.company.address)
  const coords = [data.company?.phone && `Tél: ${data.company.phone}`, data.company?.email].filter(Boolean).join('  ')
  if (coords) put(coords)
  if (data.company?.rbq) put(`RBQ: ${data.company.rbq}`)
  r++
  put("SOUMISSION / CONTRAT D'ENTREPRISE", { bold: true, size: 13 })
  put(`Date : ${data.date}`)
  if (data.number) put(`No : ${data.number}`)
  r++
  put('CLIENT', { bold: true })
  put(data.client?.name || '')
  if (data.client?.address) put(data.client.address)
  if (data.client?.phone) put(data.client.phone)
  r++
  put(`DESCRIPTION DES TRAVAUX${data.title ? ` — ${data.title}` : ''}`, { bold: true })

  // Chaque travail possible, marqué « Inclus » ou « Non-applicable »
  for (const room of data.rooms || []) {
    if (!(room.checklist?.length)) continue
    put(room.name, { bold: true })
    for (const c of room.checklist) {
      fs.getCell(`B${r}`).value = c.label
      fs.getCell(`D${r}`).value = c.included ? 'Inclus' : 'Non-applicable'
      r++
    }
    r++
  }

  // Totaux : les taxes portent sur le total AVEC profit, comme le gabarit
  r++
  const rSous = r
  fs.getCell(`C${r}`).value = 'Sous-total des travaux'
  fs.getCell(`D${r}`).value = { formula: `'Calcul des coûts'!C${rAvec}` }
  fs.getCell(`D${r}`).numFmt = money
  r++
  fs.getCell(`C${r}`).value = `TPS (${pct(data.tpsPct)} %)`
  fs.getCell(`D${r}`).value = { formula: `D${rSous}*${rate(data.tpsPct)}` }
  fs.getCell(`D${r}`).numFmt = money
  const rTps = r
  r++
  fs.getCell(`C${r}`).value = `TVQ (${pct(data.tvqPct)} %)`
  fs.getCell(`D${r}`).value = { formula: `D${rSous}*${rate(data.tvqPct)}` }
  fs.getCell(`D${r}`).numFmt = money
  const rTvq = r
  r++
  fs.getCell(`C${r}`).value = 'Total'
  fs.getCell(`C${r}`).font = bold
  fs.getCell(`D${r}`).value = { formula: `D${rSous}+D${rTps}+D${rTvq}` }
  fs.getCell(`D${r}`).numFmt = money
  fs.getCell(`D${r}`).font = bold

  // Conditions générales et signatures
  r += 2
  put('Conditions générales :', { bold: true })
  CONDITIONS_GENERALES.forEach((c, i) => {
    put(`${i + 1}) ${c.text}`)
    for (const s of c.subItems || []) put(`      ${s}`)
  })
  r++
  put('Par : _____________________________')
  put([data.company?.ownerName, data.company?.companyName].filter(Boolean).join(' — '))
  r++
  put(ACCEPTANCE_TEXT)
  r++
  put('Signature du client : __________________________     Date : ______________')

  for (const ws of [fs]) ws.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  const buf = await wb.xlsx.writeBuffer()
  download(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeName(data.number || data.title)}.xlsx`,
  )
}

// ─── Word ─────────────────────────────────────────────────────────────────────
export async function exportWord(data) {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, BorderStyle,
  } = await import('docx')

  const P = (text, opts = {}) => new Paragraph({
    children: [new TextRun({ text: String(text ?? ''), bold: opts.bold, size: opts.size, italics: opts.italics })],
    alignment: opts.align,
    spacing: { after: opts.after ?? 60 },
  })

  const noBorder = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                     left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }

  // Tableau « travail → Inclus / Non-applicable »
  const workRows = []
  for (const room of data.rooms || []) {
    if (!(room.checklist?.length)) continue
    workRows.push(new TableRow({
      children: [
        new TableCell({ children: [P(room.name, { bold: true })], columnSpan: 2, borders: noBorder, width: { size: 9000, type: WidthType.DXA } }),
      ],
    }))
    for (const c of room.checklist) {
      workRows.push(new TableRow({
        children: [
          new TableCell({ children: [P(c.label)], width: { size: 6800, type: WidthType.DXA }, borders: noBorder }),
          new TableCell({ children: [P(c.included ? 'Inclus' : 'Non-applicable')], width: { size: 2200, type: WidthType.DXA }, borders: noBorder }),
        ],
      }))
    }
  }

  const totalRow = (label, value, bold = false) => new TableRow({
    children: [
      new TableCell({ children: [P(label, { bold })], width: { size: 6800, type: WidthType.DXA }, borders: noBorder }),
      new TableCell({ children: [P(value, { bold, align: AlignmentType.RIGHT })], width: { size: 2200, type: WidthType.DXA }, borders: noBorder }),
    ],
  })

  const fmt = (n) => `${n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`

  const children = [
    P(data.company?.companyName || 'Votre entreprise', { bold: true, size: 30 }),
    ...(data.company?.address ? [P(data.company.address)] : []),
    ...(data.company?.phone ? [P(`Tél: ${data.company.phone}`)] : []),
    ...(data.company?.rbq ? [P(`RBQ: ${data.company.rbq}`)] : []),
    P(''),
    P("SOUMISSION / CONTRAT D'ENTREPRISE", { bold: true, size: 26, align: AlignmentType.CENTER }),
    P(`Date : ${data.date}`, { align: AlignmentType.RIGHT }),
    ...(data.number ? [P(`No : ${data.number}`, { align: AlignmentType.RIGHT })] : []),
    P(''),
    P('CLIENT', { bold: true }),
    P(data.client?.name || ''),
    ...(data.client?.address ? [P(data.client.address)] : []),
    ...(data.client?.phone ? [P(data.client.phone)] : []),
    P(''),
    P(`DESCRIPTION DES TRAVAUX${data.title ? ` — ${data.title}` : ''}`, { bold: true }),
  ]

  if (workRows.length) {
    children.push(new Table({ rows: workRows, width: { size: 9000, type: WidthType.DXA } }))
  }

  children.push(
    P(''),
    new Table({
      rows: [
        totalRow('Sous-total des travaux', fmt(data.sousTotal)),
        totalRow(`TPS ${pct(data.tpsPct)} %`, fmt(data.tps)),
        totalRow(`TVQ ${pct(data.tvqPct)} %`, fmt(data.tvq)),
        totalRow('TOTAL', fmt(data.total), true),
      ],
      width: { size: 9000, type: WidthType.DXA },
    }),
    P(''),
    P('Conditions générales :', { bold: true }),
  )

  CONDITIONS_GENERALES.forEach((c, i) => {
    children.push(P(`${i + 1}) ${c.text}`))
    for (const s of c.subItems || []) children.push(P(`      ${s}`, { size: 18 }))
  })

  children.push(
    P(''),
    P('Par : _____________________________'),
    P([data.company?.ownerName, data.company?.companyName].filter(Boolean).join(' — ')),
    P(''),
    P(ACCEPTANCE_TEXT),
    P(''),
    P('Signature du client : __________________________     Date : ______________'),
  )

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  download(blob, `${safeName(data.number || data.title)}.docx`)
}
