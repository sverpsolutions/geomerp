import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const shopService = {
  // Consumer-facing
  placeOrder: async (orderData: any) => {
    const res = await axios.post(`${API_BASE}/shop/orders`, orderData);
    return res.data;
  },
  createOrGetCustomer: async (customerData: any) => {
    const res = await axios.post(`${API_BASE}/shop/customers`, customerData);
    return res.data;
  },
  searchCustomers: async (query: string) => {
    const res = await axios.get(`${API_BASE}/shop/customers/search`, { params: { q: query } });
    return res.data;
  },

  // Admin: Dashboard
  getShopDashboard: async () => {
    const res = await axios.get(`${API_BASE}/shop/admin/dashboard`);
    return res.data;
  },
  getShopSalesReport: async () => {
    const res = await axios.get(`${API_BASE}/shop/reports/sales`);
    return res.data;
  },
  getShopTopProducts: async () => {
    const res = await axios.get(`${API_BASE}/shop/reports/top-products`);
    return res.data;
  },

  // Admin: Orders
  getAdminOrders: async (params: { page?: number; per_page?: number; status?: string; search?: string } = {}) => {
    const res = await axios.get(`${API_BASE}/shop/admin/orders`, { params });
    return res.data;
  },
  getOrderDetail: async (orderId: number) => {
    const res = await axios.get(`${API_BASE}/shop/admin/orders/${orderId}`);
    return res.data;
  },
  updateOrderStatus: async (orderId: number, status: string) => {
    const res = await axios.put(`${API_BASE}/shop/admin/orders/${orderId}/status`, null, { params: { status } });
    return res.data;
  },

  // Admin: Customers
  getAdminCustomers: async (params: { page?: number; per_page?: number; search?: string } = {}) => {
    const res = await axios.get(`${API_BASE}/shop/admin/customers`, { params });
    return res.data;
  },

  // Banners
  getBanners: async () => {
    const res = await axios.get(`${API_BASE}/shop/banners`);
    return res.data;
  },
  getAdminBanners: async () => {
    const res = await axios.get(`${API_BASE}/shop/admin/banners`);
    return res.data;
  },
  createBanner: async (data: any) => {
    const res = await axios.post(`${API_BASE}/shop/admin/banners`, data);
    return res.data;
  },
  deleteBanner: async (id: number) => {
    const res = await axios.delete(`${API_BASE}/shop/admin/banners/${id}`);
    return res.data;
  },
  autoSetupProductImages: async (dryRun: boolean = false) => {
    const res = await axios.post(`${API_BASE}/shop/admin/products/auto-image-setup`, { dry_run: dryRun });
    return res.data;
  }
};
