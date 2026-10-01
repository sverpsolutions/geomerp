


const BulkDiscount = () => {
  const rules = [
    { id: 1, name: 'Wholesale Tier 1', min_qty: 10, max_qty: 24, discount: 5, type: 'percentage', category: 'All Seafood', status: 'active' },
    { id: 2, name: 'Wholesale Tier 2', min_qty: 25, max_qty: 49, discount: 8, type: 'percentage', category: 'All Seafood', status: 'active' },
    { id: 3, name: 'Bulk Buy Premium', min_qty: 50, max_qty: 999, discount: 12, type: 'percentage', category: 'All Seafood', status: 'active' },
    { id: 4, name: 'Frozen Items Slab', min_qty: 5, max_qty: 19, discount: 50, type: 'flat', category: 'Frozen Products', status: 'active' },
    { id: 5, name: 'Festival Special', min_qty: 3, max_qty: 999, discount: 10, type: 'percentage', category: 'Ready-to-Cook', status: 'paused' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center">
            <span className="bg-orange-500 text-white p-1.5 rounded-lg mr-2"><i className="fas fa-tags"></i></span>
            Bulk Discount Rules
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Quantity-based tiered pricing rules</p>
        </div>
        <button className="bg-orange-500 text-white font-bold py-2 px-5 rounded-lg shadow-lg hover:bg-orange-600 transition-all flex items-center text-xs">
          <i className="fas fa-plus-circle mr-2"></i> New Rule
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Rules', value: rules.filter(r => r.status === 'active').length, bg: 'bg-green-100', fg: 'text-green-600', icon: 'fas fa-check-circle' },
          { label: 'Paused Rules', value: rules.filter(r => r.status === 'paused').length, bg: 'bg-amber-100', fg: 'text-amber-600', icon: 'fas fa-pause-circle' },
          { label: 'Categories Covered', value: new Set(rules.map(r => r.category)).size, bg: 'bg-blue-100', fg: 'text-blue-600', icon: 'fas fa-layer-group' },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><i className={`${s.icon} ${s.fg}`}></i></div>
              <div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.label}</div><div className="text-xl font-black text-slate-800">{s.value}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Rules Table */}
      <div className="card shadow-sm border-0 overflow-hidden bg-white">
        <div className="card-header py-3 bg-slate-50 border-b border-slate-100">
          <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Discount Tiers</h5>
        </div>
        <div className="card-body p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1a1a2e] text-white uppercase tracking-tighter">
              <tr>
                <th className="px-4 py-3">Rule Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Min Qty</th>
                <th className="px-4 py-3 text-center">Max Qty</th>
                <th className="px-4 py-3 text-center">Discount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-700">{r.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600">{r.category}</span></td>
                  <td className="px-4 py-3 text-center font-medium">{r.min_qty}</td>
                  <td className="px-4 py-3 text-center font-medium">{r.max_qty === 999 ? '∞' : r.max_qty}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-black text-orange-600">{r.type === 'percentage' ? `${r.discount}%` : `₹${r.discount}`}</span>
                    <span className="text-[9px] text-slate-400 ml-1">{r.type === 'percentage' ? 'off' : 'flat off'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit"><i className="fas fa-edit"></i></button>
                      <button className="p-1.5 text-slate-400 hover:text-amber-600" title={r.status === 'active' ? 'Pause' : 'Activate'}>
                        <i className={`fas fa-${r.status === 'active' ? 'pause' : 'play'}`}></i>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-600" title="Delete"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Tier Diagram */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-header py-3 bg-slate-50 border-b border-slate-100">
          <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider"><i className="fas fa-chart-bar mr-2 text-orange-500"></i> Discount Tiers Visual</h5>
        </div>
        <div className="card-body">
          <div className="flex items-end gap-3 h-40">
            {rules.filter(r => r.type === 'percentage' && r.status === 'active').map(r => (
              <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-black text-orange-600">{r.discount}%</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-amber-400 transition-all hover:from-orange-600 hover:to-amber-500" style={{ height: `${(r.discount / 15) * 100}%` }}></div>
                <span className="text-[9px] text-slate-500 font-bold text-center">{r.min_qty}–{r.max_qty === 999 ? '∞' : r.max_qty} qty</span>
                <span className="text-[8px] text-slate-400">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkDiscount;
