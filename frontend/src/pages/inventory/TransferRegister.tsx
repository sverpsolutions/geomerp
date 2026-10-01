import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import { inventory_api } from '../../api/inventory'
import { getCompanySettings } from '../../api/company'
import { useAuthStore } from '../../store/authStore'
import { printTransferOut, type transfer_print } from '../../utils/printTransferOut'

type direction = 'out' | 'in'
interface row {
  id: number; transfer_no: string; transfer_date: string | null; status: string; remarks: string | null
  from_name: string | null; to_name: string | null
  item_count: number; total_qty: string; cost_value: string; mrp_value: string
}
interface list_out { items: row[]; total: number; totals: { total_qty: string; cost_value: string; mrp_value: string } }

const n2 = (v: unknown) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const qty = (v: unknown) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })
const dmy = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const PER_PAGE = 50
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800', completed: 'bg-emerald-50 text-emerald-800', received: 'bg-emerald-50 text-emerald-800',
}

export default function TransferRegister({ direction }: { direction: direction }) {
  const user = useAuthStore(s => s.user)
  const [locations, setLocations] = useState<{ id: number; outlet_name: string }[]>([])
  const [locationId, setLocationId] = useState<number | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<list_out | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState<Record<number, transfer_print | 'loading'>>({})

  const isOut = direction === 'out'

  useEffect(() => {
    inventory_api.getBranches().then((list: { id: number; outlet_name: string }[]) => {
      setLocations(list)
      // default: user's outlet, else HO (outlets have no HO flag, only "(HO)" in the name)
      setLocationId(user?.outlet_id ?? list.find(l => /\(HO\)/i.test(l.outlet_name))?.id ?? '')
    }).catch(() => toast.error('Failed to load locations'))
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 250)  // debounce typing in the search box
    return () => clearTimeout(t)
  }, [direction, locationId, dateFrom, dateTo, status, q, page])

  async function load() {
    setLoading(true)
    try {
      setData(await inventory_api.listTransfers({
        direction, location_id: locationId || undefined, date_from: dateFrom || undefined,
        date_to: dateTo || undefined, status: status || undefined, q: q.trim() || undefined, page, per_page: PER_PAGE,
      }))
    } catch {
      toast.error('Failed to load transfers')
    } finally {
      setLoading(false)
    }
  }

  async function toggle(id: number) {
    if (open[id]) return setOpen(({ [id]: _, ...rest }) => rest)
    setOpen(o => ({ ...o, [id]: 'loading' }))
    try {
      const doc = await inventory_api.getTransferPrint(id)
      setOpen(o => ({ ...o, [id]: doc }))
    } catch {
      toast.error('Failed to load transfer items')
      setOpen(({ [id]: _, ...rest }) => rest)
    }
  }

  async function print(id: number) {
    try {
      const [doc, company] = await Promise.all([inventory_api.getTransferPrint(id), getCompanySettings()])
      printTransferOut([doc], company)
    } catch {
      toast.error('Could not load transfer for printing')
    }
  }

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1) }
  const pages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1

  return (
    <div>
      <PageHeader
        title={isOut ? 'Stock Transfer OUT' : 'Stock Transfer IN'}
        subtitle={isOut ? 'Transfers sent from the selected location' : 'Transfers received at the selected location'}
        action={isOut && (
          <Link to="/inventory/transfer/multi" className="btn btn-primary hover:no-underline">
            <i className="fas fa-plus"></i> New Transfer Out
          </Link>
        )}
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white border border-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <label className="col-span-2">
            <span className="form-label">{isOut ? 'From location' : 'To location'}</span>
            <select className="form-input" value={locationId} onChange={e => resetPage(setLocationId)(e.target.value ? Number(e.target.value) : '')}>
              <option value="">All locations</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.outlet_name}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">From date</span>
            <input type="date" className="form-input" value={dateFrom} onChange={e => resetPage(setDateFrom)(e.target.value)} />
          </label>
          <label>
            <span className="form-label">To date</span>
            <input type="date" className="form-input" value={dateTo} onChange={e => resetPage(setDateTo)(e.target.value)} />
          </label>
          <label>
            <span className="form-label">Status</span>
            <select className="form-input" value={status} onChange={e => resetPage(setStatus)(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label>
            <span className="form-label">Transfer no</span>
            <input className="form-input font-mono" placeholder="TRF-…" value={q} onChange={e => resetPage(setQ)(e.target.value)} />
          </label>
        </div>

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Transfers', data.total.toLocaleString('en-IN')],
              ['Total qty', qty(data.totals.total_qty)],
              ['Cost value', `₹${n2(data.totals.cost_value)}`],
              ['MRP value', `₹${n2(data.totals.mrp_value)}`],
            ].map(([k, v]) => (
              <div key={k} className="bg-white border border-border rounded-xl px-4 py-3">
                <div className="text-[12px] font-medium text-text-secondary">{k}</div>
                <div className="font-mono text-[20px] font-semibold">{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Register */}
        <div className="bg-white border border-border rounded-xl overflow-x-auto">
          <table className="ent-table">
            <thead>
              <tr>
                <th className="w-8"><span className="sr-only">Expand</span></th>
                <th>Transfer no</th><th>Date</th><th>From</th><th>To</th>
                <th className="text-right">Items</th><th className="text-right">Qty</th>
                <th className="text-right">Cost value ₹</th><th className="text-right">MRP value ₹</th>
                <th>Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(r => {
                const detail = open[r.id]
                return (
                  <Fragment key={r.id}>
                    <tr className="cursor-pointer" onClick={() => toggle(r.id)}>
                      <td>
                        <button type="button" aria-label={detail ? 'Hide items' : 'Show items'} aria-expanded={!!detail}
                          className="w-7 h-7 rounded text-text-secondary hover:bg-app-bg">
                          <i className={`fas fa-chevron-${detail ? 'down' : 'right'} text-[11px]`}></i>
                        </button>
                      </td>
                      <td className="font-mono font-semibold text-primary">{r.transfer_no}</td>
                      <td className="whitespace-nowrap">{dmy(r.transfer_date)}</td>
                      <td>{r.from_name || '—'}</td>
                      <td>{r.to_name || '—'}</td>
                      <td className="text-right font-mono">{r.item_count}</td>
                      <td className="text-right font-mono">{qty(r.total_qty)}</td>
                      <td className="text-right font-mono">{n2(r.cost_value)}</td>
                      <td className="text-right font-mono">{n2(r.mrp_value)}</td>
                      <td><span className={`status-badge ${STATUS_TONE[r.status] || 'bg-slate-100 text-slate-700'}`}>{r.status}</span></td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button type="button" className="btn btn-secondary h-8 px-3 text-[12px]" onClick={() => print(r.id)}>
                          <i className="fas fa-print"></i> Print
                        </button>
                      </td>
                    </tr>
                    {detail && (
                      <tr>
                        <td></td>
                        <td colSpan={10} className="!p-0 bg-app-bg">
                          {detail === 'loading' ? (
                            <div className="p-4 text-text-muted">Loading items…</div>
                          ) : (
                            <div className="p-4">
                              {detail.remarks?.trim() && <p className="mb-2 text-[13px]"><strong>Remarks:</strong> {detail.remarks}</p>}
                              <table className="w-full text-[13px] bg-white border border-border rounded-lg">
                                <thead className="text-[12px] text-text-secondary">
                                  <tr className="border-b border-border">
                                    <th className="text-left p-2">#</th><th className="text-left p-2">Item</th><th className="text-left p-2">Code</th>
                                    <th className="text-left p-2">Barcode</th><th className="text-right p-2">Qty</th>
                                    <th className="text-right p-2">Cost ₹</th><th className="text-right p-2">MRP ₹</th>
                                    <th className="text-right p-2">Cost value ₹</th><th className="text-right p-2">MRP value ₹</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.items.map((it, i) => (
                                    <tr key={i} className="border-b border-border-table">
                                      <td className="p-2">{i + 1}</td>
                                      <td className="p-2 font-medium">{it.name}</td>
                                      <td className="p-2 font-mono">{it.item_code || '—'}</td>
                                      <td className="p-2 font-mono">{it.barcode || '—'}</td>
                                      <td className="p-2 text-right font-mono">{qty(it.qty)} {it.unit}</td>
                                      <td className="p-2 text-right font-mono">{n2(it.cost_price)}</td>
                                      <td className="p-2 text-right font-mono">{n2(it.mrp)}</td>
                                      <td className="p-2 text-right font-mono">{n2(it.total_val)}</td>
                                      <td className="p-2 text-right font-mono">{n2(Number(it.qty) * Number(it.mrp))}</td>
                                    </tr>
                                  ))}
                                  <tr className="font-semibold">
                                    <td className="p-2" colSpan={4}>Subtotal ({detail.items.length} items)</td>
                                    <td className="p-2 text-right font-mono">{qty(r.total_qty)}</td>
                                    <td></td><td></td>
                                    <td className="p-2 text-right font-mono">{n2(r.cost_value)}</td>
                                    <td className="p-2 text-right font-mono">{n2(r.mrp_value)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {data && !data.items.length && (
                <tr><td colSpan={11} className="text-center py-10 text-text-muted">{loading ? 'Loading…' : 'No transfers found for these filters.'}</td></tr>
              )}
              {!data && (
                <tr><td colSpan={11} className="text-center py-10 text-text-muted">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > PER_PAGE && (
          <div className="flex items-center justify-end gap-3 text-[14px]">
            <span className="text-text-secondary">Page {page} of {pages}</span>
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
