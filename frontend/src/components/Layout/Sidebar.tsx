import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBrandingStore } from '../../store/brandingStore';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';

/* ─── Menu Structure ─────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: 'fas fa-tachometer-alt',
    color: '#3b82f6', // Blue
  },
  {
    label: 'Products',
    icon: 'fas fa-box-open',
    color: '#f59e0b', // Amber
    children: [
      { label: 'Item Master', to: '/products/item-master', icon: 'fas fa-layer-group' },
      { label: 'All Items', to: '/products/list', icon: 'fas fa-list' },
      { label: 'Add New Item', to: '/products/add', icon: 'fas fa-plus-circle' },
      { label: 'Import from Excel', to: '/products/import', icon: 'fas fa-file-excel' },
    ],
  },
  {
    label: 'Masters',
    icon: 'fas fa-sitemap',
    color: '#6366f1', // Indigo
    children: [
      { label: 'Item Groups', to: '/masters/groups', icon: 'fas fa-layer-group' },
      { label: 'Sub Groups', to: '/masters/subgroups', icon: 'fas fa-sitemap' },
      { label: 'Categories', to: '/masters/categories', icon: 'fas fa-tags' },
      { label: 'Sub Categories', to: '/masters/subcategories', icon: 'fas fa-list-ul' },
      { label: 'Brands', to: '/masters/brands', icon: 'fas fa-trademark' },
      { label: 'Sub Brands', to: '/masters/subbrands', icon: 'fas fa-certificate' },
      { label: 'Manufacturers', to: '/masters/manufacturers', icon: 'fas fa-industry' },
      { label: 'Sub Manufacturers', to: '/masters/submanufacturers', icon: 'fas fa-industry' },
      { label: 'Variant Master', to: '/masters/variants', icon: 'fas fa-tags' },
      { label: 'Flavour Master', to: '/masters/flavours', icon: 'fas fa-ice-cream' },
      { label: 'Product Classification', to: '/masters/classification', icon: 'fas fa-th-large' },
      { label: 'Unit Master', to: '/masters/units', icon: 'fas fa-balance-scale' },
      { label: 'HSN Master', to: '/masters/hsn', icon: 'fas fa-barcode' },
      { label: 'GST Master', to: '/masters/gst', icon: 'fas fa-percent' },
      { label: 'Country Master', to: '/masters/countries', icon: 'fas fa-globe' },
      { label: 'Warehouse Racking', to: '/masters/warehouse-racking', icon: 'fas fa-th-large' },
      { label: 'Suppliers', to: '/masters/suppliers', icon: 'fas fa-truck' },
      { label: 'Customers', to: '/masters/customers', icon: 'fas fa-users' },
      { label: 'Outlet Master', to: '/masters/outlets', icon: 'fas fa-store' },
      { label: 'Channel Partners', to: '/masters/channels', icon: 'fas fa-globe' },
    ],
  },
  {
    label: 'Estimates',
    icon: 'fas fa-file-alt',
    color: '#14b8a6', // Teal
    children: [
      { label: 'All Estimates', to: '/billing/estimates', icon: 'fas fa-list' },
      { label: 'New Estimate', to: '/billing/estimates/new', icon: 'fas fa-plus' },
    ],
  },
  {
    label: 'Billing',
    icon: 'fas fa-file-invoice',
    color: '#10b981', // Emerald
    children: [
      { label: 'All Invoices', to: '/billing/invoices', icon: 'fas fa-list' },
      { label: 'New Invoice', to: '/billing/create', icon: 'fas fa-plus' },
      { label: 'Sales Return', to: '/billing/returns', icon: 'fas fa-undo' },
      { label: 'Credit Notes', to: '/billing/returns/list', icon: 'fas fa-list' },
    ],
  },
  {
    label: 'Purchases',
    icon: 'fas fa-shopping-cart',
    color: '#ef4444', // Red
    children: [
      { label: 'PO List', to: '/purchases/po', icon: 'fas fa-file-invoice' },
      { label: 'Create New PO', to: '/purchases/po/create', icon: 'fas fa-plus-circle' },
      { label: 'GRN — Inward', to: '/purchases/grn', icon: 'fas fa-truck-loading' },
      { label: 'Purchase Return', to: '/purchase-returns/create', icon: 'fas fa-undo' },
    ],
  },
  {
    label: 'Inventory',
    icon: 'fas fa-warehouse',
    color: '#a855f7', // Purple
    children: [
      { label: 'Stock Status', to: '/inventory/status', icon: 'fas fa-list' },
      { label: 'Rack / Location', to: '/masters/warehouse-racking', icon: 'fas fa-th-large' },
      { label: 'Physical Audit', to: '/inventory/audit', icon: 'fas fa-boxes' },
      { label: 'Barcode Printing', to: '/inventory/barcode', icon: 'fas fa-barcode' },
      { label: 'Stock Transfer OUT', to: '/inventory/transfer/out', icon: 'fas fa-sign-out-alt' },
      { label: 'Multi-Branch Transfer Out', to: '/inventory/transfer/multi', icon: 'fas fa-layer-group' },
      { label: 'Stock Transfer IN', to: '/inventory/transfer/in', icon: 'fas fa-sign-in-alt' },
      { label: 'Global Store Sync', to: '/inventory/sync', icon: 'fas fa-cloud-download-alt' },
      { label: 'Synchronization Monitor', to: '/inventory/monitor', icon: 'fas fa-satellite' },
    ],
  },
  {
    label: 'Logistics',
    icon: 'fas fa-truck',
    color: '#0ea5e9', // Sky
    children: [
      { label: 'Shipment List', to: '/logistics/list', icon: 'fas fa-list' },
      { label: 'New Transfer', to: '/logistics/new', icon: 'fas fa-plus-circle' },
    ],
  },
  {
    label: 'Accounts',
    icon: 'fas fa-calculator',
    color: '#f43f5e', // Rose
    children: [
      { label: 'Accounts Dashboard', to: '/accounts/dashboard', icon: 'fas fa-tachometer-alt' },
      { label: 'Bill Entry (SPS)', to: '/accounts/bills', icon: 'fas fa-file-invoice-dollar' },
      { label: 'Payment Entry', to: '/accounts/payments', icon: 'fas fa-money-check-alt' },
    ],
  },
  {
    label: 'Promotions',
    icon: 'fas fa-bullhorn',
    color: '#eab308', // Yellow
    children: [
      { label: 'Schemes', to: '/schemes', icon: 'fas fa-percent' },
      { label: 'Bulk Discount', to: '/bulk-pricing', icon: 'fas fa-tags' },
    ],
  },
  {
    label: 'Processing',
    icon: 'fas fa-fish',
    color: '#06b6d4', // Cyan
    children: [
      { label: 'Dashboard', to: '/processing', icon: 'fas fa-list' },
      { label: 'Receive New Lot', to: '/processing/receive', icon: 'fas fa-plus' },
      { label: 'BOM Recipes', to: '/production/recipes', icon: 'fas fa-book' },
      { label: 'Production Batches', to: '/production/batches', icon: 'fas fa-industry' },
    ],
  },
  {
    label: 'HR & Payroll',
    icon: 'fas fa-users-cog',
    color: '#8b5cf6', // Violet
    children: [
      { label: 'HR Dashboard', to: '/hr/dashboard', icon: 'fas fa-tachometer-alt' },
      { label: 'Employee Master', to: '/hr/employees', icon: 'fas fa-users' },
      { label: 'Daily Attendance', to: '/hr/attendance', icon: 'fas fa-clock' },
      { label: 'Leave Requests', to: '/hr/leaves', icon: 'fas fa-calendar-times' },
      { label: 'Salary Slips', to: '/hr/salary', icon: 'fas fa-file-invoice-dollar' },
    ],
  },
  {
    label: 'Reports',
    icon: 'fas fa-chart-bar',
    color: '#84cc16', // Lime
    children: [
      { label: 'Report Center', to: '/reports/center', icon: 'fas fa-chart-pie' },
      { label: 'Sales Report', to: '/reports/sales', icon: 'fas fa-chart-line' },
      { label: 'Profit & Loss', to: '/reports/pl', icon: 'fas fa-balance-scale' },
      { label: 'Purchase Report', to: '/reports/purchases', icon: 'fas fa-shopping-cart' },
      { label: 'GST Report', to: '/reports/gst', icon: 'fas fa-receipt' },
      { label: 'Stock Report', to: '/reports/stock', icon: 'fas fa-cubes' },
      { label: 'Stock Ledger', to: '/reports/ledger', icon: 'fas fa-book' },
      { label: 'Outstanding Dues', to: '/reports/outstanding', icon: 'fas fa-exclamation-triangle' },
      { label: 'Hourly Sales', to: '/reports/hourly', icon: 'fas fa-clock' },
      { label: 'Audit Logs', to: '/reports/audit-logs', icon: 'fas fa-history' },
    ],
  },
  {
    label: 'Online Shop',
    icon: 'fas fa-shopping-bag',
    color: '#10b981', // Emerald
    children: [
      { label: 'Shop Dashboard', to: '/admin/shop/dashboard', icon: 'fas fa-tachometer-alt' },
      { label: 'Shop Orders', to: '/admin/shop/orders', icon: 'fas fa-receipt' },
      { label: 'Shop Customers', to: '/admin/shop/customers', icon: 'fas fa-users' },
      { label: 'Sales Reports', to: '/admin/shop/reports', icon: 'fas fa-chart-line' },
      { label: 'Banner Settings', to: '/admin/shop/settings', icon: 'fas fa-images' },
    ],
  },
  {
    label: 'Settings',
    icon: 'fas fa-cog',
    color: '#94a3b8', // Slate
    children: [
      { label: 'Company Profile', to: '/settings/company', icon: 'fas fa-building' },
      { label: 'Theme & Styling', to: '/settings/theme', icon: 'fas fa-palette' },
      { label: 'System Help', to: '/help', icon: 'fas fa-question-circle' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isPinned: boolean;
  onPinToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle, isPinned, onPinToggle }: SidebarProps) {
  const location = useLocation();
  const { brand_name, logo_path, fetchSettings } = useBrandingStore();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  // Derived state for visual width
  // If collapsed manually, it stays w-0.
  // If not pinned, it stays 64px but expands to 240px on hover.
  const isExpanded = !collapsed && (isPinned || isHovered);
  const showFull = isExpanded;
  const isAutoHiding = !isPinned && !collapsed;

  useEffect(() => {
    fetchSettings();
    const active = NAV_SECTIONS.find(s => s.children?.some(c => location.pathname.startsWith(c.to)));
    if (active) setOpenGroups([active.label]);
  }, []);

  function toggleGroup(label: string) {
    setOpenGroups(prev => prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]);
  }

  return (
    <aside 
      id="app-sidebar"
      className={`sidebar flex flex-col h-screen transition-all duration-300 relative border-r border-slate-200 overflow-hidden shadow-2xl ${collapsed ? 'w-0 border-none' : (isExpanded ? 'w-[240px]' : 'w-[64px]')}`}
      style={{ 
        minWidth: collapsed ? '0px' : (isExpanded ? '240px' : '64px'),
        zIndex: isAutoHiding && isHovered ? 100 : 50,
        position: isAutoHiding && isHovered ? 'absolute' : 'relative',
        left: 0,
        top: 0
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Content Container ── */}
      <div className={`${showFull ? 'w-[240px]' : 'w-[64px]'} flex flex-col h-full shrink-0 transition-all duration-300`}>
        {/* ── Brand Header ── */}
        <div className="h-[56px] border-b border-slate-200 flex items-center px-4 gap-3 shrink-0 relative">
          <div className="w-8 h-8 rounded-fiori bg-primary flex items-center justify-center shrink-0 overflow-hidden">
            {logo_path && logo_path !== '/logo.jpg' ? (
              <img src={logo_path} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-store text-white text-xs"></i>
            )}
          </div>
          
          {showFull && (
            <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="text-slate-800 text-[12px] font-bold m-0 leading-tight line-clamp-2 break-words" title={brand_name}>{brand_name}</p>
              <span className="block text-[9px] text-slate-500 uppercase font-semibold tracking-wider leading-tight mt-0.5">Head Office</span>
            </div>
          )}
          
          {showFull && (
            <div className="flex gap-1 animate-in fade-in duration-500">
              <button 
                onClick={onPinToggle}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isPinned ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                title={isPinned ? "Unpin Sidebar (Auto-Hide)" : "Pin Sidebar"}
              >
                <i className={`fas fa-thumbtack text-[10px] ${isPinned ? '' : '-rotate-45'}`}></i>
              </button>
              
              <button 
                onClick={onToggle}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500"
                title="Close Sidebar"
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-4 sidebar-scroll">
          {NAV_SECTIONS.map((section) => {
            const isOpen = openGroups.includes(section.label);
            const isGroupActive = section.children?.some(c => location.pathname.startsWith(c.to)) || (section.to && location.pathname === section.to);

            // Item Link (Dashboard, etc.)
            if (section.to) {
              return (
                <NavLink 
                  key={section.to}
                  to={section.to} 
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${!showFull ? 'justify-center px-0' : ''}`}
                  style={({ isActive }) => isActive ? { 
                    backgroundColor: `${section.color}20`, 
                    color: '#0F172A',
                    borderLeft: showFull ? `3px solid ${section.color}` : 'none'
                  } : {}}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${section.color}15` }}>
                    <i className={`${section.icon} text-sm`} style={{ color: section.color }}></i>
                  </div>
                  {showFull && <span className="animate-in fade-in slide-in-from-left-1 duration-200">{section.label}</span>}
                </NavLink>
              );
            }

            // Group Dropdown (Products, Masters, etc.)
            return (
              <div key={section.label} className="mt-1">
                <button 
                  onClick={() => showFull && toggleGroup(section.label)}
                  className={`sidebar-item w-full ${isGroupActive ? 'active' : ''} ${!showFull ? 'justify-center px-0' : ''}`}
                  style={isGroupActive ? { 
                    backgroundColor: `${section.color}15`, 
                    color: '#0F172A',
                  } : {}}
                  title={!showFull ? section.label : ''}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${section.color}15` }}>
                    <i className={`${section.icon} text-sm`} style={{ color: section.color }}></i>
                  </div>
                  {showFull && <span className="flex-1 text-left animate-in fade-in slide-in-from-left-1 duration-200">{section.label}</span>}
                  {showFull && <i className={`fas fa-chevron-${isOpen ? 'down' : 'right'} text-[10px] opacity-40`}></i>}
                </button>

                {showFull && isOpen && (
                  <div className="bg-slate-50 py-1">
                    {section.children?.map(child => (
                      <NavLink 
                        key={child.to} 
                        to={child.to} 
                        className={({ isActive }) => `flex items-center gap-3 px-4 pl-6 h-9 text-[12px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                        style={({ isActive }) => isActive ? { 
                          color: section.color,
                          backgroundColor: `${section.color}10`
                        } : {}}
                      >
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 ml-4">
                           <i className={`${child.icon} text-[10px] text-center`} style={{ color: section.color }}></i>
                        </div>
                        <span className="truncate">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className={`p-3 border-t border-slate-200 space-y-2 ${!showFull ? 'items-center flex flex-col' : ''}`}>
          <div className={`flex items-center gap-3 bg-slate-100 rounded-fiori ${showFull ? 'px-3 py-2' : 'w-10 h-10 justify-center'}`} title={!showFull ? user?.name : ''}>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            {showFull && (
              <div className="min-w-0 flex-1 animate-in fade-in duration-300">
                <p className="text-slate-800 text-[12px] font-bold truncate m-0">{user?.name || 'Admin'}</p>
                <p className="text-slate-500 text-[10px] uppercase m-0">{user?.role || 'User'}</p>
              </div>
            )}
          </div>
          <button onClick={logout} className={`sidebar-item w-full text-red-500 hover:bg-red-50 ${!showFull ? 'justify-center px-0' : ''}`} title="Logout">
            <i className="fas fa-sign-out-alt w-5 text-center"></i>
            {showFull && <span className="animate-in fade-in duration-300">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
