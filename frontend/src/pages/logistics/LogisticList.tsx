import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, MoreVertical, Truck, Package, 
  Calendar, MapPin, ChevronRight, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getLogisticTransfers } from '../../api/logistic';
import { masters_api } from '../../api/masters';

const LogisticList = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trfRes, outRes] = await Promise.all([
        getLogisticTransfers(),
        masters_api.get_outlets()
      ]);
      setTransfers(trfRes);
      setOutlets(outRes.data || []);
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const getOutletName = (id: number) => {
    return outlets.find(o => o.id === id)?.outlet_name || `Location ${id}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-600';
      case 'PACKING': return 'bg-blue-100 text-blue-600';
      case 'PACKED': return 'bg-indigo-100 text-indigo-600';
      case 'DISPATCHED': return 'bg-amber-100 text-amber-600';
      case 'DELIVERED': return 'bg-green-100 text-green-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filtered = transfers.filter(t => 
    t.transfer_number.toLowerCase().includes(search.toLowerCase()) ||
    getOutletName(t.destination_location_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Logistic Management</h1>
          <p className="text-slate-500">Track and manage branch transfers and shipments</p>
        </div>
        <button 
          onClick={() => navigate('/logistics/new')}
          className="btn btn-primary h-12 px-6 flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} /> Create New Transfer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              className="form-input pl-10 bg-white" 
              placeholder="Search by transfer ID or destination..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Route</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Items</th>
                <th>Created</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-slate-400">Loading transfers...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400">
                    <Truck size={48} className="mx-auto mb-4 opacity-10" />
                    No transfers found.
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="group cursor-pointer hover:bg-slate-50/80" onClick={() => navigate(`/logistics/transfer/${t.id}`)}>
                    <td className="font-black text-slate-800">{t.transfer_number}</td>
                    <td>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-bold">{getOutletName(t.source_location_id)}</span>
                        <ArrowRight size={12} className="text-slate-300" />
                        <span className="font-bold text-primary">{getOutletName(t.destination_location_id)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <span className={`font-bold ${t.priority === 'Urgent' ? 'text-red-500' : t.priority === 'Express' ? 'text-amber-500' : 'text-slate-500'}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{t.items?.length || 0} items</td>
                    <td className="text-slate-500 text-[11px]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogisticList;
