import React from 'react';

// Import all components needed for tabs
import Dashboard from '../pages/dashboard/Dashboard';
import ItemMaster from '../pages/products/ItemMaster';
import ProductAdd from '../pages/products/ProductAdd';
import ImportProducts from '../pages/products/ImportProducts';
import Suppliers from '../pages/masters/Suppliers';
import VendorApprovals from '../pages/suppliers/VendorApprovals';
import HsnMaster from '../pages/masters/HsnMaster';
import PosBilling from '../pages/billing/PosBilling';
import InvoiceList from '../pages/billing/InvoiceList';
import InvoiceCreate from '../pages/billing/InvoiceCreate';
import InvoiceView from '../pages/billing/InvoiceView';
import EstimateList from '../pages/billing/EstimateList';
import EstimateCreate from '../pages/billing/EstimateCreate';
import Purchases from '../pages/purchases/Purchases';
import POList from '../pages/purchases/POList';
import POCreate from '../pages/purchases/POCreate';
import PODetail from '../pages/purchases/PODetail';
import Inventory from '../pages/inventory/Inventory';
import AccountsDashboard from '../pages/accounts/AccountsDashboard';
import Payments from '../pages/accounts/Payments';
import ReportCenter from '../pages/reports/ReportCenter';
import SalesReport from '../pages/reports/SalesReport';
import PurchaseReport from '../pages/reports/PurchaseReport';
import StockReport from '../pages/reports/StockReport';
import ProfitLossReport from '../pages/reports/ProfitLossReport';
import GSTReport from '../pages/reports/GSTReport';
import PaymentMatrix from '../pages/reports/PaymentMatrix';
import OutstandingReport from '../pages/reports/OutstandingReport';
import PaymentCollectionReport from '../pages/reports/PaymentCollectionReport';
import HourlySalesReport from '../pages/reports/HourlySalesReport';
import HierarchyReport from '../pages/reports/HierarchyReport';
import StockLedgerReport from '../pages/reports/StockLedgerReport';
import HsnMismatchReport from '../pages/reports/HsnMismatchReport';
import HsnMappingReport from '../pages/reports/HsnMappingReport';
import HsnExceptionReport from '../pages/reports/HsnExceptionReport';
import TaxBreakupReport from '../pages/reports/TaxBreakupReport';
import EmployeeDirectory from '../pages/hr/EmployeeDirectory';
import Attendance from '../pages/hr/Attendance';
import Customers from '../pages/masters/Customers';
import Groups from '../pages/masters/Groups';
import SubGroups from '../pages/masters/SubGroups';
import Categories from '../pages/masters/Categories';
import SubCategories from '../pages/masters/SubCategories';
import Brands from '../pages/masters/Brands';
import SubBrands from '../pages/masters/SubBrands';
import Manufacturers from '../pages/masters/Manufacturers';
import Units from '../pages/masters/Units';
import GstMaster from '../pages/masters/GstMaster';
import CountryMaster from '../pages/masters/CountryMaster';
import OutletMaster from '../pages/masters/OutletMaster';
import SubManufacturers from '../pages/masters/SubManufacturers';
import Variants from '../pages/masters/Variants';
import Flavours from '../pages/masters/Flavours';
import ProductClassification from '../pages/masters/ProductClassification';
import GlobalSync from '../pages/inventory/GlobalSync';
import CompanySettings from '../pages/settings/CompanySettings';
import WarehouseRacking from '../pages/masters/WarehouseRacking';
import ChannelPartners from '../pages/masters/ChannelPartners';
import ChannelMarginReport from '../pages/reports/ChannelMarginReport';
import LowMarginReport from '../pages/reports/LowMarginReport';
import MarkdownItemReport from '../pages/reports/MarkdownItemReport';
import AuditLogReport from '../pages/reports/AuditLogReport';
import SystemHelp from '../pages/help/SystemHelp';
import PortalHub from '../pages/help/PortalHub';
import ThemeSettings from '../pages/settings/ThemeSettings';
import MultiBranchTransfer from '../pages/inventory/MultiBranchTransfer';
import SyncMonitor from '../pages/inventory/SyncMonitor';
import LogisticList from '../pages/logistics/LogisticList';
import LogisticTransferWizard from '../pages/logistics/LogisticTransferWizard';

