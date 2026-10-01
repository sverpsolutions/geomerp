import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { customers_api, type ledger_row, type customer_detail } from '../../api/customers'
import PageHeader from '../../components/ui/PageHeader'

const TYPE_COLOR: Record<string, string> = {
  invoice: 'text-red-600',
  payment: 'text-green-600',
  opening: 'text-blue-600',
}

export default function customer_ledger_page() {
  const { id } = useParams<{ id: string }>()
  const [customer, set_customer] = useState<customer_detail | null>(null)
  const [rows, set_rows] = useState<ledger_row[]>([])
  const [loading, set_loading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([customers_api.get(Number(id)), customers_api.ledger(Number(id))])
      .then(([c, l]) => { set_customer(c.data); set_rows(l.data) })
      .finally(() => set_loading(false))
  }, [id])

  const final_balance = rows.length > 0 ? Number(rows[rows.length - 1].balance) : 0

  return (
    <div>
      <PageHeader
        title={customer ? `${customer.name} — Ledger` : 'Customer Ledger'}
        subtitle={customer ? `${customer.phone} • ${customer.type}` : ''}
        action={<Link to={`/customers/${id}/edit`} className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Edit Customer</Link>}
      />

      {/* summary cards */}
      {customer && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500">Current Balance</p>
            <p className={`text-xl font-bold mt-1 ${final_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{final_balance.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500">Credit Limit</p>
            <p className="text-xl font-bold mt-1 text-gray-800">₹{Number(customer.credit_limit).toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500">Transactions</p>
            <p className="text-xl font-bold mt-1 text-gray-800">{rows.length}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Ref No.</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit (Dr)</th>
              <th className="px-4 py-3 text-right">Credit (Cr)</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No transactions yet</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{r.date}</td>
                <td className="px-4 py-3 font-mono text-xs font-medium">{r.ref_no}</td>
                <td className={`px-4 py-3 ${TYPE_COLOR[r.type] ?? ''}`}>{r.description}</td>
                <td className="px-4 py-3 text-right text-red-600">
                  {Number(r.debit) > 0 ? `₹${Number(r.debit).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {Number(r.credit) > 0 ? `₹${Number(r.credit).toFixed(2)}` : '—'}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${Number(r.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Number(r.balance).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
