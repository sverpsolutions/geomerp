import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  product_id: string;
  name: string;
  qty: number;
  pcs: number;
  rate: number;
  discount: number;
  taxable: number;
  gst_percent: number;
  gst_amt: number;
  total: number;
  stock: number;
  unit: string;
  is_dual: boolean;
}

const Billing = () => {
  const [isInterstate, setIsInterstate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [focusedResultIdx, setFocusedResultIdx] = useState(-1);
  const [barcode, setBarcode] = useState('');
  
  const { register, control, handleSubmit, watch, setValue, getValues } = useForm({
    defaultValues: {
      customer_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      paid_amount: 0,
      cd_percent: 0,
      items: [] as CartItem[]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch("items");
  const watchPaid = watch("paid_amount");
  const watchCD = watch("cd_percent");

  // Mock Data
  const products = [
    { id: '1', name: 'Fresh Pomfret (Large)', item_code: 'FSH-001', selling_price: 850, gst_percent: 5, unit: 'KG', stock: 45, is_dual: true },
    { id: '2', name: 'King Fish Steaks', item_code: 'FSH-042', selling_price: 580, gst_percent: 12, unit: 'PKT', stock: 12, is_dual: false },
  ];

  const customers = [
    { id: '1', name: 'Taj Hotel', state: 'Maharashtra', balance: 12500 },
    { id: '2', name: 'Marriott', state: 'Delhi', balance: 0 },
  ];

  // Helper: Recalculate row
  const calcRow = (idx: number) => {
    const item = getValues(`items.${idx}`);
    if (!item) return;
    const taxable = (item.qty * item.rate) - item.discount;
    const gstAmt = (taxable * item.gst_percent) / 100;
    const total = taxable + gstAmt;
    
    setValue(`items.${idx}.taxable`, parseFloat(taxable.toFixed(2)));
    setValue(`items.${idx}.gst_amt`, parseFloat(gstAmt.toFixed(2)));
    setValue(`items.${idx}.total`, parseFloat(total.toFixed(2)));
  };

  // Helper: Add product to cart
  const addProductToCart = (prod: any) => {
    append({
      product_id: prod.id,
      name: prod.name,
      qty: 1,
      pcs: 0,
      rate: prod.selling_price,
      discount: 0,
      taxable: prod.selling_price,
      gst_percent: prod.gst_percent,
      gst_amt: (prod.selling_price * prod.gst_percent) / 100,
      total: prod.selling_price + (prod.selling_price * prod.gst_percent) / 100,
      stock: prod.stock,
      unit: prod.unit,
      is_dual: prod.is_dual
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  // Summary Calcs
  const totals = watchItems.reduce((acc, curr) => {
    acc.taxable += curr.taxable || 0;
    acc.gst += curr.gst_amt || 0;
    acc.total += curr.total || 0;
    acc.discount += curr.discount || 0;
    return acc;
  }, { taxable: 0, gst: 0, total: 0, discount: 0 });

  const cdAmt = (totals.total * watchCD) / 100;
  const grandTotal = totals.total - cdAmt;
  const dueAmount = grandTotal - watchPaid;

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center">
            <span className="bg-orange-500 text-white p-1 rounded mr-2"><i className="fas fa-file-invoice"></i></span>
            New Invoice
          </h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">POS System v4.0</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => window.history.back()}>&larr; Back</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Form Left */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Header Card */}
          <div className="card shadow-sm border-0">
            <div className="card-header py-2 bg-slate-800 text-white text-[10px] uppercase font-bold tracking-widest">
              Invoice Header
            </div>
            <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Customer</label>
                <select {...register('customer_id')} className="form-control" onChange={(e) => {
                  const c = customers.find(x => x.id === e.target.value);
                  setIsInterstate(c?.state !== 'Maharashtra'); // Mock logic
                }}>
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.balance > 0 ? `(Due: ₹${c.balance})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Date</label>
                <input type="date" {...register('invoice_date')} className="form-control" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Payment Mode</label>
                <select {...register('payment_mode')} className="form-control">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Card */}
          <div className="card border-0 shadow-sm border-l-4 border-green-500">
            <div className="card-body py-3 flex space-x-4">
              <div className="flex-1 relative">
                <label className="text-[10px] font-bold text-green-700 uppercase mb-1 block flex items-center">
                  <i className="fas fa-search mr-1"></i> Smart Search (Item Name / Code)
                </label>
                <input 
                  type="text" 
                  className="form-control font-medium" 
                  placeholder="Type to search..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length > 0) {
                      setSearchResults(products.filter(p => p.name.toLowerCase().includes(e.target.value.toLowerCase())));
                    } else {
                      setSearchResults([]);
                    }
                  }}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-b-lg z-50 border border-slate-200 mt-1 max-h-60 overflow-y-auto">
                    {searchResults.map((p, idx) => (
                      <div 
                        key={p.id} 
                        className={`p-3 border-b border-slate-50 cursor-pointer flex justify-between items-center hover:bg-slate-50 ${focusedResultIdx === idx ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}
                        onClick={() => addProductToCart(p)}
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-500">{p.item_code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">₹{p.selling_price}</div>
                          <div className={`text-[10px] font-bold ${p.stock > 10 ? 'text-green-600' : 'text-orange-600'}`}>{p.stock} {p.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-64">
                <label className="text-[10px] font-bold text-orange-600 uppercase mb-1 block flex items-center">
                  <i className="fas fa-barcode mr-1"></i> Barcode Scanner
                </label>
                <input 
                  type="text" 
                  className="form-control font-mono tracking-widest border-orange-200 focus:border-orange-500" 
                  placeholder="Scan item..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && barcode) {
                      const p = products.find(x => x.item_code === barcode);
                      if (p) addProductToCart(p);
                      setBarcode('');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="card border-0 shadow-sm overflow-hidden">
            <div className="card-body p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1a1a2e] text-white">
                  <tr>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter w-1/3">Product</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter text-center">Stock</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter w-20">Qty</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter w-20">Rate</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter w-20">Disc</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter">Taxable</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter">GST</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter text-right">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="hover:bg-slate-50 group">
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800">{watchItems[index]?.name}</div>
                        <div className="text-[10px] text-slate-500">{watchItems[index]?.unit}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="badge-superadmin px-1.5 py-0.5 rounded text-[9px]">{watchItems[index]?.stock}</span>
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="number" 
                          {...register(`items.${index}.qty` as const)} 
                          className="form-control px-1 py-0.5 text-center font-bold"
                          onChange={(e) => {
                            setValue(`items.${index}.qty`, parseFloat(e.target.value));
                            calcRow(index);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="number" 
                          {...register(`items.${index}.rate` as const)} 
                          className="form-control px-1 py-0.5 text-right font-mono"
                          onChange={(e) => {
                            setValue(`items.${index}.rate`, parseFloat(e.target.value));
                            calcRow(index);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="number" 
                          {...register(`items.${index}.discount` as const)} 
                          className="form-control px-1 py-0.5 text-right text-red-600"
                          onChange={(e) => {
                            setValue(`items.${index}.discount`, parseFloat(e.target.value));
                            calcRow(index);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">₹{watchItems[index]?.taxable}</td>
                      <td className="px-3 py-2">
                         <div className="text-[10px] font-bold text-orange-600">{watchItems[index]?.gst_percent}%</div>
                         <div className="text-[9px] text-slate-400">₹{watchItems[index]?.gst_amt}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">₹{watchItems[index]?.total.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">
                         <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <i className="fas fa-times-circle"></i>
                         </button>
                      </td>
                    </tr>
                  ))}
                  {fields.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-slate-400 italic bg-white">
                        Cart is empty. Search products or scan barcode to add items.
                      </td>
                    </tr>
                  )}
                </tbody>
                {fields.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-right text-[10px] uppercase tracking-wider text-slate-500">Totals:</td>
                      <td className="px-3 py-3">₹{totals.taxable.toFixed(2)}</td>
                      <td className="px-3 py-3 text-orange-600">₹{totals.gst.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-lg">₹{totals.total.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        </div>

        {/* Sidebar Summary Right */}
        <div className="space-y-4">
          <div className="card shadow-sm border-0 sticky top-4">
            <div className="card-header bg-[#ff6b35] text-white py-2 text-[10px] uppercase font-bold tracking-widest text-center">
              Billing Summary
            </div>
            <div className="card-body p-0">
               <div className="divide-y divide-slate-100 text-sm">
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium font-mono">₹{totals.taxable.toFixed(2)}</span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-500">Total GST</span>
                    <span className="font-medium text-orange-600 font-mono">₹{totals.gst.toFixed(2)}</span>
                  </div>
                  <div className="px-4 py-3 bg-green-50 flex justify-between items-center">
                    <span className="text-green-700 font-bold">Total Discount</span>
                    <span className="font-bold text-green-700 font-mono">₹{totals.discount.toFixed(2)}</span>
                  </div>
                  <div className="px-4 py-3">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 text-xs font-bold uppercase">Cash Discount %</span>
                        <input 
                          type="number" 
                          {...register('cd_percent')} 
                          className="w-16 h-7 text-right border-slate-200 rounded text-xs font-bold" 
                          onChange={(e) => setValue('cd_percent', parseFloat(e.target.value))}
                        />
                     </div>
                     <div className="text-right text-[10px] text-red-500 font-bold">- ₹{cdAmt.toFixed(2)}</div>
                  </div>
                  <div className="px-4 py-4 bg-slate-900 text-white flex justify-between items-center">
                    <span className="text-xs uppercase font-bold tracking-widest">Grand Total</span>
                    <span className="text-xl font-black">₹{grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Amount Paid (₹)</label>
                    <input 
                      type="number" 
                      {...register('paid_amount')} 
                      className="form-control text-right text-lg font-black text-green-700 bg-green-50" 
                      onChange={(e) => setValue('paid_amount', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center bg-red-50">
                    <span className="text-red-700 font-bold text-xs uppercase">Balance Due</span>
                    <span className="text-lg font-black text-red-700 font-mono">₹{dueAmount.toLocaleString()}</span>
                  </div>
               </div>

               <div className="p-4 space-y-2">
                  <button className="w-full btn btn-outline-dark py-2 font-bold text-xs uppercase tracking-widest">Save Draft</button>
                  <button className="w-full btn btn-primary bg-[#28a745] hover:bg-[#218838] border-0 py-3 font-black text-sm uppercase tracking-widest shadow-lg">
                    Generate GST Invoice
                  </button>
               </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 bg-blue-600 text-white p-4">
             <div className="flex items-center space-x-3">
                <i className="fas fa-print text-2xl opacity-50"></i>
                <div>
                   <div className="font-bold text-xs uppercase">Quick Print</div>
                   <div className="text-[10px] opacity-75">Last: INV-2024-042 (₹1,240)</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
