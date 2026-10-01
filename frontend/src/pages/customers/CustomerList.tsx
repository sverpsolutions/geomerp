import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customers_api, type customer_list_item, type paginated } from '../../api/customers'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'

const TYPE_COLORS: Record<string, string> = {
  retail: 'bg-blue-100 text-blue-700',
  wholesale: 'bg-purple-100 text-purple-700',
  hotel: 'bg-orange-100 text-orange-700',
  institution: 'bg-teal-100 text-teal-700',
}

export default function customer_list_page() {
  const [result, set_result] = useState<paginated<customer_list_item> | null>(null)
  const [page, set_page] = useState(1)
  const [search, set_search] = useState('')
  const [filter_type, set_filter_type] = useState('')
  const [loading, set_loading] = useState(true)

  async function load(p = page, s = search, t = filter_type) {
    set_loading(true)
    try {
      const res = await customers_api.list({ page: p, per_page: 25, search: s, type: t || undefined })
      set_result(res.data)
    } finally { set_loading(false) }
  }

  useEffect(() => { load(page, search, filter_type) }, [page])

  function handle_search(val: string) { set_search(val); set_page(1); load(1, val, filter_type) }
  function handle_type(val: string) { set_filter_type(val); set_page(1); load(1, search, val) }

  async function handle_delete(id: number, name: string) {
    if (!confirm(`Deactivate customer "${name}"?`)) return
    await customers_api.delete(id); load()
  }

  const rows = result?.data ?? []

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={result ? `${result.total} customers` : 'Customer master'}
        action={<Link to="/customers/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Add Customer</Link>}
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={search} onChange={e => handle_search(e.target.value)}
          placeholder="Search name, phone, GST…"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60" />
        <select value={filter_type} onChange={e => handle_type(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Types</option>
          {['retail', 'wholesale', 'hotel', 'institution'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">GST No.</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Credit Limit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">No customers found</td></tr>
            ) : rows.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                <td className="px-4 py-3 text-gray-500">{c.city ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[c.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {c.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.gst_number ?? '—'}</td>
                <td className={`px-4 py-3 text-right font-semibold ${Number(c.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Number(c.balance).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">₹{Number(c.credit_limit).toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge active={c.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link to={`/customers/${c.id}`} className="text-gray-500 hover:text-gray-700 text-xs">View</Link>
                    <Link to={`/customers/${c.id}/edit`} className="text-blue-600 hover:text-blue-800 text-xs">Edit</Link>
                    {c.status && <button onClick={() => handle_delete(c.id, c.name)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {result && result.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
            <span>Showing {rows.length} of {result.total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => set_page(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <span className="px-3 py-1">Page {page} / {result.total_pages}</span>
              <button disabled={page === result.total_pages} onClick={() => set_page(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
