import { Minus, Plus } from 'lucide-react'
import clsx from 'clsx'

// Contrôle numérique tactile : gros boutons − / + de chaque côté du chiffre.
// Conçu pour être utilisé debout, sur un téléphone, avec le pouce.
export default function Stepper({ value, onChange, step = 1, min = 0, max = 9999, suffix = '', big = false }) {
  const num = parseFloat(value) || 0

  const bump = (dir) => {
    const next = Math.min(max, Math.max(min, +(num + dir * step).toFixed(2)))
    onChange(String(next))
  }

  return (
    <div className={clsx('flex items-stretch rounded-xl border-2 border-slate-200 overflow-hidden bg-white', big ? 'h-14' : 'h-11')}>
      <button
        type="button"
        onClick={() => bump(-1)}
        className={clsx(
          'flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors flex-shrink-0',
          big ? 'w-14' : 'w-11'
        )}
        aria-label="Diminuer"
      >
        <Minus size={big ? 22 : 17} strokeWidth={2.5} />
      </button>
      <div className="flex-1 flex items-center justify-center gap-1 min-w-0 px-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          step={step}
          onChange={e => onChange(e.target.value)}
          onFocus={e => e.target.select()}
          className={clsx(
            'w-full text-center font-bold text-slate-800 outline-none bg-transparent',
            big ? 'text-xl' : 'text-base'
          )}
        />
        {suffix && <span className={clsx('text-slate-400 flex-shrink-0 font-medium', big ? 'text-sm' : 'text-xs')}>{suffix}</span>}
      </div>
      <button
        type="button"
        onClick={() => bump(1)}
        className={clsx(
          'flex items-center justify-center bg-brand-50 hover:bg-brand-100 active:bg-brand-200 text-brand-600 transition-colors flex-shrink-0',
          big ? 'w-14' : 'w-11'
        )}
        aria-label="Augmenter"
      >
        <Plus size={big ? 22 : 17} strokeWidth={2.5} />
      </button>
    </div>
  )
}
