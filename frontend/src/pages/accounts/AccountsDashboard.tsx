import React from 'react';
import StatCard from '../../components/common/StatCard';

const AccountsDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center">
            <span className="bg-indigo-600 text-white p-1 rounded mr-2"><i className="fas fa-university"></i></span>
            Accounts Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Financial overview & supplier payment status</p>
        </div>
        <div className="flex space-x-2">
           <button className="btn btn-primary bg-indigo-600 border-0 text-xs px-4">
             <i className="fas fa-plus-circle mr-2"></i> New Payment
           </button>
           <button className="btn btn-outline-dark text-xs px-4">
             <i className="fas fa-file-invoice mr-2"></i> Bill Entry (SPS)
           </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Payable" value="₹ 42.50 L" icon="fas fa-arrow-up" color="#e11d48" trend="+2.4% from last month" />
        <StatCard title="Total Receivable" value="₹ 18.20 L" icon="fas fa-arrow-down" color="#059669" trend="-1.5% from last month" />
        <StatCard title="Bank Balance" value="₹ 1.05 Cr" icon="fas fa-wallet" color="#2563eb" trend="Stable" />
        <StatCard title="Cash in Hand" value="₹ 8.45 L" icon="fas fa-money-bill-wave" color="#d97706" trend="+5.1% increase" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bills for Approval */}
        <div className="card shadow-sm border-0 bg-white">
          <div className="card-header py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pending SPS Approval</h5>
            <span className="badge badge-danger">12 Bills</span>
          </div>
          <div className="card-body p-0">
             <table className="w-full text-left text-xs">
               <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                 <tr>
                   <th className="px-4 py-3">GRN #</th>
                   <th className="px-4 py-3">Supplier</th>
                   <th className="px-4 py-3 text-right">Amount</th>
                   <th className="px-4 py-3 text-center">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 <tr>
                    <td className="px-4 py-3 font-bold text-blue-600">GRN-0042</td>
                    <td className="px-4 py-3">Oceanic Seafoods</td>
                    <td className="px-4 py-3 text-right font-bold">₹1,25,000</td>
                    <td className="px-4 py-3 text-center">
                       <button className="bg-green-50 text-green-600 px-2 py-1 rounded font-bold hover:bg-green-100">Verify</button>
                    </td>
                 </tr>
                 <tr>
                    <td className="px-4 py-3 font-bold text-blue-600">GRN-0051</td>
                    <td className="px-4 py-3">Fresh Catch</td>
                    <td className="px-4 py-3 text-right font-bold">₹42,800</td>
                    <td className="px-4 py-3 text-center">
                       <button className="bg-green-50 text-green-600 px-2 py-1 rounded font-bold hover:bg-green-100">Verify</button>
                    </td>
                 </tr>
               </tbody>
             </table>
          </div>
          <div className="card-footer bg-white border-t border-slate-50 py-3 text-center">
             <button className="text-blue-600 text-[10px] font-bold uppercase hover:underline">View All Pending Bills &rarr;</button>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card shadow-sm border-0 bg-white">
          <div className="card-header py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Payment Vouchers</h5>
            <span className="badge badge-info">This Week</span>
          </div>
          <div className="card-body p-0">
             <table className="w-full text-left text-xs">
               <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                 <tr>
                   <th className="px-4 py-3">Voucher #</th>
                   <th className="px-4 py-3">Payee</th>
                   <th className="px-4 py-3">Mode</th>
                   <th className="px-4 py-3 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 <tr>
                    <td className="px-4 py-3 font-bold text-slate-700">PV-2024-88</td>
                    <td className="px-4 py-3">Modern Fisheries</td>
                    <td className="px-4 py-3"><span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">UPI</span></td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">₹85,000</td>
                 </tr>
                 <tr>
                    <td className="px-4 py-3 font-bold text-slate-700">PV-2024-87</td>
                    <td className="px-4 py-3">Rent - HO Office</td>
                    <td className="px-4 py-3"><span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">CHEQUE</span></td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">₹2,40,000</td>
                 </tr>
               </tbody>
             </table>
          </div>
          <div className="card-footer bg-white border-t border-slate-50 py-3 text-center">
             <button className="text-blue-600 text-[10px] font-bold uppercase hover:underline">View Payment Ledger &rarr;</button>
          </div>
        </div>
      </div>

      {/* Bank Balances */}
      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="card-header bg-slate-800 text-white py-2 text-[10px] uppercase font-bold tracking-widest">
           Bank & Ledger Reconciliation
        </div>
        <div className="card-body p-0 grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100">
           <div className="p-4 flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full text-blue-600 text-xl"><i className="fas fa-university"></i></div>
              <div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase">HDFC Bank (8842)</div>
                 <div className="text-lg font-black text-slate-800">₹ 82,45,210.00</div>
              </div>
           </div>
           <div className="p-4 flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 text-xl"><i className="fas fa-university"></i></div>
              <div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase">ICICI Current (0021)</div>
                 <div className="text-lg font-black text-slate-800">₹ 14,20,500.00</div>
              </div>
           </div>
           <div className="p-4 flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full text-green-600 text-xl"><i className="fas fa-money-bill-wave"></i></div>
              <div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase">HO Petty Cash</div>
                 <div className="text-lg font-black text-slate-800">₹ 8,45,000.00</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsDashboard;
