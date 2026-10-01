import React, { useState, useEffect, useRef } from 'react';
import { inventory_api } from '../../api/inventory';
import { products_api, product_detail } from '../../api/products';
import { audit_api } from '../../api/audit';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

interface BranchInfo {
  id: number;
  unit_code: string;
  outlet_name: string;
  state?: string;
  city?: string;
  is_active: boolean;
}

interface ScannedItem {
  id: number;
  name: string;
  barcode: string;
  qty: number;
  branch_ids: number[];
}

const MultiBranchTransfer = () => {
  const user = useAuthStore(s => s.user);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  
  // Search & Scanning State
  const [barcode, setBarcode] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [pendingProduct, setPendingProduct] = useState<any | null>(null);
  const [qty, setQty] = useState<number | string>('');
  const [remarks, setRemarks] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'DRAFT' | 'CONFIRMED' | 'NEW'>('NEW');
  const [lastTrfs, setLastTrfs] = useState<string[]>([]);
  
  const barcodeRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBranches();
    focusScanner();
  }, []);

  // Search Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Only search if barcode is long enough AND we haven't already locked in a product
      if (barcode.length > 2 && !pendingProduct) {
        try {
          const res = await products_api.search(barcode);
          setSearchResults(res.data);
          setSelectedIndex(0);
        } catch (err) {
          setSearchResults([]);
        }
      } else if (barcode.length <= 2) {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [barcode, pendingProduct]);

  const loadBranches = async () => {
    try {
      const data = await inventory_api.getBranches();
      setBranches(data);
    } catch (err) {
      toast.error("Failed to load branches");
    }
  };

  const focusScanner = () => {
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  const toggleBranch = (id: number) => {
    if (sessionStatus === 'CONFIRMED') return;
    setSelectedBranches(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectProduct(searchResults[selectedIndex]);
        }
      }
    } else if (e.key === 'Enter' && barcode.trim()) {
      e.preventDefault();
      // If we already have a pending product, Enter in scan box might mean "move to qty"
      if (pendingProduct) {
         if (qtyRef.current) qtyRef.current.focus();
      } else {
         identifyProduct();
      }
    }
  };

  const identifyProduct = async () => {
    if (!barcode.trim()) return;
    if (selectedBranches.length === 0) {
      toast.error("Please select at least one branch first");
      return;
    }

    try {
      setIsLoading(true);
      let product: any = null;
      try {
        // Try direct barcode lookup
        const res = await products_api.lookup_barcode(barcode);
        product = res.data;
      } catch {
        // Try search as fallback
        const res = await products_api.search(barcode);
        if (res.data.length > 0) product = res.data[0];
      }

      if (product) {
        selectProduct(product);
      } else {
        toast.error("Product not found");
      }
    } catch (err) {
      toast.error("Error identifying product");
    } finally {
      setIsLoading(false);
    }
  };

  const selectProduct = async (product: any) => {
    try {
      setIsLoading(true);
      // Fetch full details to get latest pricing and stock
      const res = await products_api.get(product.id);
      const fullProduct = res.data;
      
      const productName = fullProduct.name || fullProduct.print_name || fullProduct.bill_print_name || 'Unnamed Product';
      const productCode = fullProduct.barcode || fullProduct.item_code || 'N/A';
      
      setPendingProduct({ ...fullProduct, name: productName, barcode: productCode });
      setBarcode(productName);
      setSearchResults([]);
      setSelectedIndex(-1);
      
      // Auto focus quantity
      if (qtyRef.current) qtyRef.current.focus();
    } catch (err) {
      toast.error("Failed to load product details");
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToTable = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingProduct) {
      identifyProduct();
      return;
    }

    const finalQty = Number(qty) || 1;
    const newItem: ScannedItem = {
      id: pendingProduct.id,
      name: pendingProduct.name,
      barcode: pendingProduct.barcode || pendingProduct.item_code || 'N/A',
      qty: finalQty,
      branch_ids: [...selectedBranches]
    };

    setScannedItems(prev => [...prev, newItem]);
    setBarcode('');
    setQty('');
    setPendingProduct(null);
    setSearchResults([]);
    focusScanner();
    toast.success(`Added ${pendingProduct.name}`);
  };

  const handleSaveDraft = async () => {
    if (scannedItems.length === 0) {
      toast.error("No items to save");
      return;
    }
    
    try {
      setIsSaving(true);
      const payload = {
        from_location_id: user?.outlet_id || 1, // Use logged in user's outlet
        remarks,
        branch_ids: selectedBranches,
        items: scannedItems.map(i => ({
          product_id: i.id,
          barcode: i.barcode,
          qty_per_branch: i.qty
        }))
      };
      
      const res = await inventory_api.saveDraft(payload);
      setSessionStatus('DRAFT');
      toast.success(`Draft saved: ${res.draft_ref_number}`);
      
      audit_api.log({
        action: 'CREATE_DRAFT',
        module: 'Multi-Branch Transfer',
        details: `Saved multi-branch transfer draft ${res.draft_ref_number}`
      });
    } catch (err) {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalConfirm = async () => {
    if (selectedBranches.length === 0 || scannedItems.length === 0) {
      toast.error("Select branches and add items before confirming");
      return;
    }

    if (!window.confirm(`Are you sure you want to generate transfers for ${selectedBranches.length} branches?`)) return;

    try {
      setIsSaving(true);
      // First save draft if new
      const payload = {
        from_location_id: 1,
        remarks,
        branch_ids: selectedBranches,
        items: scannedItems.map(i => ({
          product_id: i.id,
          barcode: i.barcode,
          qty_per_branch: i.qty
        }))
      };
      
      const session = await inventory_api.saveDraft(payload);
      const res = await inventory_api.confirmSession(session.id);
      
      setSessionStatus('CONFIRMED');
      setLastTrfs(res.data);
      toast.success(res.message);
      
      audit_api.log({
        action: 'CONFIRM_TRANSFER',
        module: 'Multi-Branch Transfer',
        details: `Generated ${res.data.length} transfers from multi-branch session`
      });
    } catch (err) {
      toast.error("Confirmation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const removeItem = (index: number) => {
    if (sessionStatus === 'CONFIRMED') return;
    setScannedItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalUnits = scannedItems.reduce((acc, item) => acc + (item.qty * item.branch_ids.length), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex justify-between items-start bg-white p-6 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary uppercase tracking-tight">Multi-branch transfer out</h1>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
              sessionStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {sessionStatus}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">Bulk stock replenishment from central warehouse</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Source Location</div>
          <div className="text-sm font-bold text-primary">Main Warehouse <span className="text-text-muted ml-2 font-mono bg-bg-app px-2 py-0.5 rounded border">WH-001</span></div>
        </div>
      </div>

      {/* Branch Selection */}
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
        <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-black text-text-primary uppercase tracking-tighter flex items-center gap-2">
          <i className="fas fa-map-marker-alt text-primary"></i> 1. Select Target Branches
        </h2>
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => setSelectedBranches(branches.map(b => b.id))}
            className="text-[10px] font-bold text-primary hover:underline uppercase"
          >
            Select All
          </button>
          <span className="text-slate-300 text-[10px]">|</span>
          <button 
            type="button" 
            onClick={() => setSelectedBranches([])}
            className="text-[10px] font-bold text-rose-500 hover:underline uppercase"
          >
            Clear
          </button>
        </div>
      </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {branches.map(branch => {
            const isSelected = selectedBranches.includes(branch.id);
            return (
              <div 
                key={branch.id}
                onClick={() => toggleBranch(branch.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 relative shadow-sm hover:shadow-md active:scale-95 ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/30 z-10' 
                    : 'border-border bg-white hover:border-primary/50'
                }`}
                style={{ 
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'white' 
                }}
              >
                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                  isSelected ? 'bg-white border-white text-primary' : 'border-text-muted bg-bg-app'
                }`}>
                  {isSelected && <i className="fas fa-check text-[10px]"></i>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-black leading-tight truncate ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                    {branch.outlet_name}
                  </div>
                  <div className={`text-[10px] font-mono mt-1 uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                    {branch.unit_code}
                  </div>
                  
                  {/* Location Info with fallback to avoid "no display" */}
                  <div className={`flex items-center gap-1.5 mt-2.5 text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-text-secondary'}`}>
                    <i className={`fas fa-map-marker-alt ${isSelected ? 'text-white/70' : 'text-primary/70'}`}></i>
                    <span className="truncate">
                      {branch.city || branch.state 
                        ? `${branch.city || ''}${branch.city && branch.state ? ', ' : ''}${branch.state || ''}`
                        : 'Location Pending'
                      }
                    </span>
                  </div>
                </div>
                
                {/* Visual indicator for selection - Green Point */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-white shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="bg-bg-app p-3 rounded-lg border border-border flex items-center gap-3">
           <i className="fas fa-info-circle text-primary"></i>
           <p className="text-[11px] font-medium text-text-secondary">
             <span className="font-bold text-primary">{selectedBranches.length} branches selected</span> — each item scanned will be sent to all selected branches with the same qty.
           </p>
        </div>
      </div>

      {/* ── TOP BAR — UNIFIED SEARCH ── */}
      <div className="bg-slate-900 dark:bg-[#0f3460] rounded-xl border border-slate-700 p-4 sticky top-0 z-40 shadow-lg mb-6">
        <div className="flex items-center gap-3">

          {/* Icon & Source */}
          <div className="flex items-center gap-3 pr-4 border-r border-slate-700">
            <div className="bg-blue-600 text-white w-11 h-11 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
              <i className="fas fa-warehouse text-lg"></i>
            </div>
            <div className="hidden lg:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Source Location</p>
              <p className="text-sm font-black text-white leading-none truncate max-w-[150px]">
                {user?.outlet_id ? `OUTLET #${user.outlet_id}` : 'HEAD OFFICE'}
              </p>
            </div>
          </div>

          {/* Unified search input */}
          <div className="flex-1 relative">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">
              📷 Scan EAN / UPC &nbsp;·&nbsp; 🔍 Search by Name, Code or Barcode — <kbd className="bg-slate-700 text-slate-300 rounded px-1 text-[9px]">↑↓</kbd> Navigate &nbsp; <kbd className="bg-slate-700 text-slate-300 rounded px-1 text-[9px]">Enter</kbd> Select
            </p>
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
              {/* Search icon */}
              <span className="pl-4 text-slate-500 shrink-0">
                {isLoading
                  ? <i className="fas fa-spinner fa-spin text-blue-400"></i>
                  : <i className="fas fa-search text-slate-500"></i>
                }
              </span>
              <input
                ref={barcodeRef}
                type="text"
                autoComplete="off"
                value={barcode}
                onChange={e => {
                   setBarcode(e.target.value);
                   if (pendingProduct) setPendingProduct(null);
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-white text-base px-3 py-2.5 outline-none placeholder-slate-600 font-mono"
                placeholder="Scan barcode OR type name / item code…"
                disabled={sessionStatus === 'CONFIRMED'}
              />
              {/* Hint when typing */}
              {barcode && searchResults.length > 0 && (
                <span className="text-slate-500 text-[10px] pr-2 shrink-0 hidden sm:block">
                  {selectedIndex >= 0 ? `${selectedIndex + 1}/${searchResults.length}` : `${searchResults.length} found`}
                </span>
              )}
              {/* Clear button */}
              {barcode && (
                <button type="button"
                  onClick={() => { setBarcode(''); setSearchResults([]); setSelectedIndex(-1); setPendingProduct(null); focusScanner(); }}
                  className="pr-3 text-slate-500 hover:text-white transition-colors shrink-0">
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {(searchResults.length > 0 && !pendingProduct) && (
              <div
                className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto"
              >
                {searchResults.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => selectProduct(item)}
                    className={`w-full text-left px-4 py-3 transition-colors border-b border-slate-800 last:border-0 flex items-center justify-between gap-2 ${
                      selectedIndex === idx ? 'bg-blue-600/30 border-blue-700/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedIndex === idx && (
                        <i className="fas fa-arrow-right text-blue-400 text-xs shrink-0"></i>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold leading-tight truncate">{item.name || item.print_name || item.bill_print_name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{item.item_code} · {item.category || 'Product'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 text-sm font-mono font-bold">₹{item.mrp || item.selling_price || '0.00'}</p>
                      <p className={`text-[10px] font-bold ${item.is_active !== false ? 'text-green-500' : 'text-rose-500'}`}>
                        {item.is_active !== false ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-32">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Quantity</p>
             <input 
                ref={qtyRef}
                type="number" 
                value={qty}
                onChange={(e) => setQty(e.target.value as any)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addItemToTable();
                    }
                }}
                min="1"
                placeholder="Qty"
                className="w-full h-11 px-4 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={sessionStatus === 'CONFIRMED'}
             />
          </div>

          <button 
            type="button"
            onClick={addItemToTable}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-6 h-11 rounded-lg font-black text-sm flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 mt-4"
            disabled={sessionStatus === 'CONFIRMED' || isLoading}
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus-circle"></i>}
            <span>ADD ITEM</span>
          </button>
        </div>

        {/* Identified Product Preview Badge */}
        {pendingProduct && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              <i className="fas fa-check-double"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-blue-100 uppercase truncate tracking-wide">Identified: {pendingProduct.name}</div>
              <div className="text-[10px] font-bold text-blue-400/80">
                CODE: {pendingProduct.item_code} · BARCODE: {pendingProduct.barcode} · MRP: ₹{pendingProduct.mrp}
              </div>
            </div>
            <div className="text-right pr-2">
               <div className="text-[10px] font-black text-blue-400 uppercase">Ready to Add</div>
               <div className="text-[9px] text-blue-300/60 font-bold">Press ENTER in Qty box</div>
            </div>
          </div>
        )}
      </div>

        {/* Scanned Items Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-app border-b border-border">
               <tr>
                 <th className="px-4 py-3 text-text-muted font-bold uppercase tracking-wider">#</th>
                 <th className="px-4 py-3 text-text-muted font-bold uppercase tracking-wider">Item Details</th>
                 <th className="px-4 py-3 text-text-muted font-bold uppercase tracking-wider text-center">Barcode</th>
                 <th className="px-4 py-3 text-text-muted font-bold uppercase tracking-wider text-center">Qty per Branch</th>
                 <th className="px-4 py-3 text-text-muted font-bold uppercase tracking-wider">Target Branches</th>
                 <th className="px-4 py-3 text-text-muted font-bold uppercase tracking-wider text-center">Action</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scannedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-muted italic bg-slate-50/30">
                    No items scanned yet. Start by selecting branches and scanning products.
                  </td>
                </tr>
              ) : (
                scannedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-bg-app/50 transition-colors">
                    <td className="px-4 py-4 text-text-muted font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                       <div className="font-bold text-text-primary text-sm">{item.name}</div>
                       <div className="text-[10px] text-text-muted mt-0.5">Product ID: {item.id}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-medium">{item.barcode}</td>
                    <td className="px-4 py-4 text-center">
                       <span className="bg-white px-3 py-1 rounded-md border border-border font-black text-primary shadow-sm">
                         {item.qty}
                       </span>
                    </td>
                    <td className="px-4 py-4">
                       <div className="flex flex-wrap gap-1">
                          {item.branch_ids.map(bid => {
                            const b = branches.find(x => x.id === bid);
                            return (
                              <span key={bid} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[9px] font-bold">
                                {b?.unit_code || bid}
                              </span>
                            );
                          })}
                       </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                       <button 
                        onClick={() => removeItem(idx)}
                        className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        disabled={sessionStatus === 'CONFIRMED'}
                       >
                         <i className="fas fa-trash-alt text-xs"></i>
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="flex items-center gap-8 py-2 px-4 bg-bg-app/50 rounded-lg border border-border text-[11px] font-bold text-text-secondary uppercase">
           <div className="flex items-center gap-2"><i className="fas fa-boxes text-primary"></i> {scannedItems.length} items</div>
           <div className="flex items-center gap-2"><i className="fas fa-store text-primary"></i> {selectedBranches.length} branches</div>
           <div className="flex items-center gap-2 text-primary font-black"><i className="fas fa-truck-loading"></i> {totalUnits} units total dispatch</div>
         </div>
      {sessionStatus !== 'NEW' || lastTrfs.length > 0 ? (
        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase flex items-center gap-2">
            <i className="fas fa-file-invoice"></i> Transfer Numbers on Save (Auto-generated per branch)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             {selectedBranches.map((bid, i) => {
               const b = branches.find(x => x.id === bid);
               return (
                 <div key={bid} className="p-3 border border-border rounded-lg bg-bg-app/30">
                    <div className="text-[10px] font-bold text-text-muted">{b?.outlet_name} · {b?.unit_code}</div>
                    <div className="text-sm font-black text-primary mt-1">
                      {lastTrfs[i] || `TRF-2026-${String(41 + i).padStart(4, '0')}`}
                    </div>
                 </div>
               );
             })}
          </div>
          {sessionStatus !== 'CONFIRMED' && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
               <i className="fas fa-exclamation-triangle text-amber-500 text-xs"></i>
               <p className="text-[10px] font-bold text-amber-700">Numbers shown are previews. Final numbers lock on Save. Draft keeps same number until saved.</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Remarks & Actions */}
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase">Remarks (optional)</h3>
        <textarea 
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Weekly stock replenishment — Maggi promo packs"
          className="w-full h-20 p-4 bg-bg-app border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary transition-all resize-none"
          disabled={sessionStatus === 'CONFIRMED'}
        />

        <div className="flex justify-end gap-3 pt-2">
           <button 
             onClick={handleSaveDraft}
             disabled={sessionStatus === 'CONFIRMED' || isSaving}
             className="px-6 py-3 bg-white border-2 border-border text-text-primary font-black rounded-xl hover:bg-bg-app transition-all flex items-center gap-2 disabled:opacity-50"
           >
             <i className="fas fa-save"></i> Save Draft
           </button>
           <button 
             onClick={handleFinalConfirm}
             disabled={sessionStatus === 'CONFIRMED' || isSaving}
             className="px-8 py-3 bg-primary text-white font-black rounded-xl shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
           >
             {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
             Save & Generate Transfers
           </button>
           
           {sessionStatus === 'CONFIRMED' && (
             <button 
               onClick={() => window.location.reload()}
               className="px-8 py-3 bg-green-600 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2"
             >
               <i className="fas fa-plus"></i> New Multi-Branch Transfer
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default MultiBranchTransfer;
