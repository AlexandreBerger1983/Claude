import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer, Send, CheckCircle } from 'lucide-react'
import { quotes } from '../../data/mockData'
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters'
import clsx from 'clsx'

export default function QuoteDetail() {
  const { id } = useParams()
  const quote = quotes.find(q => q.id === Number(id))
  if (!quote) return <div className="text-slate-500 p-8">Soumission introuvable</div>

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <Link to="/soumissions" className="btn-ghost mb-3 -ml-1">
          <ArrowLeft size={16} /> Retour aux soumissions
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">{quote.number}</h2>
            <span className={clsx('badge', statusColor[quote.status])}>{quote.status}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary"><Printer size={15} /> Imprimer</button>
            <button className="btn-secondary"><Send size={15} /> Envoyer</button>
            {quote.status !== 'Acceptée' && (
              <button className="btn-primary"><CheckCircle size={15} /> Marquer acceptée</button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        {/* Header */}
        <div className="flex justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">CP</div>
              <div>
                <div className="font-bold text-slate-800">ConstructPro Inc.</div>
                <div className="text-xs text-slate-400">NEQ: 1187654321</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>123 rue Industrielle, Montréal (QC) H2X 1Z9</p>
              <p>Tél: 514-555-0100 · info@constructpro.ca</p>
              <p>RBQ: 8001-2345-67</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-2xl font-bold text-brand-500 mb-3">SOUMISSION</h3>
            <div className="text-xs text-slate-500 space-y-0.5">
              <p><span className="font-medium text-slate-700">No:</span> {quote.number}</p>
              <p><span className="font-medium text-slate-700">Date:</span> {formatDate(quote.date)}</p>
              <p><span className="font-medium text-slate-700">Valide jusqu'au:</span> {formatDate(quote.validUntil)}</p>
              <p><span className="font-medium text-slate-700">Estimateur:</span> {quote.estimator}</p>
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="mb-8 p-4 bg-slate-50 rounded-xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Présentée à</p>
          <p className="font-semibold text-slate-800">{quote.client}</p>
          <p className="text-sm font-medium text-slate-600 mt-1">{quote.title}</p>
        </div>

        {/* Line items */}
        {quote.items.length > 0 && (
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="text-center pb-2 text-xs font-semibold text-slate-500 uppercase">Unité</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Qté</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Prix unit.</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.items.map((item, i) => (
                  <tr key={item.id}>
                    <td className="py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-2.5 text-slate-700">{item.description}</td>
                    <td className="py-2.5 text-center text-slate-500 text-xs">{item.unit}</td>
                    <td className="py-2.5 text-right text-slate-600">{item.qty.toLocaleString('fr-CA')}</td>
                    <td className="py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {quote.items.length === 0 && (
          <div className="mb-6 p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
            Aucune ligne de détail disponible pour cette soumission
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sous-total</span>
              <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">TPS (5%)</span>
              <span className="font-medium">{formatCurrency(quote.tps)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">TVQ (9,975%)</span>
              <span className="font-medium">{formatCurrency(quote.tvq)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-2">
              <span>TOTAL</span>
              <span className="text-brand-600">{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 space-y-1">
          <p>• Cette soumission est valide pour 30 jours à compter de la date d'émission.</p>
          <p>• Les prix sont en dollars canadiens (CAD) et incluent la main-d'œuvre, les matériaux et la supervision.</p>
          <p>• Des frais supplémentaires peuvent s'appliquer pour les travaux hors champ non spécifiés.</p>
          <p>• Termes de paiement: 30% à l'acceptation, 40% mi-chantier, 30% à la livraison.</p>
        </div>
      </div>
    </div>
  )
}
