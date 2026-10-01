import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
);

/* ─── Types ──────────────────────────────────────────────── */
interface DashboardStats {
  today_sales: number;
  today_invoice_count: number;
  month_sales: number;
  month_profit: number;
  month_purchases: number;
  low_stock_count: number;
  missing_docs: number;
  expiring_docs: number;
  daily_sales: { labels: string[]; data: number[] };
  monthly_sales: { labels: string[]; data: number[] };
  top_items: { name: string; qty: number; value: number }[];
  recent_invoices: { id: number; no: string; customer: string; date: string; amount: number; status: string }[];
}

/* ─── Stat Card ──────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, color, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: string; color: string; trend?: number;
}) {
  return (
    <div className="stat-card">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, boxShadow: `0 4px 12px ${color}20` }}
      >
        <i className={`${icon} text-base`} style={{ color }}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--clr-text-muted)' }}>{label}</p>
        <p className="text-lg font-bold leading-tight mt-0.5" style={{ color: 'var(--clr-text-primary)' }}>{value}</p>
        {sub && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--clr-text-muted)' }}>
            {trend !== undefined && (
              <span className={`font-semibold mr-1 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'} text-[9px] mr-0.5`}></i>
                {Math.abs(trend)}%
              </span>
            )}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────── */
const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setStats({
        today_sales: 45250,
        today_invoice_count: 12,
        month_sales: 1250400,
        month_profit: 320500,
        month_purchases: 850200,
        low_stock_count: 5,
        missing_docs: 2,
        expiring_docs: 1,
        daily_sales: {
          labels: ['24 Apr', '25 Apr', '26 Apr', '27 Apr', '28 Apr', '29 Apr', '30 Apr'],
          data: [42000, 38000, 45000, 31000, 52000, 48000, 45250],
        },
        monthly_sales: {
          labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
          data: [950000, 1100000, 1050000, 1200000, 1350000, 1250400],
        },
        top_items: [
          { name: 'Fresh Pomfret (Large)', qty: 120, value: 85000 },
          { name: 'King Fish Steaks', qty: 85, value: 62000 },
          { name: 'Tiger Prawns (Jumbo)', qty: 45, value: 58000 },
        ],
        recent_invoices: [
          { id: 1, no: 'INV-2024-001', customer: 'Taj Hotel', date: '30-Apr', amount: 12500, status: 'paid' },
          { id: 2, no: 'INV-2024-002', customer: 'Marriott', date: '30-Apr', amount: 8400, status: 'pending' },
          { id: 3, no: 'INV-2024-003', customer: 'Local Retail', date: '30-Apr', amount: 2100, status: 'paid' },
        ],
      });
    }, 400);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm" style={{ color: 'var(--clr-text-muted)' }}>Loading Dashboard…</span>
        </div>
      </div>
    );
  }

  const chartFont = { family: "'Inter', sans-serif", size: 11 };
  const gridColor = 'rgba(0,0,0,0.06)';

  return (
    <div className="p-3 space-y-6">

      {/* ── Page title row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <i className="fas fa-tachometer-alt text-sm" style={{ color: 'var(--clr-primary)' }}></i>
            Dashboard
          </h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/billing/estimates/new" className="btn btn-secondary btn-sm">
            <i className="fas fa-file-alt"></i> New Estimate
          </Link>
          <Link to="/billing/create" className="btn btn-primary btn-sm">
            <i className="fas fa-plus"></i> New Invoice
          </Link>
        </div>
      </div>

      {/* ── Compliance alert ── */}
      {(stats.missing_docs > 0 || stats.expiring_docs > 0) && (
        <div
          className="flex items-center gap-4 px-5 py-4 rounded-xl border-l-4"
          style={{
            background: 'var(--clr-danger-light)',
            borderColor: 'var(--clr-danger)',
            border: `1px solid #FCA5A5`,
            borderLeftWidth: 4,
            borderLeftColor: 'var(--clr-danger)',
          }}
        >
          <i className="fas fa-shield-alt text-2xl" style={{ color: 'var(--clr-danger)' }}></i>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--clr-danger)' }}>Corporate Compliance Alert</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-secondary)' }}>
              {stats.missing_docs > 0 && <span className="mr-4"><b>{stats.missing_docs}</b> mandatory documents missing</span>}
              {stats.expiring_docs > 0 && <span><b>{stats.expiring_docs}</b> documents expiring within 30 days</span>}
            </p>
          </div>
          <button className="btn btn-danger btn-sm">Compliance Hub →</button>
        </div>
      )}

      {/* ── KPI row 1 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Today's Sales" value={`₹${stats.today_sales.toLocaleString()}`}
          sub={`${stats.today_invoice_count} invoices today`} icon="fas fa-rupee-sign" color="#0E5C63" trend={4.2} />
        <KpiCard label="Month Sales" value={`₹${(stats.month_sales / 100000).toFixed(1)}L`}
          sub="May 2026" icon="fas fa-chart-line" color="#16A34A" trend={8.1} />
        <KpiCard label="Month Profit" value={`₹${(stats.month_profit / 100000).toFixed(1)}L`}
          sub="Net margin ~25.6%" icon="fas fa-coins" color="#0EA5E9" trend={2.4} />
        <KpiCard label="Month Purchases" value={`₹${(stats.month_purchases / 100000).toFixed(1)}L`}
          sub="May 2026" icon="fas fa-shopping-cart" color="#D97706" />
      </div>

      {/* ── KPI row 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Estimates Value" value="₹1,45,200" sub="12 pending" icon="fas fa-file-alt" color="#7C3AED" />
        <KpiCard label="Cash Sales" value="₹28,400" sub="8 closed today" icon="fas fa-money-bill-wave" color="#F97316" />
        <KpiCard label="Active Products" value="842" sub="156 customers • 42 suppliers" icon="fas fa-box-open" color="#10B981" />
        <KpiCard label="Low Stock Alert" value={stats.low_stock_count}
          sub={stats.low_stock_count > 0 ? 'Action needed' : 'All OK'}
          icon="fas fa-exclamation-triangle"
          color={stats.low_stock_count > 0 ? '#DC2626' : '#16A34A'} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5">
        <div className="lg:col-span-4 card">
          <div className="card-header flex justify-between items-center">
            <span>Daily Sales — Last 7 Days</span>
            <Link to="/reports/sales" className="btn btn-ghost btn-sm text-xs">
              View Report <i className="fas fa-arrow-right text-[10px]"></i>
            </Link>
          </div>
          <div className="card-body" style={{ height: 220 }}>
            <Bar
              data={{
                labels: stats.daily_sales.labels,
                datasets: [{
                  label: 'Sales (₹)',
                  data: stats.daily_sales.data,
                  backgroundColor: '#7DC0C2',
                  borderColor: '#0E5C63',
                  borderWidth: 1,
                  borderRadius: 5,
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: gridColor }, ticks: { font: chartFont } },
                  x: { grid: { display: false }, ticks: { font: chartFont } },
                },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-3 card">
          <div className="card-header">Monthly Sales — 6 Months</div>
          <div className="card-body" style={{ height: 220 }}>
            <Line
              data={{
                labels: stats.monthly_sales.labels,
                datasets: [{
                  label: 'Monthly (₹)',
                  data: stats.monthly_sales.data,
                  fill: true,
                  backgroundColor: 'rgba(14,92,99,0.08)',
                  borderColor: '#0E5C63',
                  tension: 0.35,
                  pointRadius: 4,
                  pointBackgroundColor: '#0E5C63',
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: gridColor }, ticks: { font: chartFont } },
                  x: { grid: { display: false }, ticks: { font: chartFont } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Tables row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Items */}
        <div className="card">
          <div className="card-header">🏆 Top Selling Items (Month)</div>
          <div>
            <table className="ent-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Product</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: ['#0E5C63','#16A34A','#D97706'][idx] || '#64748B' }}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="font-medium">{item.name}</td>
                    <td className="text-right">{item.qty}</td>
                    <td className="text-right font-semibold">₹{item.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="card-header flex justify-between items-center"
            style={{ color: 'var(--clr-danger)' }}>
            <span><i className="fas fa-exclamation-triangle mr-1.5"></i> Low Stock Items</span>
            <Link to="/inventory/status" className="btn btn-ghost btn-sm text-xs" style={{ color: 'var(--clr-danger)' }}>
              View All
            </Link>
          </div>
          <div>
            <table className="ent-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Min</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge badge-danger">FSH-001</span></td>
                  <td className="font-medium">Lobster (Small)</td>
                  <td className="text-right font-bold" style={{ color: 'var(--clr-danger)' }}>0</td>
                  <td className="text-right">5</td>
                </tr>
                <tr>
                  <td><span className="badge badge-warning">FSH-042</span></td>
                  <td className="font-medium">Salmon Fillet</td>
                  <td className="text-right font-bold" style={{ color: 'var(--clr-warning)' }}>2</td>
                  <td className="text-right">10</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5">
        <div className="lg:col-span-4 card">
          <div className="card-header flex justify-between items-center">
            <span>Recent Invoices</span>
            <Link to="/billing/invoices" className="btn btn-ghost btn-sm text-xs">
              View All <i className="fas fa-arrow-right text-[10px]"></i>
            </Link>
          </div>
          <div>
            <table className="ent-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span className="font-medium cursor-pointer" style={{ color: 'var(--clr-primary)' }}>
                        {inv.no}
                      </span>
                    </td>
                    <td>{inv.customer}</td>
                    <td style={{ color: 'var(--clr-text-muted)' }}>{inv.date}</td>
                    <td className="text-right font-medium">₹{inv.amount.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-3 card">
          <div className="card-header flex justify-between items-center">
            <span>Recent Estimates</span>
            <Link to="/billing/estimates" className="btn btn-ghost btn-sm text-xs">
              View All
            </Link>
          </div>
          <div className="card-body flex items-center justify-center" style={{ minHeight: 120, color: 'var(--clr-text-muted)' }}>
            <div className="text-center">
              <i className="fas fa-file-alt text-3xl mb-2 opacity-30"></i>
              <p className="text-sm">No recent estimates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
