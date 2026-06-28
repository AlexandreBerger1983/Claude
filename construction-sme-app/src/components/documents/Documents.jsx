import { useState } from 'react'
import { Upload, Search, FileText, Image, Archive, Filter } from 'lucide-react'
import { documents } from '../../data/mockData'
import { formatDate } from '../../utils/formatters'
import clsx from 'clsx'

const docTypes = ['Tous', 'Contrat', 'Plan', 'Permis', 'Rapport technique', 'Photo', 'Assurance', 'Fiche technique']

const extIcon = (ext) => {
  if (['jpg', 'png', 'zip'].includes(ext)) return <Image size={18} className="text-blue-500" />
  if (ext === 'zip') return <Archive size={18} className="text-amber-500" />
  return <FileText size={18} className="text-rose-500" />
}

const extColor = {
  pdf: 'bg-rose-100 text-rose-700',
  zip: 'bg-amber-100 text-amber-700',
  jpg: 'bg-blue-100 text-blue-700',
  png: 'bg-blue-100 text-blue-700',
}

export default function Documents() {
  const [search, setSearch] = useState('')
  const [typeF, setTypeF] = useState('Tous')
  const [projectF, setProjectF] = useState('Tous')

  const projectNames = ['Tous', ...new Set(documents.map(d => d.project))]

  const filtered = documents.filter(d =>
    (typeF === 'Tous' || d.type === typeF) &&
    (projectF === 'Tous' || d.project === projectF) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.author.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Documents</h2>
          <p className="text-sm text-slate-500 mt-0.5">{documents.length} document(s) · Contrats, plans, permis, photos</p>
        </div>
        <button className="btn-primary"><Upload size={16} /> Téléverser</button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher documents..." className="input pl-8" />
          </div>
          <select value={projectF} onChange={e => setProjectF(e.target.value)} className="input w-auto text-xs">
            {projectNames.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {docTypes.map(t => (
            <button key={t} onClick={() => setTypeF(t)}
              className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors', typeF === t ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(doc => (
          <div key={doc.id} className="card flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
              {extIcon(doc.ext)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-brand-600 transition-colors truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={clsx('badge text-[10px]', extColor[doc.ext] ?? 'bg-slate-100 text-slate-600')}>
                  .{doc.ext.toUpperCase()}
                </span>
                <span className="badge bg-slate-100 text-slate-600 text-[10px]">{doc.type}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{doc.project}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                <span>{doc.author}</span>
                <span>{formatDate(doc.date)} · {doc.size}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12 text-slate-400 text-sm">Aucun document trouvé</div>
      )}
    </div>
  )
}
