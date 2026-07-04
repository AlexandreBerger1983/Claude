import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

// Fenêtre modale de formulaire générique, pilotée par une liste de champs :
// { name, label, type ('text'|'number'|'date'|'select'|'textarea'|'tel'|'email'),
//   options (pour select), required, placeholder, colSpan }
export default function FormModal({ title, fields, initialValues = {}, onSubmit, onClose, submitLabel = 'Enregistrer' }) {
  const [values, setValues] = useState(() => {
    const v = {}
    for (const f of fields) v[f.name] = initialValues[f.name] ?? f.default ?? ''
    return v
  })
  const [error, setError] = useState('')

  // fermer avec Échap
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (name, value) => setValues(v => ({ ...v, [name]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    for (const f of fields) {
      if (f.required && !String(values[f.name]).trim()) {
        setError(`Le champ « ${f.label} » est obligatoire.`)
        return
      }
    }
    const out = { ...values }
    for (const f of fields) {
      if (f.type === 'number') out[f.name] = parseFloat(out[f.name]) || 0
    }
    onSubmit(out)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.name} className={clsx(f.colSpan === 2 || f.type === 'textarea' ? 'col-span-2' : 'col-span-2 sm:col-span-1')}>
              <label className="label">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              {f.type === 'select' ? (
                <select value={values[f.name]} onChange={e => set(f.name, e.target.value)} className="input">
                  {(f.options || []).map(o =>
                    typeof o === 'object'
                      ? <option key={o.value} value={o.value}>{o.label}</option>
                      : <option key={o} value={o}>{o}</option>
                  )}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={values[f.name]}
                  onChange={e => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="input resize-none"
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  inputMode={f.type === 'number' ? 'decimal' : f.type === 'tel' ? 'tel' : undefined}
                  step={f.step}
                  value={values[f.name]}
                  onChange={e => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  className="input"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="px-5 pb-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" className="btn-primary">{submitLabel}</button>
        </div>
      </form>
    </div>
  )
}
