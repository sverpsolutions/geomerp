import api from './axios'

export interface customer_list_item {
  id: number; name: string; phone: string; email: string | null
  city: string | null; type: string; gst_number: string | null
  balance: string; credit_limit: string; status: boolean
}

export interface customer_detail extends customer_list_item {
  address: string | null; state: string; pincode: string | null
  opening_balance: string; show_outstanding_in_print: boolean
  portal_active: boolean; created_at: string; updated_at: string
}

export interface ledger_row {
  date: string; ref_no: string; type: string
  description: string; debit: string; credit: string; balance: string
}

export interface paginated<T> { data: T[]; total: number; page: number; per_page: number; total_pages: number }

export const customers_api = {
  list: (params?: { page?: number; per_page?: number; search?: string; type?: string }) =>
    api.get<paginated<customer_list_item>>('/customers', { params }),
  get: (id: number) => api.get<customer_detail>(`/customers/${id}`),
  create: (data: object) => api.post<customer_detail>('/customers', data),
  update: (id: number, data: object) => api.put<customer_detail>(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  ledger: (id: number) => api.get<ledger_row[]>(`/customers/${id}/ledger`),
}
