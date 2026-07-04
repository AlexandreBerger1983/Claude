import { useState, useRef } from 'react'
import { Upload, Search, FileText, Image, Archive, Trash2 } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import { formatDate } from '../../utils/formatters'
import clsx from 'clsx'

const docTypes = ['Tous', 'Contrat', 'Plan', 'Permis', 'Rapport technique', 'Photo', 'Assurance', 'Fiche technique', 'Autre']

const extIcon = (ext) => {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={18} className="text-blue-500" />
  if (['zip', 'rar', '7z'].includes(ext)) return <Archive size={18} className="text-amber-500" />
  return <FileText size={18} className="text-rose-500" />
}

const extColor = {
  pdf: 'bg-rose-100 text-rose-700',
  zip: 'bg-amber-100 text-amber-700',
  jpg: 'bg-blue-100 text-blue-700',
  jpeg: 'bg-blue-100 text-blue-700',
  png: 'bg-blue-100 text-blue-700',
  xlsx: 'bg-emerald-100 text-emerald-700',
  docx: 'bg-blue-100 text-blue-700',
}

const guessType = (ext) => {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'Photo'
  if (ext === 'pdf') return 'Autre'
  return 'Autre'
}

export default function Documents() {
  const { data, add, remove } = useData()
  const [company] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const [search, setSearch] = useState('')
  const [typeF, setTypeF] = useState('Tous')
  const [projectF, setProjectF] = useState('Tous')
  const fileInput = useRef(null)

  const documents = data.documents
  const projectNames = ['Tous', ...new Set(documents.map(d => d.project))]

  const filtered = documents.filter(d =>
    (typeF === 'Tous' || d.type === typeF) &&
    (projectF === 'Tous' || d.project === projectF) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || (d.author || '').toLowerCase().includes(search.toLowerCase()))
  )

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      add('documents', {
        name: file.name.replace(/\.[^.]+$/, ''),
        type: guessType(ext),
        projectId: null,
        project: 'Général',
        date: new Date().toISOString().slice(0, 10),
        size: `${sizeMB} MB`,
        ext,
        author: company.ownerName || 'Moi',
      })
    }
    e.target.value = ''
  }

  const handleDelete = (doc) => {
    if (window.confirm(`Supprimer « ${doc.name} » ?`)) remove('documents', doc.id)
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Documents</h2>
          <p className="text-sm text-slate-500 mt-0.5">{documents.length} document(s) · Contrats, plans, permis, photos</p>
        </div>
        <button onClick={() => fileInput.current?.click()} className="btn-primary">
          <Upload size={16} /> Téléverser
        </button>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={handleUpload} />
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
          <div key={doc.id} className="card flex items-start gap-4 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
              {extIcon(doc.ext)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{doc.name}</p>
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
            <button
              onClick={() => handleDelete(doc)}
              className="p-1.5 text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              aria-label="Supprimer"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12 text-slate-400 text-sm">Aucun document trouvé</div>
      )}
    </div>
  )
}
