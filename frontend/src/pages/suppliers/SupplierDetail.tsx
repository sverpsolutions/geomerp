import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { suppliers_api, type supplier_detail, type supplier_terms, type ledger_row } from '../../api/suppliers'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'

export default function supplier_detail_page() {
  const { id } = useParams<{ id: string }>()
  const [supplier, set_supplier] = useState<supplier_detail | null>(null)
  const [terms, set_terms] = useState<supplier_terms[]>([])
  const [ledger, set_ledger] = useState<ledger_row[]>([])
  const [tab, set_tab] = useState<'ledger' | 'terms' | 'challans'>('ledger')
  const [terms_modal, set_terms_modal] = useState(false)
  const [new_term, set_new_term] = useState('')
  const [saving_term, set_saving_term] = useState(false)

  useEffect(() => {
    if (!id) return
    const nid = Number(id)
    suppliers_api.get(nid).then(r => set_supplier(r.data))
    suppliers_api.ledger(nid).then(r => set_ledger(r.data))
    suppliers_api.get_terms(nid).then(r => set_terms(r.data))
  }, [id])

  async function add_term() {
    if (!new_term.trim() || !id) return
    set_saving_term(true)
    await suppliers_api.add_terms(Number(id), new_term)
    const res = await suppliers_api.get_terms(Number(id))
    set_terms(res.data); set_new_term(''); set_terms_modal(false); set_saving_term(false)
  }

  async function remove_term(term_id: number) {
    if (!id) return
    await suppliers_api.delete_terms(Number(id), term_id)
    set_terms(t => t.filter(x => x.id !== term_id))
  }

  if (!supplier) return <div className="text-center py-20 text-gray-400">Loading…</div>

  const final_balance = ledger.length > 0 ? Number(ledger[ledger.length - 1].balance) : 0

  return (
    <div>
      <page_header
        title={supplier.name}
        subtitle={`${supplier.phone}${supplier.gst_number ? ' • GST: ' + supplier.gst_number : ''}`}
        action={<Link to={`/suppliers/${id}/edit`} className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Edit</Link>}
      />

      {/* info cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 col-span-2">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Supplier Info</p>
          <div className="text-sm space-y-1 text-gray-700">
            <p><span className="text-gray-400">Contact:</span> {supplier.contact_name ?? '—'}</p>
            <p><span className="text-gray-400">City:</span> {supplier.city ?? '—'}, {supplier.state}</p>
            <p><span className="text-gray-400">PAN:</span> {supplier.pan_number ?? '—'}</p>
            <p><span className="text-gray-400">Credit Days:</span> {supplier.credit_limit_days}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500">Ledger Balance</p>
          <p className={`text-2xl font-bold mt-1 ${final_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{final_balance.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500">Opening Balance</p>
          <p className="text-2xl font-bold mt-1 text-gray-800">₹{Number(supplier.opening_balance).toFixed(2)}</p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 mb-4">
        {(['ledger','terms','challans'] as const).map(t => (
          <button key={t} onClick={() => set_tab(t)}
            className={`px-4 py-2 text-sm rounded-lg capitalize transition ${tab === t ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'ledger' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions yet</td></tr>
              ) : ledger.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.ref_no}</td>
                  <td className="px-4 py-3 text-gray-700">{r.description}</td>
                  <td className="px-4 py-3 text-right text-red-600">{Number(r.debit) > 0 ? `₹${Number(r.debit).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-green-600">{Number(r.credit) > 0 ? `₹${Number(r.credit).toFixed(2)}` : '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(r.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Number(r.balance).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'terms' && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Payment / Supply Terms</h3>
            <button onClick={() => set_terms_modal(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700">+ Add Term</button>
          </div>
          {terms.filter(t => t.is_active).length === 0 ? (
            <p className="text-gray-400 text-sm">No terms added yet</p>
          ) : (
            <ul className="space-y-2">
              {terms.filter(t => t.is_active).map(t => (
                <li key={t.id} className="flex items-start justify-between gap-4 text-sm text-gray-700 border rounded-lg p-3">
                  <span>{t.terms_text}</span>
                  <button onClick={() => remove_term(t.id)} className="text-red-500 hover:text-red-700 text-xs shrink-0">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'challans' && (
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-400 text-sm">Challans will be linked from Purchase module (Phase 6).</p>
        </div>
      )}

      <Modal title="Add Term" open={terms_modal} onClose={() => set_terms_modal(false)}>
        <div className="space-y-4">
          <textarea value={new_term} onChange={e => set_new_term(e.target.value)} rows={3}
            placeholder="e.g. Payment within 30 days of delivery"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => set_terms_modal(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={add_term} disabled={saving_term} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving_term ? 'Saving…' : 'Add Term'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