// FMCG Reports
import UnitDashboard from '../pages/reports/UnitDashboard';
import SalesTrendReport from '../pages/reports/SalesTrendReport';
import TopItemsReport from '../pages/reports/TopItemsReport';
import CategorySalesReport from '../pages/reports/CategorySalesReport';
import ProfitabilityReport from '../pages/reports/ProfitabilityAnalysis';
import SalesVsPurchaseReport from '../pages/reports/SalesVsPurchaseReport';
import ItemVelocityReport from '../pages/reports/ItemVelocityReport';
import CustomerAnalyticsReport from '../pages/reports/CustomerAnalyticsReport';
import BillEntry from '../pages/accounts/BillEntry';
import SalesReturn from '../pages/billing/SalesReturn';
import CreditNotes from '../pages/billing/CreditNotes';
import PurchaseReturn from '../pages/purchases/PurchaseReturn';
import DebitNotes from '../pages/purchases/DebitNotes';
import Schemes from '../pages/promotions/Schemes';
import BulkDiscount from '../pages/promotions/BulkDiscount';
import ProcessingDashboard from '../pages/processing/ProcessingDashboard';
import ReceiveLot from '../pages/processing/ReceiveLot';
import BOMRecipes from '../pages/processing/BOMRecipes';
import ProductionBatches from '../pages/processing/ProductionBatches';
import HRDashboard from '../pages/hr/HRDashboard';
import LeaveRequests from '../pages/hr/LeaveRequests';
import SalarySlips from '../pages/hr/SalarySlips';
import ShopDashboard from '../pages/shop/ShopDashboard';
import ShopOrders from '../pages/shop/ShopOrders';
import ShopCustomers from '../pages/shop/ShopCustomers';
import ShopReports from '../pages/shop/ShopReports';
import BannerManagement from '../pages/shop/BannerManagement';

export interface RouteConfig {
  id: string;
  path: string;
  component: React.ComponentType<any>;
  title: string;
}

