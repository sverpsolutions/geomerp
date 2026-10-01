import { useState } from 'react';

const Schemes = () => {
  const [showForm, setShowForm] = useState(false);

  const schemes = [
    { id: 1, name: 'Monsoon Bonanza', type: 'Buy X Get Y', desc: 'Buy 2 Get 1 Free on all seafood', from: '01 Jun 2026', to: '30 Jun 2026', status: 'upcoming', products: 42 },
    { id: 2, name: 'Weekend Special', type: 'Flat Discount', desc: '15% off on all frozen items', from: '01 May 2026', to: '31 May 2026', status: 'active', products: 28 },
    { id: 3, name: 'Summer Sale', type: 'Combo Deal', desc: 'Fish + Masala combo pack at ₹499', from: '01 Apr 2026', to: '30 Apr 2026', status: 'expired', products: 5 },
    { id: 4, name: 'First Order Discount', type: 'Flat Discount', desc: '20% off on first online order', from: '01 May 2026', to: '31 Dec 2026', status: 'active', products: 0 },
  ];

  const statusStyles: Record<string, string> = { active: 'bg-green-100 text-green-700', upcoming: 'bg-blue-100 text-blue-700', expired: 'bg-slate-100 text-slate-500' };
  const typeStyles: Record<string, string> = { 'Buy X Get Y': 'bg-purple-100 text-purple-700', 'Flat Discount': 'bg-amber-100 text-amber-700', 'Combo Deal': 'bg-cyan-100 text-cyan-700' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center">
            <span className="bg-yellow-500 text-white p-1.5 rounded-lg mr-2"><i className="fas fa-percent"></i></span>
            Promotional Schemes
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Create & manage offers, discounts, and deals</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-yellow-500 text-white font-bold py-2 px-5 rounded-lg shadow-lg hover:bg-yellow-600 transition-all flex items-center text-xs">
          <i className="fas fa-plus-circle mr-2"></i> New Scheme
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Schemes', value: schemes.filter(s => s.status === 'active').length, icon: 'fas fa-bolt', bg: 'bg-green-100', fg: 'text-green-600' },
          { label: 'Upcoming', value: schemes.filter(s => s.status === 'upcoming').length, icon: 'fas fa-clock', bg: 'bg-blue-100', fg: 'text-blue-600' },
          { label: 'Expired', value: schemes.filter(s => s.status === 'expired').length, icon: 'fas fa-history', bg: 'bg-slate-100', fg: 'text-slate-500' },
          { label: 'Products Covered', value: schemes.reduce((s, e) => s + e.products, 0), icon: 'fas fa-box-open', bg: 'bg-amber-100', fg: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><i className={`${s.icon} ${s.fg}`}></i></div>
              <div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.label}</div><div className="text-xl font-black text-slate-800">{s.value}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Scheme Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schemes.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{s.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusStyles[s.status]}`}>{s.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${typeStyles[s.type]}`}>{s.type}</span>
                <span className="text-[10px] text-slate-400"><i className="fas fa-calendar mr-1"></i>{s.from} — {s.to}</span>
                {s.products > 0 && <span className="text-[10px] text-slate-400"><i className="fas fa-box mr-1"></i>{s.products} products</span>}
              </div>
            </div>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button className="text-[10px] text-blue-600 font-bold hover:underline">Edit</button>
              <button className="text-[10px] text-slate-400 font-bold hover:underline">Duplicate</button>
              {s.status !== 'expired' && <button className="text-[10px] text-red-500 font-bold hover:underline">Deactivate</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Schemes;
