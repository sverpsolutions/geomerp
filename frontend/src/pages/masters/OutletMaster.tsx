import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSyncStore } from '../../store/syncStore';

const API_BASE = 'http://localhost:8000/api/v1';

const OutletMaster = () => {
  const [showModal, setShowModal] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionData, setConnectionData] = useState<any>(null);
  
  const { runningOutlets, globalStatus } = useSyncStore();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    setImportResult(null);
    try {
      const res = await axios.post(`${API_BASE}/import-export/import/locations`, formData);
      setImportResult(res.data);
      fetchOutlets();
    } catch (err: any) {
      alert(`Import failed: ${formatError(err)}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    window.open(`${API_BASE}/import-export/template/locations`, '_blank');
  };
  
  const [formData, setFormData] = useState({
    outlet_name: '',
    unit_code: '',
    outlet_code: '',
    short_name: '',
    company_name: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    address: '',
    landmark: '',
    manager_name: '',
    manager_mobile: '',
    manager_email: '',
    store_phone: '',
    whatsapp_number: '',
    emergency_contact: '',
    gst_number: '',
    pan_number: '',
    latitude: '',
    longitude: '',
    map_link: '',
    store_type: 'T1',
    store_category: 'Supermarket',
    store_size: '',
    opening_date: '',
    store_timing: '',
    is_delivery_available: false,
    is_online_order_available: false,
    notes: '',
    price_update_level: 'All Store Level',
    server_name: '',
    database_name: '',
    db_username: 'postgres',
    db_password: '',
    type: 'O',
    is_active: true
  });
  const [activeTab, setActiveTab] = useState('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const res = await axios.get(`${API_BASE}/outlets`);
      setOutlets(res.data);
    } catch (err) {
      console.error("Failed to fetch outlets", err);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async (id: number) => {
    setCheckingId(id);
    setConnectionData(null);
    try {
      const res = await axios.post(`${API_BASE}/outlets/test-connection/${id}`);
      if (res.data.success) {
        setConnectionData({ id, info: res.data.data.sample_info });
        alert(`Success! ${res.data.data.sample_info}`);
      } else {
        alert(`Connection Failed: ${res.data.error}`);
      }
      fetchOutlets(); // Refresh status
    } catch (err: any) {
      alert(`Error: ${formatError(err)}`);
    } finally {
      setCheckingId(null);
    }
  };

  const handleEdit = (o: any) => {
    setEditId(o.id);
    setFormData({
      outlet_name: o.outlet_name || '',
      unit_code: o.unit_code || '',
      outlet_code: o.outlet_code || '',
      short_name: o.short_name || '',
      company_name: o.company_name || '',
      city: o.city || '',
      state: o.state || '',
      country: o.country || 'India',
      pincode: o.pincode || '',
      address: o.address || '',
      landmark: o.landmark || '',
      manager_name: o.manager_name || '',
      manager_mobile: o.manager_mobile || '',
      manager_email: o.manager_email || '',
      store_phone: o.store_phone || '',
      whatsapp_number: o.whatsapp_number || '',
      emergency_contact: o.emergency_contact || '',
      gst_number: o.gst_number || '',
      pan_number: o.pan_number || '',
      latitude: o.latitude || '',
      longitude: o.longitude || '',
      map_link: o.map_link || '',
      store_type: o.store_type || 'T1',
      store_category: o.store_category || 'Supermarket',
      store_size: o.store_size || '',
      opening_date: o.opening_date ? o.opening_date.split('T')[0] : '',
      store_timing: o.store_timing || '',
      is_delivery_available: o.is_delivery_available || false,
      is_online_order_available: o.is_online_order_available || false,
      notes: o.notes || '',
      price_update_level: o.price_update_level || 'All Store Level',
      server_name: o.server_name || '',
      database_name: o.database_name || '',
      db_username: o.db_username || 'postgres',
      db_password: o.db_password || '',
      type: o.type || 'O',
      is_active: o.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this outlet?")) return;
    try {
      await axios.delete(`${API_BASE}/outlets/${id}`);
      fetchOutlets();
    } catch (err) {
      alert("Failed to delete outlet");
    }
  };

  const parseMapLink = () => {
    if (!formData.map_link) return;
    // Simple regex to extract lat,long from @lat,long format in Google Maps URLs
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = formData.map_link.match(regex);
    if (match) {
      setFormData({ ...formData, latitude: match[1], longitude: match[2] });
    } else {
      alert("Could not extract coordinates. Please ensure the link is a standard Google Maps URL.");
    }
  };

  const sendWhatsApp = (o: any) => {
    const text = `*Store Details: ${o.outlet_name}*\nAddress: ${o.address || 'N/A'}\nCity: ${o.city || 'N/A'}\nManager: ${o.manager_name || 'N/A'}\nPhone: ${o.store_phone || 'N/A'}\nLocation: ${o.map_link || 'N/A'}`;
    const url = `https://wa.me/${o.whatsapp_number || o.manager_mobile}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const exportExcel = () => {
    alert("Exporting to Excel...");
    // Implementation for excel export would go here
  };

  const exportPDF = () => {
    alert("Exporting to PDF...");
    // Implementation for PDF export would go here
  };

  const filteredOutlets = outlets.filter(o => {
    const matchesSearch = (o.outlet_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                        (o.unit_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                        (o.manager_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCity = !filterCity || o.city === filterCity;
    const matchesType = !filterType || o.store_type === filterType;
    return matchesSearch && matchesCity && matchesType;
  });

  const formatError = (err: any) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('\n');
    }
    if (typeof detail === 'object' && detail !== null) {
      return JSON.stringify(detail);
    }
    return err.message || "An unexpected error occurred";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize data: convert empty strings to null for optional fields like dates
    const dataToSend = {
      ...formData,
      opening_date: formData.opening_date || null
    };

    try {
      if (editId) {
        await axios.put(`${API_BASE}/outlets/${editId}`, dataToSend);
        alert("Outlet updated successfully!");
      } else {
        await axios.post(`${API_BASE}/outlets`, dataToSend);
        alert("Outlet registered successfully!");
      }
      setShowModal(false);
      setEditId(null);
      fetchOutlets();
    } catch (err: any) {
      alert(`Error: ${formatError(err)}`);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black flex items-center text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mr-3 shadow-lg shadow-indigo-200">
              <i className="fas fa-store"></i>
            </div>
            OUTLET MASTER
          </h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1 opacity-70">
            Advanced Location & Store Management System
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportExcel} className="bg-emerald-50 text-emerald-600 font-bold py-2 px-4 rounded-xl hover:bg-emerald-100 transition-all flex items-center text-xs border border-emerald-100">
            <i className="fas fa-file-excel mr-2"></i> Excel
          </button>
          <button onClick={exportPDF} className="bg-rose-50 text-rose-600 font-bold py-2 px-4 rounded-xl hover:bg-rose-100 transition-all flex items-center text-xs border border-rose-100">
            <i className="fas fa-file-pdf mr-2"></i> PDF
          </button>
          <button onClick={() => setShowImportModal(true)} className="bg-amber-50 text-amber-600 font-bold py-2 px-4 rounded-xl hover:bg-amber-100 transition-all flex items-center text-xs border border-amber-100">
            <i className="fas fa-file-import mr-2"></i> Bulk Import
          </button>
          <button 
            onClick={() => {
              setEditId(null);
              setFormData({ 
                outlet_name: '', unit_code: '', outlet_code: '', short_name: '', company_name: '',
                city: '', state: '', country: 'India', pincode: '', address: '', landmark: '',
                manager_name: '', manager_mobile: '', manager_email: '', store_phone: '', whatsapp_number: '', emergency_contact: '',
                gst_number: '', pan_number: '', latitude: '', longitude: '', map_link: '',
                store_type: 'T1', store_category: 'Supermarket', store_size: '', opening_date: '', store_timing: '',
                is_delivery_available: false, is_online_order_available: false, notes: '',
                price_update_level: 'All Store Level', server_name: '', database_name: '', db_username: 'postgres', db_password: '', type: 'O', is_active: true 
              });
              setShowModal(true);
            }}
            className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center text-sm"
          >
            <i className="fas fa-plus-circle mr-2 text-lg"></i> ADD NEW OUTLET
          </button>
        </div>
      </div>

      {/* Global Sync Notification */}
      {globalStatus && (
        <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-bounce-slow">
           <div className="flex items-center gap-3">
              <i className="fas fa-sync-alt fa-spin text-xl"></i>
              <div>
                 <p className="text-xs font-black uppercase tracking-widest">Global Synchronization Active</p>
                 <p className="text-[10px] font-bold text-indigo-200">{globalStatus}</p>
              </div>
           </div>
           <div className="flex gap-2">
              <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase">Processing Stores</span>
           </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            type="text" 
            placeholder="Search by name, code or manager..." 
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="bg-slate-50 border-none rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 transition-all"
          value={filterCity}
          onChange={e => setFilterCity(e.target.value)}
        >
          <option value="">All Cities</option>
          {Array.from(new Set(outlets.map(o => o.city).filter(Boolean))).map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <select 
          className="bg-slate-50 border-none rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 transition-all"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Store Types</option>
          <option value="T1">Type T1 (Large)</option>
          <option value="T2">Type T2 (Medium)</option>
          <option value="T3">Type T3 (Small)</option>
        </select>
        <div className="flex gap-2">
           <button className="flex-1 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-100 transition-all">
              <i className="fas fa-sync mr-1"></i> Sync All
           </button>
           <button className="flex-1 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all" onClick={() => {setSearchQuery(''); setFilterCity(''); setFilterType('');}}>
              Reset
           </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredOutlets.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <i className="fas fa-store-slash text-5xl text-slate-200 mb-4"></i>
            <p className="text-slate-400 font-bold">No outlets found matching your criteria.</p>
          </div>
        ) : filteredOutlets.map(o => {
          const isSyncing = runningOutlets[o.id];
          return (
          <div key={o.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 border border-slate-100 transition-all duration-300 flex flex-col relative">
            {/* Progress Bar */}
            {isSyncing && (
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 z-20">
                <div className="h-full bg-indigo-600 animate-progress-indeterminate"></div>
              </div>
            )}
            
            {/* Store Top Section */}
            <div className="relative p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/30">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${o.is_active ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'}`}>
                    {o.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {isSyncing && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white animate-pulse">
                      SYNCING...
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(o)} className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    <i className="fas fa-edit text-xs"></i>
                  </button>
                  <button onClick={() => sendWhatsApp(o)} className="w-8 h-8 rounded-full bg-white text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm">
                    <i className="fab fa-whatsapp text-xs"></i>
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-1 truncate">{o.outlet_name}</h3>
              <div className="flex items-center gap-2">
                <code className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded text-indigo-600 border border-indigo-100">{o.unit_code}</code>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{o.store_type || 'T1'} • {o.city || 'GENERIC'}</span>
              </div>
            </div>

            {/* Store Details Section */}
            <div className="p-5 space-y-4 flex-grow">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                  <i className="fas fa-map-marker-alt text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Address</p>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2">{o.address || 'Address not updated'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                  <i className="fas fa-user-tie text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Manager</p>
                  <p className="text-xs text-slate-600 font-medium">{o.manager_name || 'Not Assigned'}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{o.manager_mobile || o.store_phone || 'No Contact'}</p>
                </div>
              </div>

              {/* Status Icons */}
              <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-50">
                <div title="Database Link" className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${o.is_connected ? 'text-green-600 bg-green-50' : 'text-rose-600 bg-rose-50'}`}>
                  <i className={`fas ${o.is_connected ? 'fa-plug' : 'fa-unplug'}`}></i> {o.is_connected ? 'Online' : 'Offline'}
                </div>
                {o.is_delivery_available && (
                  <div title="Delivery Available" className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-indigo-600 bg-indigo-50">
                    <i className="fas fa-truck"></i> Delivery
                  </div>
                )}
                {o.is_online_order_available && (
                  <div title="Online Ordering" className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-amber-600 bg-amber-50">
                    <i className="fas fa-globe"></i> Online
                  </div>
                )}
              </div>
            </div>

            {/* Store Bottom Action */}
            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => checkConnection(o.id)}
                disabled={checkingId === o.id}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center transition-all disabled:opacity-50"
              >
                {checkingId === o.id ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-link mr-2"></i>}
                Check Status
              </button>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${o.unit_code}`} 
                className="w-8 h-8 rounded border border-slate-200 bg-white p-0.5" 
                alt="QR Code"
                onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${o.unit_code}`, '_blank')}
              />
            </div>
          </div>
        )})}
      </div>

      {/* Modal - REDESIGNED TABBED INTERFACE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">{editId ? 'Edit Outlet Profile' : 'Register New Outlet'}</h3>
                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">
                  {editId ? `Editing unit: ${formData.unit_code}` : 'Enter complete store details below'}
                </p>
              </div>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar px-6">
              {['General', 'Address & Map', 'Contact', 'Tax & Ops', 'Price Control'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                    activeTab === tab 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="p-8 space-y-6">
                
                {/* ── TAB: GENERAL ── */}
                {activeTab === 'General' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Outlet Name <span className="text-rose-500">*</span></label>
                        <input required type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.outlet_name} onChange={e => setFormData({...formData, outlet_name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Unit Code <span className="text-rose-500">*</span></label>
                          <input required type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-mono font-bold text-indigo-600 uppercase" value={formData.unit_code} onChange={e => setFormData({...formData, unit_code: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Short Name</label>
                          <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.short_name} onChange={e => setFormData({...formData, short_name: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Company Name</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center">
                          <i className="fas fa-database mr-2 text-lg"></i> DB Connection Settings
                       </p>
                       <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">Server / IP</label>
                          <input required type="text" className="w-full bg-white border-none rounded-xl p-3 text-sm font-mono font-bold text-indigo-800" value={formData.server_name} onChange={e => setFormData({...formData, server_name: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">Database Name</label>
                          <input required type="text" className="w-full bg-white border-none rounded-xl p-3 text-sm font-mono font-bold text-indigo-800" value={formData.database_name} onChange={e => setFormData({...formData, database_name: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">Type</label>
                          <select className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-indigo-800" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                            <option value="O">Standard Outlet</option>
                            <option value="H">Head Office / Hub</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">DB User</label>
                          <input type="text" className="w-full bg-white border-none rounded-xl p-3 text-sm font-mono font-bold text-indigo-800" value={formData.db_username} onChange={e => setFormData({...formData, db_username: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">DB Password</label>
                          <input type="password" placeholder="••••••••" className="w-full bg-white border-none rounded-xl p-3 text-sm font-mono font-bold text-indigo-800" value={formData.db_password} onChange={e => setFormData({...formData, db_password: e.target.value})} />
                        </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* ── TAB: ADDRESS & MAP ── */}
                {activeTab === 'Address & Map' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Full Address</label>
                        <textarea rows={3} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Landmark</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 mt-2" value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">City</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">State</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Country</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Pincode</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                      </div>
                    </div>

                    <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 space-y-4">
                       <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center">
                            <i className="fas fa-map-marked-alt mr-2 text-lg"></i> Geolocation Settings
                          </p>
                          <button type="button" onClick={parseMapLink} className="bg-white text-rose-600 font-black text-[9px] px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm hover:bg-rose-100 transition-all uppercase">
                             Auto-Fetch Lat/Long
                          </button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block">Google Maps Location Link</label>
                            <input type="text" placeholder="Paste link here..." className="w-full bg-white border-none rounded-xl p-3 text-sm font-mono text-rose-800" value={formData.map_link} onChange={e => setFormData({...formData, map_link: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block">Latitude</label>
                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 text-sm font-mono font-bold text-rose-800" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5 block">Longitude</label>
                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 text-sm font-mono font-bold text-rose-800" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* ── TAB: CONTACT ── */}
                {activeTab === 'Contact' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 border-b pb-2">Store Management</p>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Manager Name</label>
                            <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.manager_name} onChange={e => setFormData({...formData, manager_name: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Manager Mobile</label>
                              <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.manager_mobile} onChange={e => setFormData({...formData, manager_mobile: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Manager Email</label>
                              <input type="email" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.manager_email} onChange={e => setFormData({...formData, manager_email: e.target.value})} />
                            </div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-4 border-b pb-2">Store Contacts</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Store Phone</label>
                              <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.store_phone} onChange={e => setFormData({...formData, store_phone: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">WhatsApp Number</label>
                              <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 block font-black">Emergency Contact Number</label>
                            <input type="text" className="w-full bg-rose-50 border-none rounded-xl p-3 text-sm font-bold text-rose-700" value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} />
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* ── TAB: TAX & OPS ── */}
                {activeTab === 'Tax & Ops' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 border-b pb-2">Compliance Details</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">GST Number</label>
                              <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-mono font-bold text-slate-700 uppercase" value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">PAN Number</label>
                              <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-mono font-bold text-slate-700 uppercase" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} />
                            </div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 border-b pb-2">Operational Meta</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Store Category</label>
                              <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.store_category} onChange={e => setFormData({...formData, store_category: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Opening Date</label>
                              <input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.opening_date} onChange={e => setFormData({...formData, opening_date: e.target.value})} />
                            </div>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                       <label className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all">
                          <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                          <div>
                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Active Status</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Visible in whole system</p>
                          </div>
                       </label>
                       <label className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-all">
                          <input type="checkbox" className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" checked={formData.is_delivery_available} onChange={e => setFormData({...formData, is_delivery_available: e.target.checked})} />
                          <div>
                            <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Delivery Option</p>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase mt-0.5">Allow door delivery</p>
                          </div>
                       </label>
                       <label className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-all">
                          <input type="checkbox" className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500" checked={formData.is_online_order_available} onChange={e => setFormData({...formData, is_online_order_available: e.target.checked})} />
                          <div>
                            <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Online Orders</p>
                            <p className="text-[10px] text-amber-400 font-bold uppercase mt-0.5">Enable app/web orders</p>
                          </div>
                       </label>
                    </div>
                  </div>
                )}

                {/* ── TAB: PRICE CONTROL ── */}
                {activeTab === 'Price Control' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                       {/* Background decorative icons */}
                       <i className="fas fa-tags absolute -right-4 -bottom-4 text-9xl opacity-10 rotate-12"></i>
                       
                       <h4 className="text-xl font-black uppercase tracking-tight mb-4">Price Update Control System</h4>
                       <p className="text-sm text-indigo-100 font-medium max-w-2xl mb-8 leading-relaxed">
                          Define how price changes at the Head Office propagate to this specific outlet. Selecting a level ensures synchronization follows the organizational hierarchy.
                       </p>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { val: 'All Store Level', desc: 'Sync with global pricing updates' },
                            { val: 'City Level', desc: 'Sync with other stores in same city' },
                            { val: 'State Level', desc: 'Sync with all stores in this state' },
                            { val: 'Selective Store', desc: 'Manual multi-store selection enabled' },
                            { val: 'Store Type Level', desc: 'Sync by Store Type (T1 / T2 / T3)' },
                          ].map(opt => (
                            <label key={opt.val} className={`flex items-start gap-4 p-5 rounded-3xl cursor-pointer transition-all border-2 ${
                              formData.price_update_level === opt.val 
                                ? 'bg-white border-white text-indigo-600' 
                                : 'bg-indigo-500/30 border-indigo-400/30 text-white hover:bg-indigo-500/50'
                            }`}>
                              <input 
                                type="radio" 
                                name="price_lvl" 
                                className="mt-1 w-5 h-5 text-indigo-600" 
                                checked={formData.price_update_level === opt.val} 
                                onChange={() => setFormData({...formData, price_update_level: opt.val})}
                              />
                              <div>
                                <p className="text-sm font-black uppercase tracking-tight">{opt.val}</p>
                                <p className={`text-[10px] font-bold uppercase mt-1 ${formData.price_update_level === opt.val ? 'text-indigo-400' : 'text-indigo-200'}`}>
                                  {opt.desc}
                                </p>
                              </div>
                            </label>
                          ))}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Store Type Class</label>
                        <div className="flex gap-2">
                           {['T1', 'T2', 'T3'].map(t => (
                             <button key={t} type="button" onClick={() => setFormData({...formData, store_type: t})} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${formData.store_type === t ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                               {t}
                             </button>
                           ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Store Size (Sq Ft)</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700" value={formData.store_size} onChange={e => setFormData({...formData, store_size: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 sticky bottom-0">
                <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-all">
                  Discard Changes
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all uppercase tracking-widest text-[10px]">
                  {editId ? 'Apply Updated Details' : 'Initialize Outlet Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Bulk Location Import</h3>
                <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mt-1">Import multiple outlets from Excel</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {!importResult ? (
                <div className="space-y-6 text-center">
                  <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center justify-center group hover:border-amber-400 transition-all">
                    <i className="fas fa-cloud-upload-alt text-5xl text-slate-300 group-hover:text-amber-500 transition-all mb-4"></i>
                    <p className="text-sm font-bold text-slate-600 mb-2">Click to select or drag Excel file</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Excel (.xlsx / .xls) supported</p>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleImport}
                      disabled={importing}
                    />
                  </div>
                  <button 
                    onClick={downloadTemplate}
                    className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center justify-center mx-auto"
                  >
                    <i className="fas fa-download mr-2"></i> Download Excel Template
                  </button>
                  {importing && (
                    <div className="flex items-center justify-center gap-3 text-amber-600 animate-pulse">
                      <i className="fas fa-spinner fa-spin"></i>
                      <span className="text-xs font-black uppercase tracking-widest">Processing Data...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Import Summary</p>
                      <p className="text-sm font-black text-slate-700 mt-1">{importResult.success} Outlets Imported Successfully</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Rows</p>
                      <p className="text-sm font-black text-slate-700 mt-1">{importResult.total}</p>
                    </div>
                  </div>
                  
                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center">
                        <i className="fas fa-exclamation-circle mr-2"></i> Errors & Warnings
                      </p>
                      <div className="max-h-40 overflow-y-auto bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-1">
                        {importResult.errors.map((err: string, i: number) => (
                          <p key={i} className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">• {err}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => { setShowImportModal(false); setImportResult(null); }}
                    className="w-full bg-slate-800 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-slate-100 hover:bg-slate-900 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Close Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutletMaster;
