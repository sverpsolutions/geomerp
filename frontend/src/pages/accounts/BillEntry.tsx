import { useState } from 'react';

const BillEntry = () => {
  const [tab, setTab] = useState<'pending' | 'verified'>('pending');

  const pendingBills = [
    { id: 1, grn: 'GRN-0042', supplier: 'Oceanic Seafoods', grn_date: '15 May 2026', grn_amount: 125000, inv_no: '', inv_date: '', inv_amount: 0, diff: 0, status: 'unmatched' },
    { id: 2, grn: 'GRN-0051', supplier: 'Fresh Catch Pvt Ltd', grn_date: '16 May 2026', grn_amount: 42800, inv_no: 'FC-1122', inv_date: '16 May 2026', inv_amount: 42800, diff: 0, status: 'matched' },
    { id: 3, grn: 'GRN-0055', supplier: 'Deep Sea Traders', grn_date: '17 May 2026', grn_amount: 88500, inv_no: 'DST-445', inv_date: '17 May 2026', inv_amount: 87200, diff: 1300, status: 'mismatch' },
    { id: 4, grn: 'GRN-0058', supplier: 'Golden Harvest Agro', grn_date: '18 May 2026', grn_amount: 34200, inv_no: '', inv_date: '', inv_amount: 0, diff: 0, status: 'unmatched' },
  ];

  const verifiedBills = [
    { id: 10, grn: 'GRN-0035', supplier: 'Modern Fisheries', grn_amount: 85000, inv_no: 'MF-889', inv_amount: 85000, verified_by: 'Admin', verified_on: '14 May 2026' },
    { id: 11, grn: 'GRN-0038', supplier: 'Coastal Supplies', grn_amount: 52300, inv_no: 'CS-220', inv_amount: 52300, verified_by: 'Admin', verified_on: '14 May 2026' },
  ];

  const statusBadge: Record<string, { bg: string; label: string }> = {
    unmatched: { bg: 'bg-slate-100 text-slate-600', label: 'Awaiting Invoice' },
    matched: { bg: 'bg-green-100 text-green-700', label: 'Matched' },
    mismatch: { bg: 'bg-red-100 text-red-700', label: 'Amount Mismatch' },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center">
            <span className="bg-rose-600 text-white p-1.5 rounded-lg mr-2"><i className="fas fa-file-invoice-dollar"></i></span>
            Bill Entry (SPS)
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Supplier Payment System — Invoice matching & verification</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Verification', value: pendingBills.length, icon: 'fas fa-hourglass-half', bg: 'bg-amber-100', fg: 'text-amber-600' },
          { label: 'Matched & Ready', value: 1, icon: 'fas fa-check-double', bg: 'bg-green-100', fg: 'text-green-600' },
          { label: 'Amount Mismatch', value: 1, icon: 'fas fa-exclamation-triangle', bg: 'bg-red-100', fg: 'text-red-600' },
          { label: 'Total Pending Value', value: `₹${(pendingBills.reduce((s, b) => s + b.grn_amount, 0) / 100000).toFixed(2)}L`, icon: 'fas fa-rupee-sign', bg: 'bg-blue-100', fg: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><i className={`${s.icon} ${s.fg}`}></i></div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.label}</div>
                <div className="text-xl font-black text-slate-800">{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'pending' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          Pending Verification <span className="ml-1 bg-white/20 px-1.5 rounded-full text-[10px]">{pendingBills.length}</span>
        </button>
        <button onClick={() => setTab('verified')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'verified' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          Verified Bills
        </button>
      </div>

      {tab === 'pending' ? (
        <div className="card shadow-sm border-0 overflow-hidden bg-white">
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1a2e] text-white uppercase tracking-tighter">
                <tr>
                  <th className="px-4 py-3">GRN #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">GRN Date</th>
                  <th className="px-4 py-3 text-right">GRN Amount</th>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3 text-right">Inv Amount</th>
                  <th className="px-4 py-3 text-right">Difference</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingBills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-blue-600">{b.grn}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{b.supplier}</td>
                    <td className="px-4 py-3 text-slate-500">{b.grn_date}</td>
                    <td className="px-4 py-3 text-right font-bold">₹{b.grn_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">{b.inv_no || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="px-4 py-3 text-right">{b.inv_amount ? `₹${b.inv_amount.toLocaleString()}` : '—'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${b.diff > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {b.diff > 0 ? `₹${b.diff.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBadge[b.status].bg}`}>{statusBadge[b.status].label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.status === 'matched' ? (
                        <button className="bg-green-50 text-green-600 px-2.5 py-1 rounded font-bold hover:bg-green-100 text-[10px]">Verify & Approve</button>
                      ) : b.status === 'unmatched' ? (
                        <button className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded font-bold hover:bg-blue-100 text-[10px]">Enter Invoice</button>
                      ) : (
                        <button className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded font-bold hover:bg-amber-100 text-[10px]">Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0 overflow-hidden bg-white">
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1a2e] text-white uppercase tracking-tighter">
                <tr>
                  <th className="px-4 py-3">GRN #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Verified By</th>
                  <th className="px-4 py-3">Verified On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifiedBills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-blue-600">{b.grn}</td>
                    <td className="px-4 py-3 font-medium">{b.supplier}</td>
                    <td className="px-4 py-3 font-mono">{b.inv_no}</td>
                    <td className="px-4 py-3 text-right font-black">₹{b.inv_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{b.verified_by}</td>
                    <td className="px-4 py-3 text-slate-500">{b.verified_on}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillEntry;
