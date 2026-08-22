import { TRADES } from '../../data/quoteCosting'
import { formatCurrency } from '../../utils/formatters'
import clsx from 'clsx'

// Reproduit le bloc « RÉSUMÉ » de la feuille « Calcul des coûts » du gabarit
// Excel : ventilation par corps de métier, total avant profit, Admin et
// Profit, total avec profit. C'est la vue interne de l'entrepreneur — elle
// n'apparaît pas sur le document remis au client.
export default function CostSummary({ summary, hours }) {
  const rows = TRADES.filter(t => summary.trades[t.key] > 0)

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold text-slate-800">Estimé des coûts</h3>
        <span className="text-xs text-slate-400">Vue interne — non remise au client</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <th className="text-left pb-2 font-semibold">Résumé</th>
            <th className="text-right pb-2 font-semibold">$</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.length === 0 && (
            <tr><td colSpan={2} className="py-4 text-center text-slate-400">Aucun travail chiffré pour l'instant</td></tr>
          )}
          {rows.map(t => (
            <tr key={t.key}>
              <td className="py-1.5 text-slate-600">{t.label}</td>
              <td className="py-1.5 text-right font-medium tabular-nums">{formatCurrency(summary.trades[t.key])}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold">
            <td className="pt-2 text-slate-700">Total avant profit</td>
            <td className="pt-2 text-right tabular-nums">{formatCurrency(summary.totalAvantProfit)}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-600">Admin et profit ({summary.adminProfitPct} %)</td>
            <td className="py-1 text-right tabular-nums">{formatCurrency(summary.adminProfit)}</td>
          </tr>
          <tr className="border-t border-slate-200 text-base font-bold">
            <td className="pt-2">Total avec profit</td>
            <td className="pt-2 text-right text-brand-600 tabular-nums">{formatCurrency(summary.totalAvecProfit)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {hours > 0 && (
          <span className="text-slate-500">
            Menuiserie : <span className="font-semibold text-slate-700 tabular-nums">{hours.toLocaleString('fr-CA', { maximumFractionDigits: 1 })} h</span>
          </span>
        )}
        <span
          className={clsx(
            'px-2 py-0.5 rounded-full font-semibold',
            summary.coherent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
          )}
          title="Vérifie que la somme des corps de métier égale la somme de toutes les lignes, comme la cellule de contrôle du gabarit Excel."
        >
          {summary.coherent ? 'BON' : 'ERREUR'}
        </span>
        <span className="text-slate-400">Vérification de la formule</span>
      </div>
    </div>
  )
}
