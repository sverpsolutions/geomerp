import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { purchases_api, type purchase_list_item } from '../../api/purchases'

const PAYMENT_BADGE: Record<string, string> = {
  cash:   'bg-green-100 text-green-700',
  credit: 'bg-blue-100 text-blue-700',
  upi:    'bg-purple-100 text-purple-700',
  cheque: 'bg-amber-100 text-amber-700',
}

function fmt(n: number | string, dec = 2) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmt_date(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Purchases() {
  const navigate = useNavigate()
  const [rows, set_rows]       = useState<purchase_list_item[]>([])
  const [loading, set_loading] = useState(true)
  const [total, set_total]     = useState(0)
  const [page, set_page]       = useState(1)
  const [err, set_err]         = useState('')
  const per_page = 20

  useEffect(() => {
    set_loading(true)
    purchases_api.list_grn({ page, per_page })
      .then(r => {
        set_rows(r.data.data)
        set_total(r.data.total)
      })
      .catch(() => set_err('Failed to load GRN list'))
      .finally(() => set_loading(false))
  }, [page])

  const total_pages = Math.ceil(total / per_page)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-slate-800 text-white p-1.5 rounded-lg">
              <i className="fas fa-shopping-cart text-sm"></i>
            </span>
            Purchase Registry (GRN)
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage stock inward & supplier invoices</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/purchases/po')}
            className="border border-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-xl text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <i className="fas fa-file-invoice text-xs"></i> Purchase Orders
          </button>
          <button className="bg-slate-900 text-white font-bold py-2 px-5 rounded-xl shadow hover:bg-slate-800 transition-colors text-sm flex items-center gap-1.5">
            <i className="fas fa-plus text-xs"></i> New Inward
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1a1a2e] text-white uppercase">
              <tr>
                <th className="px-4 py-3">Purchase #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i> Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="text-3xl mb-2">📦</div>
                    No purchase records found
                  </td>
                </tr>
              ) : rows.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-blue-600 hover:underline cursor-pointer text-numeric">
                    {p.purchase_no}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-numeric">{p.invoice_no || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt_date(p.invoice_date)}</td>
                  <td className="px-4 py-3 text-right text-numeric">{fmt(p.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-numeric text-orange-600">{fmt(p.total_gst)}</td>
                  <td className="px-4 py-3 text-right font-black text-numeric">{fmt(p.total_amount)}</td>
                  <td className={`px-4 py-3 text-right font-bold text-numeric ${Number(p.due_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmt(p.due_amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PAYMENT_BADGE[p.payment_mode] || 'bg-slate-100 text-slate-500'}`}>
                      {p.payment_mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      p.status === 'received' ? 'bg-green-100 text-green-700' :
                      p.status === 'partial'  ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600" title="View">
                        <i className="fas fa-eye text-xs"></i>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit">
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total_pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {(page - 1) * per_page + 1}–{Math.min(page * per_page, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => set_page(p => p - 1)}
                className="px-2.5 py-1 rounded border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">
                ‹ Prev
              </button>
              <span className="px-3 py-1 text-xs text-slate-600 font-semibold">{page} / {total_pages}</span>
              <button disabled={page >= total_pages} onClick={() => set_page(p => p + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
