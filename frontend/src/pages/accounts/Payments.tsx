import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

const Payments = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [advanceAvailable, setAdvanceAvailable] = useState(0);
  const [mode, setMode] = useState('Cash');
  const [discountType, setDiscountType] = useState('none');
  
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      supplier_id: '',
      bill_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'Cash',
      gross_amount: 0,
      discount_val: 0,
      net_paid: 0,
      apply_advance: false
    }
  });

  const watchGross = watch('gross_amount');
  const watchDiscVal = watch('discount_val');
  const watchApplyAdv = watch('apply_advance');

  const suppliers = [
    { id: '1', name: 'Oceanic Seafoods', gstin: '27AAAAA0000A1Z5', city: 'Mumbai', contact: 'Rajesh', mobile: '9876543210' },
    { id: '2', name: 'Fresh Catch Global', gstin: '27BBBBB1111B2Z6', city: 'Goa', contact: 'Priya', mobile: '9123456789' },
  ];

  const mockBills = {
    '1': [
      { id: '101', bill_no: 'GRN/24/001', date: '2024-04-15', amount: 125000, pending: 125000 },
      { id: '102', bill_no: 'GRN/24/015', date: '2024-04-28', amount: 45000, pending: 12000 },
    ],
    '2': [
      { id: '201', bill_no: 'GRN/24/005', date: '2024-04-10', amount: 28000, pending: 28000 },
    ]
  };

  const banks = [
    { id: '1', name: 'HDFC Bank - 8842', cheques: ['100201', '100202', '100203'] },
    { id: '2', name: 'ICICI Bank - 0021', cheques: ['554011', '554012'] },
  ];

  useEffect(() => {
    let discAmt = 0;
    if (discountType === 'percent') {
      discAmt = (watchGross * watchDiscVal) / 100;
    } else if (discountType === 'amount') {
      discAmt = watchDiscVal;
    }
    setValue('net_paid', watchGross - discAmt);
  }, [watchGross, watchDiscVal, discountType]);

  const onSupplierChange = (id: string) => {
    const s = suppliers.find(x => x.id === id);
    setSelectedSupplier(s);
    setPendingBills((mockBills as any)[id] || []);
    setAdvanceAvailable(id === '1' ? 15000 : 0); // Mock advance
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center text-indigo-700">
          <i className="fas fa-money-bill-wave mr-3"></i> Payment Entry (Vouchers)
        </h1>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => window.history.back()}>
          <i className="fas fa-history mr-2"></i> Payment Register
        </button>
      </div>

      <form className="space-y-4">
        {/* Supplier Selection */}
        <div className="card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-slate-800 text-white py-2 text-[10px] uppercase font-bold tracking-widest">
            Supplier & Bill Selection
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Select Supplier <span className="text-red-500">*</span></label>
                <select 
                  {...register('supplier_id')} 
                  className="form-control" 
                  onChange={(e) => onSupplierChange(e.target.value)}
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {selectedSupplier && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs space-y-1">
                   <div className="font-bold text-indigo-900">{selectedSupplier.name}</div>
                   <div className="text-indigo-700">GSTIN: <span className="font-mono">{selectedSupplier.gstin}</span></div>
                   <div className="text-indigo-600">Contact: {selectedSupplier.contact} ({selectedSupplier.mobile})</div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Against Bill (Optional - Blank for Advance)</label>
                <select {...register('bill_id')} className="form-control" disabled={!selectedSupplier}>
                  <option value="">-- No Specific Bill (Advance) --</option>
                  {pendingBills.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bill_no} | Date: {b.date} | Pending: ₹{b.pending.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
               {advanceAvailable > 0 && (
                 <div className="bg-green-50 border border-green-100 rounded-lg p-4 space-y-3">
                    <div className="flex items-center text-green-700">
                      <i className="fas fa-bolt mr-2"></i>
                      <span className="text-xs font-bold uppercase tracking-wider">Advance Available: ₹{advanceAvailable.toLocaleString()}</span>
                    </div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" {...register('apply_advance')} className="w-5 h-5 accent-green-600" />
                      <span className="text-xs font-medium text-green-800">Knock-off advance against selected bill</span>
                    </label>
                 </div>
               )}
               {!selectedSupplier && <div className="text-center py-10 text-slate-300 italic text-sm">Select a supplier to see pending bills</div>}
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card border-0 shadow-sm">
             <div className="card-header bg-indigo-600 text-white py-2 text-[10px] uppercase font-bold tracking-widest">
               Payment Logistics
             </div>
             <div className="card-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Payment Date</label>
                    <input type="date" {...register('payment_date')} className="form-control" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Payment Mode</label>
                    <select 
                      {...register('payment_mode')} 
                      className="form-control"
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI</option>
                      <option value="NEFT">NEFT/Bank</option>
                    </select>
                  </div>
                </div>

                {['Cheque', 'NEFT'].includes(mode) && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Select Bank Account</label>
                      <select className="form-control">
                        <option value="">-- Choose Bank --</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    {mode === 'Cheque' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Cheque Number</label>
                        <select className="form-control font-mono">
                          <option value="">-- Available Cheques --</option>
                          <option value="100201">100201</option>
                          <option value="100202">100202</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Reference # / Narration</label>
                   <textarea className="form-control" rows={2} placeholder="Transaction details..."></textarea>
                </div>
             </div>
          </div>

          <div className="card border-0 shadow-sm border-l-4 border-green-500">
             <div className="card-header bg-green-600 text-white py-2 text-[10px] uppercase font-bold tracking-widest">
               Financials & Discount
             </div>
             <div className="card-body space-y-4">
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Gross Amount (₹) <span className="text-red-500">*</span></label>
                   <input 
                     type="number" 
                     {...register('gross_amount')} 
                     className="form-control text-lg font-black text-slate-800" 
                     placeholder="0.00"
                     onChange={(e) => setValue('gross_amount', parseFloat(e.target.value))}
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Discount Type</label>
                      <select className="form-control" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                        <option value="none">No Discount</option>
                        <option value="percent">Percentage (%)</option>
                        <option value="amount">Fixed Amount (₹)</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Discount Val</label>
                      <input 
                        type="number" 
                        {...register('discount_val')} 
                        className="form-control" 
                        disabled={discountType === 'none'}
                        onChange={(e) => setValue('discount_val', parseFloat(e.target.value))}
                      />
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                   <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Paid Amount</div>
                      <div className="text-3xl font-black text-green-600">₹{watch('net_paid')?.toLocaleString()}</div>
                   </div>
                   <button type="submit" className="bg-indigo-700 text-white font-black py-3 px-10 rounded-lg shadow-lg hover:bg-indigo-800 transition-all uppercase tracking-widest text-sm">
                     Save Voucher
                   </button>
                </div>
             </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Payments;