export const APP_ROUTES: RouteConfig[] = [
  { id: '100', path: '/dashboard', component: Dashboard, title: 'Dashboard' },
  { id: '101', path: '/products/item-master', component: ItemMaster, title: 'Item Master' },
  { id: '102', path: '/products/list', component: ItemMaster, title: 'All Items' },
  { id: '103', path: '/products/add', component: ProductAdd, title: 'Add New Item' },
  { id: '104', path: '/products/edit/:id', component: ProductAdd, title: 'Edit Item' },
  { id: '105', path: '/products/import', component: ImportProducts, title: 'Import Products' },
  { id: '201', path: '/masters/suppliers', component: Suppliers, title: 'Suppliers' },
  { id: '202', path: '/masters/suppliers/approvals', component: VendorApprovals, title: 'Vendor Approvals' },
  { id: '203', path: '/masters/customers', component: Customers, title: 'Customers' },
  { id: '210', path: '/masters/groups', component: Groups, title: 'Item Groups' },
  { id: '211', path: '/masters/subgroups', component: SubGroups, title: 'Sub Groups' },
  { id: '212', path: '/masters/categories', component: Categories, title: 'Categories' },
  { id: '213', path: '/masters/subcategories', component: SubCategories, title: 'Sub Categories' },
  { id: '214', path: '/masters/brands', component: Brands, title: 'Brands' },
  { id: '215', path: '/masters/subbrands', component: SubBrands, title: 'Sub Brands' },
  { id: '216', path: '/masters/manufacturers', component: Manufacturers, title: 'Manufacturers' },
  { id: '217', path: '/masters/submanufacturers', component: SubManufacturers, title: 'Sub Manufacturers' },
  { id: '218', path: '/masters/variants', component: Variants, title: 'Variants' },
  { id: '219', path: '/masters/flavours', component: Flavours, title: 'Flavours' },
  { id: '220', path: '/masters/classification', component: ProductClassification, title: 'Classification' },
  { id: '221', path: '/masters/units', component: Units, title: 'Units' },
  { id: '222', path: '/masters/gst', component: GstMaster, title: 'GST Master' },
  { id: '223', path: '/masters/countries', component: CountryMaster, title: 'Countries' },
  { id: '224', path: '/masters/outlets', component: OutletMaster, title: 'Outlets' },
  { id: '225', path: '/masters/hsn', component: HsnMaster, title: 'HSN Master' },
  { id: '226', path: '/masters/warehouse-racking', component: WarehouseRacking, title: 'Warehouse Racking' },
  { id: '227', path: '/masters/channels', component: ChannelPartners, title: 'Channel Partners' },
  { id: '901', path: '/settings/company', component: CompanySettings, title: 'Company Settings' },
  { id: '301', path: '/billing/create', component: PosBilling, title: 'New Invoice' },
  { id: '302', path: '/billing/invoices', component: InvoiceList, title: 'Sales Invoices' },
  { id: '303', path: '/billing/invoices/:id', component: InvoiceView, title: 'Invoice Details' },
  { id: '304', path: '/billing/invoices/new', component: InvoiceCreate, title: 'New Invoice Form' },
  { id: '401', path: '/purchases/list', component: Purchases, title: 'Purchases' },
  { id: '402', path: '/purchases/po', component: POList, title: 'PO List' },
  { id: '403', path: '/purchases/po/create', component: POCreate, title: 'Create PO' },
  { id: '404', path: '/purchases/po/edit/:id', component: POCreate, title: 'Edit PO' },
  { id: '405', path: '/purchases/po/:id', component: PODetail, title: 'PO Detail' },
  { id: '501', path: '/inventory/status', component: Inventory, title: 'Inventory Status' },
  { id: '502', path: '/inventory/sync', component: GlobalSync, title: 'Global Sync' },
  { id: '510', path: '/inventory/monitor', component: SyncMonitor, title: 'Sync Monitor' },
  { id: '601', path: '/accounts/dashboard', component: AccountsDashboard, title: 'Accounts' },
  { id: '602', path: '/accounts/payments', component: Payments, title: 'Payments' },
  { id: '700', path: '/reports/center', component: ReportCenter, title: 'Report Center' },
  { id: '701', path: '/reports/sales', component: SalesReport, title: 'Sales Report' },
  { id: '702', path: '/reports/purchases', component: PurchaseReport, title: 'Purchase Report' },
  { id: '703', path: '/reports/stock', component: StockReport, title: 'Stock Report' },
  { id: '704', path: '/reports/pl', component: ProfitLossReport, title: 'P&L Report' },
  { id: '705', path: '/reports/gst', component: GSTReport, title: 'GST Report' },
  { id: '706', path: '/reports/payments-matrix', component: PaymentMatrix, title: 'Payment Matrix' },
  { id: '707', path: '/reports/outstanding', component: OutstandingReport, title: 'Outstanding' },
  { id: '708', path: '/reports/payments', component: PaymentCollectionReport, title: 'Payments' },
  { id: '709', path: '/reports/hourly', component: HourlySalesReport, title: 'Hourly Sales' },
  { id: '710', path: '/reports/hierarchy', component: HierarchyReport, title: 'Hierarchy' },
  { id: '711', path: '/reports/ledger', component: StockLedgerReport, title: 'Stock Ledger' },
  { id: '712', path: '/reports/hsn-mismatch', component: HsnMismatchReport, title: 'HSN Mismatch' },
  { id: '713', path: '/reports/hsn-mapping', component: HsnMappingReport, title: 'HSN Mapping' },
  { id: '714', path: '/reports/hsn-exceptions', component: HsnExceptionReport, title: 'HSN Exceptions' },
  { id: '715', path: '/reports/channel-margin', component: ChannelMarginReport, title: 'Channel Margin' },
  { id: '716', path: '/reports/low-margin', component: LowMarginReport, title: 'Low Margin' },
  { id: '717', path: '/reports/markdown-items', component: MarkdownItemReport, title: 'Markdown Items' },
  { id: '718', path: '/reports/audit-logs', component: AuditLogReport, title: 'Audit Logs' },
  { id: '719', path: '/reports/unit-dashboard', component: UnitDashboard, title: 'Unit Dashboard' },
  { id: '720', path: '/reports/sales-trend', component: SalesTrendReport, title: 'Sales Trend' },
  { id: '721', path: '/reports/top-items', component: TopItemsReport, title: 'Top Items' },
  { id: '722', path: '/reports/category-sales', component: CategorySalesReport, title: 'Category Sales' },
  { id: '723', path: '/reports/profitability', component: ProfitabilityReport, title: 'Profitability' },
  { id: '724', path: '/reports/sales-vs-purchase', component: SalesVsPurchaseReport, title: 'Sales vs Purchase' },
  { id: '725', path: '/reports/item-velocity', component: ItemVelocityReport, title: 'Item Velocity' },
  { id: '726', path: '/reports/customer-analytics', component: CustomerAnalyticsReport, title: 'Customer Analytics' },
  { id: '727', path: '/reports/tax-breakup', component: TaxBreakupReport, title: 'Tax Breakup Report' },
  { id: '999', path: '/help', component: SystemHelp, title: 'System Help' },
  { id: '990', path: '/portals', component: PortalHub, title: 'Portal Hub' },
  { id: '910', path: '/settings/theme', component: ThemeSettings, title: 'Theme Settings' },
  { id: '801', path: '/hr/employees', component: EmployeeDirectory, title: 'Employees' },
  { id: '802', path: '/hr/attendance', component: Attendance, title: 'Attendance' },
  { id: '503', path: '/inventory/transfer/out', component: Inventory, title: 'Stock Transfer OUT' },
  { id: '505', path: '/inventory/transfer/multi', component: MultiBranchTransfer, title: 'Multi-Branch Transfer Out' },
  { id: '504', path: '/inventory/transfer/in', component: Inventory, title: 'Stock Transfer IN' },
  { id: '310', path: '/billing/estimates', component: EstimateList, title: 'Estimates' },
  { id: '311', path: '/billing/estimates/new', component: EstimateCreate, title: 'New Estimate' },
  { id: '810', path: '/hr/payroll', component: () => <div className="p-8">Payroll Module</div>, title: 'Payroll' },
  { id: '1001', path: '/logistics/list', component: LogisticList, title: 'Shipments' },
  { id: '1002', path: '/logistics/new', component: LogisticTransferWizard, title: 'New Transfer' },
  { id: '1003', path: '/logistics/transfer/:id', component: LogisticTransferWizard, title: 'Logistics' },
  { id: '406', path: '/purchases/grn', component: Purchases, title: 'GRN — Inward' },
  { id: '603', path: '/accounts/bills', component: BillEntry, title: 'Bill Entry (SPS)' },
  { id: '1101', path: '/schemes', component: Schemes, title: 'Schemes' },
  { id: '1102', path: '/bulk-pricing', component: BulkDiscount, title: 'Bulk Discount' },
  { id: '1201', path: '/processing', component: ProcessingDashboard, title: 'Processing' },
  { id: '1202', path: '/processing/receive', component: ReceiveLot, title: 'Receive New Lot' },
  { id: '1203', path: '/production/recipes', component: BOMRecipes, title: 'BOM Recipes' },
  { id: '1204', path: '/production/batches', component: ProductionBatches, title: 'Production Batches' },
  { id: '803', path: '/hr/dashboard', component: HRDashboard, title: 'HR Dashboard' },
  { id: '804', path: '/hr/leaves', component: LeaveRequests, title: 'Leave Requests' },
  { id: '805', path: '/hr/salary', component: SalarySlips, title: 'Salary Slips' },
  { id: '1301', path: '/admin/shop/dashboard', component: ShopDashboard, title: 'Shop Dashboard' },
  { id: '1302', path: '/admin/shop/orders', component: ShopOrders, title: 'Shop Orders' },
  { id: '1303', path: '/admin/shop/customers', component: ShopCustomers, title: 'Shop Customers' },
  { id: '1304', path: '/admin/shop/reports', component: ShopReports, title: 'Shop Sales Reports' },
  { id: '1305', path: '/admin/shop/settings', component: BannerManagement, title: 'Banner Settings' },
  // Sidebar entries whose module is not built yet (no page, no API)
  { id: '320', path: '/billing/returns', component: SalesReturn, title: 'Sales Return' },
  { id: '321', path: '/billing/returns/list', component: CreditNotes, title: 'Credit Notes' },
  { id: '407', path: '/purchase-returns/create', component: PurchaseReturn, title: 'Purchase Return' },
  { id: '408', path: '/purchase-returns', component: DebitNotes, title: 'Debit Notes' },
  { id: '506', path: '/inventory/audit', component: () => <ComingSoon name="Physical Audit" />, title: 'Physical Audit' },
  { id: '507', path: '/inventory/barcode', component: () => <ComingSoon name="Barcode Printing" />, title: 'Barcode Printing' },
];

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center text-slate-500 gap-2 h-full">
      <i className="fas fa-tools text-3xl text-slate-300"></i>
      <h3 className="text-slate-700">{name}</h3>
      <p className="text-sm">This module is not built yet.</p>
    </div>
  );
}
