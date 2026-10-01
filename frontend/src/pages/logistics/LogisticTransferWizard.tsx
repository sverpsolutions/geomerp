import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Truck, Package, Box, User, Printer, CheckCircle, 
  ChevronRight, ChevronLeft, Search, Plus, Trash2, 
  AlertCircle, Barcode, QrCode, FileSearch
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { masters_api } from '../../api/masters';
import { products_api } from '../../api/products';
import { 
  createLogisticTransfer, getLogisticTransfer, updateLogisticItems, 
  createLogisticBox, updateDispatchDetails, confirmDispatch, markBoxPrinted,
  lookupSourceTransfers, getSourceTransferDetails
} from '../../api/logistic';
import BarcodeComponent from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

const STEPS = [
  { id: 1, title: 'Transfer Details', icon: Truck },
  { id: 2, title: 'Select Items', icon: Package },
  { id: 3, title: 'Pack Boxes', icon: Box },
  { id: 4, title: 'Vehicle & Driver', icon: User },
  { id: 5, title: 'Print Labels', icon: Printer },
  { id: 6, title: 'Dispatch', icon: CheckCircle },
];

const LogisticTransferWizard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [transfer, setTransfer] = useState<any>(null);
  
  // Form States
  const [outlets, setOutlets] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [notes, setNotes] = useState('');
  const [sourceTransferId, setSourceTransferId] = useState<number | null>(null);
  const [sourceTransferSearch, setSourceTransferSearch] = useState('');
  const [sourceTransferResults, setSourceTransferResults] = useState<any[]>([]);

  // Step 2 State
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Step 3 State
  const [boxes, setBoxes] = useState<any[]>([]);
  const [currentBox, setCurrentBox] = useState<any>({
    box_number: '',
    weight_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    seal_number: '',
    box_type: 'Cardboard',
    items: []
  });

  // Step 4 State
  const [dispatchInfo, setDispatchInfo] = useState({
    vehicle_reg_no: '',
    vehicle_type: '',
    gps_tracking_id: '',
    eta: '',
    driver_name: '',
    driver_mobile: '',
    driver_license_no: '',
    helper_name: ''
  });

  useEffect(() => {
    fetchOutlets();
    if (id) {
      loadTransfer(parseInt(id));
    }
  }, [id]);

  const fetchOutlets = async () => {
    try {
      const res = await masters_api.get_outlets();
      setOutlets(res.data || []);
    } catch (err) {
      toast.error('Failed to load outlets');
    }
  };

  const loadTransfer = async (transferId: number) => {
    setLoading(true);
    try {
      const res = await getLogisticTransfer(transferId);
      setTransfer(res);
      setSourceId(res.source_location_id.toString());
      setDestId(res.destination_location_id.toString());
      setPriority(res.priority);
      setNotes(res.notes || '');
      setSourceTransferId(res.source_transfer_id);
      setSelectedItems(res.items || []);
      setBoxes(res.boxes || []);
      if (res.dispatch_details) {
        setDispatchInfo(res.dispatch_details);
      }
      
      // Determine step based on status
      if (res.status === 'DRAFT') setCurrentStep(1);
      else if (res.status === 'PACKING') setCurrentStep(3);
      else if (res.status === 'PACKED') setCurrentStep(4);
      else if (res.status === 'DISPATCHED') setCurrentStep(6);
    } catch (err) {
      toast.error('Failed to load transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleSourceTransferSearch = async (q: string) => {
    setSourceTransferSearch(q);
    if (q.length < 3) return setSourceTransferResults([]);
    try {
      const res = await lookupSourceTransfers(q);
      setSourceTransferResults(res || []);
    } catch (err) {}
  };

  const selectSourceTransfer = async (trf: any) => {
    setLoading(true);
    try {
      const details = await getSourceTransferDetails(trf.id);
      setSourceId(details.from_outlet_id.toString());
      setDestId(details.to_outlet_id.toString());
      setNotes(details.remarks || '');
      setSourceTransferId(details.id);
      setSourceTransferSearch(details.transfer_no);
      setSourceTransferResults([]);
      
      // Map items for step 2
      setSelectedItems(details.items.map((i: any) => ({
        ...i,
        quantity: parseFloat(i.quantity)
      })));
      
      toast.success(`Loaded items from ${details.transfer_no}`);
    } catch (err) {
      toast.error('Failed to load transfer details');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!sourceId || !destId) return toast.error('Please select locations');
      setLoading(true);
      try {
        const data = {
          source_location_id: parseInt(sourceId),
          destination_location_id: parseInt(destId),
          priority,
          notes,
          source_transfer_id: sourceTransferId,
          items: selectedItems // Pass pre-filled items
        };
        const res = await createLogisticTransfer(data);
        setTransfer(res);
        navigate(`/logistics/transfer/${res.id}`);
        setCurrentStep(2);
      } catch (err) {
        toast.error('Failed to create transfer');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 2) {
      if (selectedItems.length === 0) return toast.error('Please select at least one item');
      setLoading(true);
      try {
        await updateLogisticItems(transfer.id, selectedItems.map(i => ({ 
          product_id: i.product_id || i.id, 
          quantity: i.quantity 
        })));
        setCurrentStep(3);
      } catch (err) {
        toast.error('Failed to update items');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 3) {
      if (boxes.length === 0) return toast.error('Please pack at least one box');
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!dispatchInfo.vehicle_reg_no || !dispatchInfo.driver_name) return toast.error('Please fill vehicle and driver details');
      setLoading(true);
      try {
        await updateDispatchDetails(transfer.id, dispatchInfo);
        setCurrentStep(5);
      } catch (err) {
        toast.error('Failed to update dispatch details');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 5) {
      setCurrentStep(6);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // --- Step 2 Helpers ---
  const searchItems = async (q: string) => {
    if (q.length < 2) return setSearchResults([]);
    try {
      const res = await products_api.search(q);
      setSearchResults(res.data || []);
    } catch (err) {}
  };

  const addItem = (product: any) => {
    const exists = selectedItems.find(i => i.id === product.id || i.product_id === product.id);
    if (exists) {
      toast.error('Item already added');
      return;
    }
    setSelectedItems([...selectedItems, { ...product, product_id: product.id, quantity: 1 }]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeItem = (id: number) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id && i.product_id !== id));
  };

  // --- Step 3 Helpers ---
  const addBox = async () => {
    if (!currentBox.box_number) return toast.error('Box number is required');
    if (currentBox.items.length === 0) return toast.error('Box cannot be empty');
    
    setLoading(true);
    try {
      const res = await createLogisticBox(transfer.id, currentBox);
      setBoxes([...boxes, res]);
      setCurrentBox({
        box_number: '',
        weight_kg: '',
        length_cm: '',
        width_cm: '',
        height_cm: '',
        seal_number: '',
        box_type: 'Cardboard',
        items: []
      });
      toast.success('Box created');
    } catch (err) {
      toast.error('Failed to create box');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchConfirm = async () => {
    setLoading(true);
    try {
      await confirmDispatch(transfer.id);
      toast.success('Transfer Dispatched Successfully!');
      loadTransfer(transfer.id);
    } catch (err) {
      toast.error('Dispatch confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Renderers ---
  const renderStepHeader = () => (
    <div className="flex justify-between items-center bg-white p-6 border-b border-slate-200">
      <div className="flex gap-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isActive ? 'bg-primary text-white scale-110 shadow-lg' : 
                isCompleted ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-800">Logistic Transfer</h1>
        <p className="text-slate-500 text-xs">Step {currentStep} of 6 — {STEPS[currentStep-1].title}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {renderStepHeader()}

      <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Truck className="text-primary" /> Transfer Details
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="form-label">Source Warehouse</label>
                <select className="form-input" value={sourceId} onChange={e => setSourceId(e.target.value)}>
                  <option value="">Select Source</option>
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.outlet_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Destination Outlet</label>
                <select className="form-input" value={destId} onChange={e => setDestId(e.target.value)}>
                  <option value="">Select Destination</option>
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.outlet_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Priority Level</label>
                <select className="form-input" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Express">Express</option>
                </select>
              </div>
              <div>
                <label className="form-label">Transfer Date</label>
                <input type="date" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Internal Notes</label>
                <textarea className="form-input h-24" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any specific instructions for logistics team..." />
              </div>
              
              <div className="col-span-2 mt-4 bg-primary/5 p-6 rounded-xl border border-primary/10">
                <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                  <FileSearch size={18} /> Link to Existing Transfer Out (Optional)
                </h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    className="form-input pl-10 h-11" 
                    placeholder="Search Transfer Out Number (e.g. TRF-2026-0001)..."
                    value={sourceTransferSearch}
                    onChange={e => handleSourceTransferSearch(e.target.value)}
                  />
                  
                  {sourceTransferResults.length > 0 && (
                    <div className="absolute z-20 w-full bg-white mt-1 rounded-lg shadow-xl border border-slate-200 max-h-48 overflow-auto">
                      {sourceTransferResults.map(trf => (
                        <button 
                          key={trf.id}
                          onClick={() => selectSourceTransfer(trf)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{trf.transfer_no}</div>
                            <div className="text-[10px] text-slate-400">Date: {trf.transfer_date}</div>
                          </div>
                          <ChevronRight size={16} className="text-primary" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">Selecting an existing transfer will automatically fill locations and items.</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Package className="text-primary" /> Select Items
            </h2>
            
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                className="form-input pl-10 h-12 text-base" 
                placeholder="Search items by name, SKU or scan barcode..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  searchItems(e.target.value);
                }}
              />
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white mt-1 rounded-lg shadow-xl border border-slate-200 max-h-60 overflow-auto">
                  {searchResults.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.item_code} · {p.barcode}</div>
                      </div>
                      <div className="text-primary"><Plus size={18} /></div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <table className="ent-table rounded-lg overflow-hidden border border-slate-200">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Quantity</th>
                  <th className="w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map(item => (
                  <tr key={item.id || item.product_id}>
                    <td>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.item_code}</div>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-input w-24" 
                        value={item.quantity} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          setSelectedItems(selectedItems.map(i => (i.id === item.id || i.product_id === item.product_id) ? { ...i, quantity: val } : i));
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <button onClick={() => removeItem(item.id || item.product_id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {selectedItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-slate-400">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      No items selected yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit sticky top-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Box className="text-primary" /> Create Box
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Box Number / ID</label>
                  <input type="text" className="form-input" placeholder="e.g. BOX-001" value={currentBox.box_number} onChange={e => setCurrentBox({...currentBox, box_number: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Weight (KG)</label>
                  <input type="number" className="form-input" placeholder="0.00" value={currentBox.weight_kg} onChange={e => setCurrentBox({...currentBox, weight_kg: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="form-label">L (cm)</label>
                    <input type="number" className="form-input" value={currentBox.length_cm} onChange={e => setCurrentBox({...currentBox, length_cm: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">W (cm)</label>
                    <input type="number" className="form-input" value={currentBox.width_cm} onChange={e => setCurrentBox({...currentBox, width_cm: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">H (cm)</label>
                    <input type="number" className="form-input" value={currentBox.height_cm} onChange={e => setCurrentBox({...currentBox, height_cm: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Seal Number</label>
                  <input type="text" className="form-input" value={currentBox.seal_number} onChange={e => setCurrentBox({...currentBox, seal_number: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Box Type</label>
                  <select className="form-input" value={currentBox.box_type} onChange={e => setCurrentBox({...currentBox, box_type: e.target.value})}>
                    <option value="Cardboard">Cardboard Box</option>
                    <option value="Wooden Crate">Wooden Crate</option>
                    <option value="Plastic Bin">Plastic Bin</option>
                    <option value="Pallet">Pallet</option>
                  </select>
                </div>
                <div className="pt-4">
                  <h3 className="text-xs font-bold uppercase mb-2">Assign Items to this Box</h3>
                  <div className="max-h-40 overflow-auto border rounded-lg p-2 bg-slate-50">
                    {selectedItems.map(item => {
                      const packedQty = boxes.reduce((sum, b) => sum + (b.items.find((i: any) => i.product_id === (item.product_id || item.id))?.quantity || 0), 0);
                      const remaining = item.quantity - packedQty;
                      const inCurrent = currentBox.items.find((i: any) => i.product_id === (item.product_id || item.id))?.quantity || 0;
                      
                      return (
                        <div key={item.id || item.product_id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold truncate">{item.name}</div>
                            <div className="text-[10px] text-slate-400">Rem: {remaining} {item.unit}</div>
                          </div>
                          <input 
                            type="number" 
                            className="form-input w-16 h-7 text-[11px] p-1" 
                            max={remaining + inCurrent}
                            min={0}
                            value={inCurrent || ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val > (remaining + inCurrent)) return;
                              const newItems = [...currentBox.items];
                              const idx = newItems.findIndex((i: any) => i.product_id === (item.product_id || item.id));
                              if (idx >= 0) {
                                if (val === 0) newItems.splice(idx, 1);
                                else newItems[idx].quantity = val;
                              } else if (val > 0) {
                                newItems.push({ product_id: item.product_id || item.id, name: item.name, quantity: val });
                              }
                              setCurrentBox({ ...currentBox, items: newItems });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={addBox} className="btn btn-primary w-full h-10 mt-2">
                  <Plus size={16} /> Save Box
                </button>
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Packed Boxes ({boxes.length})
              </h2>
              {boxes.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                  No boxes created yet. Use the form on the left to start packing.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {boxes.map((box, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-800 p-3 flex justify-between items-center">
                      <span className="text-white font-bold text-sm">#{box.box_number}</span>
                      <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded uppercase font-bold">{box.box_type}</span>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 text-[10px] text-slate-500 mb-3 uppercase tracking-wider font-bold">
                        <div>Weight: <span className="text-slate-800">{box.weight_kg} KG</span></div>
                        <div>Seal: <span className="text-slate-800">{box.seal_number || 'N/A'}</span></div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <table className="w-full text-[11px]">
                          <tbody>
                            {box.items.map((item: any, iidx: number) => (
                              <tr key={iidx} className="border-b last:border-0">
                                <td className="py-1">{item.name || 'Product'}</td>
                                <td className="py-1 text-right font-bold">{item.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User className="text-primary" /> Vehicle & Driver Details
            </h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-slate-400 border-b pb-2">Vehicle Information</h3>
                <div>
                  <label className="form-label">Registration Number</label>
                  <input type="text" className="form-input" placeholder="DL 01 AB 1234" value={dispatchInfo.vehicle_reg_no} onChange={e => setDispatchInfo({...dispatchInfo, vehicle_reg_no: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Vehicle Type</label>
                  <input type="text" className="form-input" placeholder="Tata Ace / Eicher 14ft / etc." value={dispatchInfo.vehicle_type} onChange={e => setDispatchInfo({...dispatchInfo, vehicle_type: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">GPS Tracking ID</label>
                  <input type="text" className="form-input" placeholder="SIM/Device ID" value={dispatchInfo.gps_tracking_id} onChange={e => setDispatchInfo({...dispatchInfo, gps_tracking_id: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Estimated Time of Arrival (ETA)</label>
                  <input type="datetime-local" className="form-input" value={dispatchInfo.eta} onChange={e => setDispatchInfo({...dispatchInfo, eta: e.target.value})} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-slate-400 border-b pb-2">Driver & Helper</h3>
                <div>
                  <label className="form-label">Driver Full Name</label>
                  <input type="text" className="form-input" value={dispatchInfo.driver_name} onChange={e => setDispatchInfo({...dispatchInfo, driver_name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Driver Mobile</label>
                  <input type="text" className="form-input" value={dispatchInfo.driver_mobile} onChange={e => setDispatchInfo({...dispatchInfo, driver_mobile: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Driving License No.</label>
                  <input type="text" className="form-input" value={dispatchInfo.driver_license_no} onChange={e => setDispatchInfo({...dispatchInfo, driver_license_no: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Helper Name (Optional)</label>
                  <input type="text" className="form-input" value={dispatchInfo.helper_name} onChange={e => setDispatchInfo({...dispatchInfo, helper_name: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Printer className="text-primary" /> Print Box Labels
              </h2>
              <button onClick={() => window.print()} className="btn btn-primary">
                <Printer size={16} /> Print All Labels
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {boxes.map((box, idx) => (
                <div key={idx} className="bg-white p-6 border border-slate-200 rounded-xl flex gap-6 label-print-area">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-[10px] uppercase font-bold text-slate-400">Box ID</h4>
                        <p className="text-xl font-black text-slate-900">{box.box_number}</p>
                      </div>
                      <div className="text-right">
                        <h4 className="text-[10px] uppercase font-bold text-slate-400">Transfer ID</h4>
                        <p className="text-xs font-bold text-slate-700">{transfer?.transfer_number}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 uppercase">From:</span>
                        <span className="font-bold">{outlets.find(o => o.id.toString() === sourceId)?.outlet_name}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 uppercase">To:</span>
                        <span className="font-bold">{outlets.find(o => o.id.toString() === destId)?.outlet_name}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 uppercase">Weight:</span>
                        <span className="font-bold">{box.weight_kg} KG</span>
                      </div>
                    </div>

                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase text-slate-400 font-bold">Seal Number:</span>
                        <span className="text-[10px] font-bold">{box.seal_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-32 flex flex-col items-center gap-4 justify-center border-l pl-6">
                    <QRCodeSVG value={`${transfer?.transfer_number}-${box.box_number}`} size={64} />
                    <div className="scale-[0.6] origin-top">
                      <BarcodeComponent value={box.box_number} height={40} fontSize={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
              <h2 className="text-2xl font-black text-green-800">Ready for Dispatch</h2>
              <p className="text-green-600 mt-2">All steps completed. Review the summary below and confirm dispatch.</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold uppercase text-xs text-slate-400 mb-4 border-b pb-2">Shipment Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transfer No:</span>
                    <span className="font-bold">{transfer?.transfer_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Items:</span>
                    <span className="font-bold">{selectedItems.length} Products</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Boxes:</span>
                    <span className="font-bold">{boxes.length} Packed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="font-bold">{outlets.find(o => o.id.toString() === destId)?.outlet_name}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold uppercase text-xs text-slate-400 mb-4 border-b pb-2">Vehicle & Driver</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reg No:</span>
                    <span className="font-bold">{dispatchInfo.vehicle_reg_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Driver:</span>
                    <span className="font-bold">{dispatchInfo.driver_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile:</span>
                    <span className="font-bold">{dispatchInfo.driver_mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ETA:</span>
                    <span className="font-bold">{dispatchInfo.eta ? new Date(dispatchInfo.eta).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold uppercase text-xs text-slate-400 mb-4 border-b pb-2">Shipment Timeline</h3>
              <div className="space-y-6 pl-4 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                {transfer?.timeline?.map((event: any, idx: number) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{event.event}</span>
                      <span className="text-[10px] text-slate-400">{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {transfer?.status !== 'DISPATCHED' && (
              <button 
                onClick={handleDispatchConfirm}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-black text-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
              >
                <Truck size={24} /> CONFIRM & DISPATCH SHIPMENT
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-12 shrink-0">
        <button 
          onClick={handleBack} 
          disabled={currentStep === 1 || loading}
          className="btn btn-secondary h-12 px-8 flex items-center gap-2 disabled:opacity-30"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex gap-4">
          <button onClick={() => navigate('/logistics/list')} className="btn btn-secondary h-12">
            Save as Draft
          </button>
          {currentStep < 6 && (
            <button 
              onClick={handleNext} 
              disabled={loading}
              className="btn btn-primary h-12 px-12 flex items-center gap-2 min-w-[160px]"
            >
              {loading ? 'Processing...' : (
                <>Next Step <ChevronRight size={18} /></>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .label-print-area, .label-print-area * { visibility: visible; }
          .label-print-area { 
            position: absolute; 
            left: 0; top: 0; 
            width: 100%;
            border: 1px solid #000;
            margin-bottom: 20px;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default LogisticTransferWizard;
