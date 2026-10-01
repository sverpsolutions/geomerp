import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  paramsSerializer: {
    indexes: null
  }
});

// Add a request interceptor to include the auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export const productsService = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
};

export default api;
