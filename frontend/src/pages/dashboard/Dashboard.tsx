import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { dashboard_api, type dashboard_summary } from '../../api/dashboard'
import { useThemeStore } from '../../store/themeStore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const REFRESH_MS = 60_000
const inr = (v: unknown, dec = 0) =>
  '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const short = (v: unknown) => {
  const n = Number(v || 0)
  return n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L` : inr(n)
}
const qty = (v: unknown) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })
const dmy = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—')
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function Card({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-app-card border border-border rounded-xl ${className}`}>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <h2 className="!text-[15px] !normal-case !tracking-normal font-semibold text-text-primary m-0">{title}</h2>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  )
}

function Kpi({ label, value, sub, tone = 'text-text-secondary' }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="bg-app-card border border-border rounded-xl p-5 flex flex-col gap-2">
      <span className="text-[13px] font-medium text-text-secondary">{label}</span>
      <span className="font-mono text-[28px] leading-8 font-semibold text-text-primary tracking-tight">{value}</span>
      <span className={`text-[13px] font-medium ${tone}`}>{sub}</span>
    </div>
  )
}

export default function Dashboard() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<dashboard_summary | null>(null)
  const [updated, setUpdated] = useState<Date | null>(null)
  useThemeStore(s => s.isDarkMode)  // re-render so chart colours re-read the theme tokens

  useEffect(() => {
    let alive = true
    const load = () => dashboard_api.summary(days)
      .then(d => { if (alive) { setData(d); setUpdated(new Date()) } })
      .catch(() => alive && toast.error('Failed to load dashboard'))
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => { alive = false; clearInterval(t) }
  }, [days])

  if (!data) {
    return <div className="p-8 text-text-muted">Loading dashboard…</div>
  }

  const k = data.kpi
  const today = Number(k.today_sales), yest = Number(k.yesterday_sales)
  const delta = yest ? ((today - yest) / yest) * 100 : null
  const topMax = Math.max(1, ...data.top_items.map(i => Number(i.value)))
  const activeStores = data.stores.filter(s => Number(s.today_sales) > 0).length

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 max-w-[1500px]">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="m-0">Dashboard</h1>
          <p className="text-[14px] text-text-muted m-0 mt-1">
            {new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {updated && <> · updated {updated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}, refreshes every minute</>}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link to="/inventory/transfer/multi" className="btn btn-secondary hover:no-underline">New Transfer Out</Link>
          <Link to="/billing/create" className="btn btn-primary hover:no-underline"><i className="fas fa-plus"></i> New Invoice</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Today's sales" value={inr(today)}
          sub={delta === null ? `${k.today_bills} bills · avg ${inr(k.avg_bill)}` : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% vs yesterday`}
          tone={delta === null ? undefined : delta >= 0 ? 'text-[#116B3A]' : 'text-[#A3261E]'} />
        <Kpi label="Bills today" value={String(k.today_bills)}
          sub={`${activeStores} of ${data.stores.length} stores billing · returns ${inr(k.today_returns)}`} />
        <Kpi label="This month" value={short(k.month_sales)} sub={`since 1 ${new Date(data.date).toLocaleDateString('en-IN', { month: 'short' })}`} />
        <Kpi label="Receivables" value={short(k.receivables)} sub={`${k.unpaid_bills.toLocaleString('en-IN')} unpaid bills`} tone="text-[#A3261E]" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title={`Sales — last ${days} days`} className="xl:col-span-2" action={
          <div role="group" aria-label="Range" className="flex border border-border-strong rounded-lg overflow-hidden">
            {[7, 30].map(d => (
              <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
                className={`h-8 px-3 text-[13px] ${days === d ? 'bg-primary-light text-primary font-semibold' : 'text-text-secondary'}`}>{d}D</button>
            ))}
          </div>
        }>
          <div className="px-5 pb-5 h-[260px]">
            <Bar
              data={{
                labels: data.daily.map(d => dmy(d.day)),
                datasets: [{
                  data: data.daily.map(d => Number(d.sales)),
                  backgroundColor: data.daily.map((_, i) => i === data.daily.length - 1 ? css('--color-primary') : css('--color-accent') + '66'),
                  borderRadius: 6, maxBarThickness: 48,
                }],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${inr(c.parsed.y)} · ${data.daily[c.dataIndex].bills} bills` } } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: css('--color-text-muted') } },
                  y: { beginAtZero: true, grid: { color: css('--color-border-table') }, ticks: { color: css('--color-text-muted'), callback: v => short(v) } },
                },
              }}
            />
          </div>
        </Card>

        <Card title={`Top items — ${days} days`}>
          <div className="px-5 pb-5 flex flex-col gap-3">
            {data.top_items.map(t => (
              <div key={t.item_code ?? t.name} className="flex flex-col gap-1.5">
                <div className="flex gap-3 text-[14px]">
                  <span className="truncate text-text-primary">{t.name}</span>
                  <span className="ml-auto font-mono font-medium text-text-primary">{inr(t.value)}</span>
                </div>
                <div className="h-1.5 rounded bg-border-table"><div className="h-1.5 rounded bg-accent" style={{ width: `${(Number(t.value) / topMax) * 100}%` }} /></div>
              </div>
            ))}
            {!data.top_items.length && <p className="text-text-muted text-[14px]">No sales in this period.</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Store performance" className="xl:col-span-2" action={<Link to="/stores/health" className="text-[14px] font-medium">Store health →</Link>}>
          <div className="overflow-x-auto">
            <table className="ent-table">
              <thead><tr><th>Store</th><th className="text-right">Today</th><th className="text-right">Bills</th><th className="text-right">This month</th><th>Last bill</th></tr></thead>
              <tbody>
                {data.stores.map(s => (
                  <tr key={s.id}>
                    <td><span className="font-medium">{s.name}</span>{s.code && <span className="ml-2 font-mono text-[12px] text-text-muted">{s.code}</span>}</td>
                    <td className="text-right font-mono">{Number(s.today_sales) ? inr(s.today_sales) : '—'}</td>
                    <td className="text-right font-mono">{s.today_bills || '—'}</td>
                    <td className="text-right font-mono">{Number(s.month_sales) ? inr(s.month_sales) : '—'}</td>
                    <td className={s.last_bill_date === data.date ? 'text-[#116B3A]' : 'text-text-muted'}>{dmy(s.last_bill_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Best sellers out of stock" action={
          <span className="status-badge bg-[#FBE8E6] text-[#A3261E]">{data.stockout_count}</span>
        }>
          <p className="px-5 -mt-1 mb-2 text-[12px] text-text-muted">Sold in the last 30 days, zero or negative stock now</p>
          <ul className="px-5 pb-4 m-0 list-none">
            {data.stockouts.map(s => (
              <li key={`${s.outlet_id}-${s.product_id}`} className="flex gap-3 py-2.5 border-b border-border-table last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium truncate text-text-primary">{s.name}</div>
                  <div className="text-[12px] text-text-muted">{s.outlet} · sold {qty(s.sold_qty)}</div>
                </div>
                <span className="font-mono text-[14px] font-semibold text-[#A3261E]">{qty(s.stock_qty)}</span>
              </li>
            ))}
            {!data.stockouts.length && <li className="text-text-muted text-[14px] py-2">Nothing out of stock.</li>}
          </ul>
          <div className="px-5 pb-4"><Link to="/inventory/transfer/multi" className="text-[14px] font-medium">Send stock →</Link></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Recent bills" className="xl:col-span-2" action={<Link to="/billing/invoices" className="text-[14px] font-medium">All invoices →</Link>}>
          <div className="overflow-x-auto">
            <table className="ent-table">
              <thead><tr><th>Bill</th><th>Store</th><th>Customer</th><th>Date</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {data.recent_invoices.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono">{r.invoice_no}</td>
                    <td>{r.outlet || '—'}</td>
                    <td className="truncate max-w-[180px]">{r.customer || '—'}</td>
                    <td>{dmy(r.invoice_date)}</td>
                    <td className="text-right font-mono">{inr(r.total_amount, 2)}</td>
                    <td>
                      <span className={`status-badge ${r.invoice_type === 'return' ? 'bg-[#E8EEFB] text-[#2B4C9B]' : Number(r.due_amount) > 0 ? 'bg-[#FDF1DE] text-[#8A4B00]' : 'bg-[#E6F4EC] text-[#116B3A]'}`}>
                        {r.invoice_type === 'return' ? 'Return' : Number(r.due_amount) > 0 ? 'Due' : 'Paid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Stock transfers">
          <div className="px-5 pb-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary-light p-4">
              <div className="text-[12px] text-text-secondary">Pending</div>
              <div className="font-mono text-[26px] font-semibold text-primary">{data.transfers.pending}</div>
            </div>
            <div className="rounded-lg bg-app-bg p-4">
              <div className="text-[12px] text-text-secondary">Created today</div>
              <div className="font-mono text-[26px] font-semibold text-text-primary">{data.transfers.today}</div>
            </div>
            <Link to="/inventory/transfer/out" className="col-span-2 text-[14px] font-medium">Transfer register →</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
