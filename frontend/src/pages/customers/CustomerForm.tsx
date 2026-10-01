import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { customers_api } from '../../api/customers'
import PageHeader from '../../components/ui/PageHeader'

interface form_state {
  name: string; phone: string; email: string; address: string
  city: string; state: string; pincode: string; type: string
  gst_number: string; credit_limit: string; opening_balance: string
  show_outstanding_in_print: boolean; portal_active: boolean
}

const empty: form_state = {
  name: '', phone: '', email: '', address: '', city: '',
  state: 'Delhi', pincode: '', type: 'retail',
  gst_number: '', credit_limit: '0', opening_balance: '0',
  show_outstanding_in_print: false, portal_active: false,
}

const STATES = ['Delhi','Maharashtra','Gujarat','Rajasthan','Karnataka','Tamil Nadu','Uttar Pradesh','West Bengal','Madhya Pradesh','Punjab','Haryana','Bihar','Odisha','Telangana','Kerala']

export default function customer_form_page() {
  const { id } = useParams<{ id: string }>()
  const is_edit = Boolean(id)
  const navigate = useNavigate()
  const [form, set_form] = useState<form_state>(empty)
  const [saving, set_saving] = useState(false)
  const [error, set_error] = useState('')

  useEffect(() => {
    if (is_edit) {
      customers_api.get(Number(id)).then(res => {
        const c = res.data
        set_form({
          name: c.name, phone: c.phone, email: c.email ?? '',
          address: c.address ?? '', city: c.city ?? '',
          state: c.state, pincode: c.pincode ?? '',
          type: c.type, gst_number: c.gst_number ?? '',
          credit_limit: c.credit_limit, opening_balance: c.opening_balance,
          show_outstanding_in_print: c.show_outstanding_in_print,
          portal_active: c.portal_active,
        })
      })
    }
  }, [id])

  function field(key: keyof form_state, val: string | boolean) {
    set_form(f => ({ ...f, [key]: val }))
  }

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault(); set_saving(true); set_error('')
    try {
      const payload = {
        ...form,
        credit_limit: Number(form.credit_limit),
        opening_balance: Number(form.opening_balance),
        gst_number: form.gst_number || null,
        email: form.email || null,
        city: form.city || null,
        pincode: form.pincode || null,
        address: form.address || null,
      }
      if (is_edit) await customers_api.update(Number(id), payload)
      else await customers_api.create(payload)
      navigate('/customers')
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string | { msg: string }[] } } })?.response?.data?.detail
      set_error(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : String(detail ?? 'error'))
    } finally { set_saving(false) }
  }

  const inp = (label: string, key: keyof form_state, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key] as string} onChange={e => field(key, e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )

  const sec = (t: string) => <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3 pb-1 border-b">{t}</h3>

  return (
    <div className="max-w-3xl">
      <PageHeader title={is_edit ? 'Edit Customer' : 'Add Customer'} subtitle={is_edit ? `Editing #${id}` : 'Create new customer'} />

      <form onSubmit={handle_submit} className="bg-white rounded-xl shadow p-6">
        {sec('Basic Info')}
        <div className="grid grid-cols-2 gap-4">
          {inp('Name *', 'name', 'text', 'e.g. Ravi Kumar')}
          {inp('Phone *', 'phone', 'tel', '9XXXXXXXXX')}
          {inp('Email', 'email', 'email', 'optional')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type *</label>
            <select value={form.type} onChange={e => field('type', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['retail','wholesale','hotel','institution'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {sec('Address')}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={form.address} onChange={e => field('address', e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {inp('City', 'city')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select value={form.state} onChange={e => field('state', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {inp('Pincode', 'pincode', 'text', '110001')}
          {inp('GST Number', 'gst_number', 'text', '07ABCDE1234F1Z5')}
        </div>

        {sec('Financial')}
        <div className="grid grid-cols-2 gap-4">
          {inp('Credit Limit (₹)', 'credit_limit', 'number')}
          {inp('Opening Balance (₹)', 'opening_balance', 'number')}
        </div>

        {sec('Options')}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.show_outstanding_in_print}
              onChange={e => field('show_outstanding_in_print', e.target.checked)}
              className="rounded" />
            Show outstanding in print
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.portal_active}
              onChange={e => field('portal_active', e.target.checked)}
              className="rounded" />
            Portal active
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : is_edit ? 'Update Customer' : 'Create Customer'}
          </button>
          <button type="button" onClick={() => navigate('/customers')}
            className="px-6 py-2.5 border text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  )
}
