import React, { useState, useEffect } from 'react';
import { getCompanySettings, updateCompanySettings, CompanySettings } from '../../api/company';
import { useBrandingStore } from '../../store/brandingStore';
import { toast } from 'react-hot-toast';

const CompanySettingsPage = () => {
  const { updateSettings } = useBrandingStore();
  const [settings, setSettings] = useState<Partial<CompanySettings>>({
    brand_name: '',
    ho_address: '',
    ho_email: '',
    ho_phone: '',
    logo_path: '',
    company_cin: '',
    company_tan: '',
    item_code_format: '[PREFIX]-[BRAND]-[VARIANT]-[SIZE]',
    enable_gst: true,
    show_product_img: true,
    low_stock_threshold: 10,
    hsn_code_length: 8,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getCompanySettings();
      setSettings(data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateCompanySettings(settings);
      updateSettings(updated);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Company Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your brand, contact info, and global software toggles.</p>
        </div>
        <div className="bg-primary/10 p-3 rounded-xl">
           <i className="fas fa-building text-2xl text-primary"></i>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Branding & Logo</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Software / Brand Name</label>
              <input
                type="text"
                name="brand_name"
                value={settings.brand_name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="e.g. Modern Bazaar HO"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Logo Path (URL or local path)</label>
              <input
                type="text"
                name="logo_path"
                value={settings.logo_path}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="/logo.jpg"
              />
              <p className="text-[10px] text-slate-400 italic">Default: /logo.jpg (stored in public folder)</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Head Office Details</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">HO Address</label>
              <textarea
                name="ho_address"
                value={settings.ho_address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Support Email</label>
                <input
                  type="email"
                  name="ho_email"
                  value={settings.ho_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Support Phone</label>
                <input
                  type="text"
                  name="ho_phone"
                  value={settings.ho_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Company CIN</label>
                <input
                  type="text"
                  name="company_cin"
                  value={settings.company_cin}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Company TAN</label>
                <input
                  type="text"
                  name="company_tan"
                  value={settings.company_tan}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Auto Item Code Format</label>
              <input
                type="text"
                name="item_code_format"
                value={settings.item_code_format}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-mono"
                placeholder="e.g. [PREFIX]-[BRAND]-[VARIANT]-[SIZE]"
              />
              <p className="text-[10px] text-slate-400">Tokens available: [PREFIX], [BRAND], [VARIANT], [SIZE]</p>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Feature Controls</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
               <div>
                 <p className="text-sm font-bold">Enable Markdown Calculation</p>
                 <p className="text-[10px] text-slate-500">Automate Cost Price from MRP and Margin</p>
               </div>
               <input 
                type="checkbox" 
                name="enable_markdown_calc"
                checked={settings.enable_markdown_calc}
                onChange={handleChange}
                className="w-5 h-5 accent-primary" 
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
               <div>
                 <p className="text-sm font-bold">Enable GST</p>
                 <p className="text-[10px] text-slate-500">Calculate CGST/SGST/IGST on bills</p>
               </div>
               <input 
                type="checkbox" 
                name="enable_gst"
                checked={settings.enable_gst}
                onChange={handleChange}
                className="w-5 h-5 accent-primary" 
               />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
               <div>
                 <p className="text-sm font-bold">Show Product Images</p>
                 <p className="text-[10px] text-slate-500">Display thumbnails in lists and POS</p>
               </div>
               <input 
                type="checkbox" 
                name="show_product_img"
                checked={settings.show_product_img}
                onChange={handleChange}
                className="w-5 h-5 accent-primary" 
               />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-semibold">Low Stock Threshold</label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={settings.low_stock_threshold}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-semibold">HSN Code Length Validation</label>
                <select
                  name="hsn_code_length"
                  value={settings.hsn_code_length}
                  onChange={(e) => setSettings(prev => ({ ...prev, hsn_code_length: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value={4}>4 Digits</option>
                  <option value={6}>6 Digits</option>
                  <option value={8}>8 Digits</option>
                </select>
                <p className="text-[10px] text-slate-400">Enforces length for Goods (HSN). Services (SAC) are fixed at 6 digits.</p>
              </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700 md:col-span-2">
               <div>
                 <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Strict HSN Compliance</p>
                 <p className="text-[10px] text-slate-500">Force items to match subcategory HSN before saving (Blocks Save if mismatch)</p>
               </div>
               <input 
                type="checkbox" 
                name="strict_hsn_validation"
                checked={settings.strict_hsn_validation}
                onChange={handleChange}
                className="w-5 h-5 accent-rose-600" 
               />
            </div>
          </div>
        </div>

        {/* Pricing Engine Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Pricing Engine & Channel Controls</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                 <div>
                   <p className="text-sm font-bold">Enable Online Channel Pricing</p>
                   <p className="text-[10px] text-slate-500">Enable Swiggy, Zomato, Amazon etc. per-item pricing</p>
                 </div>
                 <input 
                  type="checkbox" 
                  name="enable_channel_pricing"
                  checked={settings.enable_channel_pricing}
                  onChange={handleChange}
                  className="w-5 h-5 accent-primary" 
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
                 <div>
                   <p className="text-sm font-bold">Admin-Only Margin Visibility</p>
                   <p className="text-[10px] text-slate-500">Hide purchase margins from standard staff users</p>
                 </div>
                 <input 
                  type="checkbox" 
                  name="markdown_admin_only"
                  checked={settings.markdown_admin_only}
                  onChange={handleChange}
                  className="w-5 h-5 accent-amber-600" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <label className="text-sm font-semibold">Minimum Global Margin (%)</label>
                  <input
                    type="number"
                    name="minimum_global_margin"
                    value={settings.minimum_global_margin}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                  />
                  <p className="text-[10px] text-slate-400">Alerts if net margin falls below this threshold</p>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-semibold">Default Markdown Margin (%)</label>
                  <input
                    type="number"
                    name="default_markdown_margin"
                    value={settings.default_markdown_margin}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                  />
                  <p className="text-[10px] text-slate-400">Used as default when creating markdown items</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-primary/20 transition-all ${saving ? 'bg-slate-400' : 'bg-primary hover:bg-primary-dark active:scale-95'}`}
          >
            {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettingsPage;
