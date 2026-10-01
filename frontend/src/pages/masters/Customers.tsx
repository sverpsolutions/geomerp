import React, { useState } from 'react';

const Customers = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([
    { id: 1, name: 'Taj Hotel & Resorts', contact: 'Mr. Amit', phone: '+91 9820011223', gstin: '27AAAAA0000A1Z5', city: 'Mumbai', balance: 12500 },
    { id: 2, name: 'Marriott International', contact: 'Ms. Sarah', phone: '+91 9123456780', gstin: '27BBBBB1111B2Z6', city: 'Mumbai', balance: 0 },
    { id: 3, name: 'Oberoi Group', contact: 'Mr. Khanna', phone: '+91 9988776655', gstin: '27CCCCC2222C3Z7', city: 'Delhi', balance: 45200 },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    gstin: '',
    city: '',
    balance: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer = {
      id: customers.length + 1,
      ...formData
    };
    setCustomers([...customers, newCustomer]);
    setShowModal(false);
    setFormData({ name: '', contact: '', phone: '', gstin: '', city: '', balance: 0 });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e3c72] tracking-tight flex items-center">
            <i className="fas fa-users mr-3 text-[#4cc9f0]"></i> Customer Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">Manage corporate and retail client profiles</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-[#4cc9f0] to-[#4361ee] text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <i className="fas fa-user-plus mr-2"></i> Add Customer
        </button>
      </div>

      <div className="relative bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center">
        <i className="fas fa-search absolute left-4 text-slate-400"></i>
        <input 
          type="text" 
          placeholder="Search customers by name, phone, or GSTIN..." 
          className="w-full py-3 pl-12 pr-4 border-none focus:ring-0 text-sm font-medium outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card border-0 shadow-lg rounded-xl overflow-hidden">
        <div className="card-body p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fafc] border-b-2 border-slate-200">
              <tr className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Contact Person</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">GSTIN / TAX ID</th>
                <th className="px-6 py-4">City / State</th>
                <th className="px-6 py-4 text-right">Balance Due</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c, idx) => (
                <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors group">
                  <td className="px-6 py-4 text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer">{c.name}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{c.contact}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{c.phone}</td>
                  <td className="px-6 py-4">
                    <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">{c.gstin}</code>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{c.city}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${c.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                       ₹ {c.balance.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-blue-600 hover:underline font-bold text-xs"><i className="fas fa-edit mr-1"></i> Edit</button>
                      <button className="text-slate-600 hover:underline font-bold text-xs"><i className="fas fa-file-invoice mr-1"></i> Ledger</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#4cc9f0] to-[#4361ee] p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Add New Customer</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                <i className="fas fa-times fa-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Customer / Company Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border-slate-200 rounded-lg p-2.5 text-sm"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Contact Person</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border-slate-200 rounded-lg p-2.5 text-sm"
                    value={formData.contact}
                    onChange={e => setFormData({...formData, contact: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Phone Number</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border-slate-200 rounded-lg p-2.5 text-sm"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">GSTIN</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border-slate-200 rounded-lg p-2.5 text-sm"
                    value={formData.gstin}
                    onChange={e => setFormData({...formData, gstin: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">City / State</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border-slate-200 rounded-lg p-2.5 text-sm"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#4361ee] text-white font-bold rounded-lg shadow-lg">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
