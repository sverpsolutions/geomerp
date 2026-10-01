import { useState, useRef, useCallback } from 'react'
import {
  Building2, FileText, Users, Upload, ChevronRight, ChevronLeft,
  CheckCircle2, X, Eye, AlertCircle, ThumbsUp, ThumbsDown,
  Pause, MessageSquare, Camera, Phone, Mail, MapPin, Globe,
  Briefcase, CreditCard, Shield, Info, ExternalLink, Search,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type BusinessType = 'Proprietorship' | 'Partnership' | 'LLP' | 'Pvt Ltd' | 'Public Ltd' | 'Other'
type NatureOfBusiness = 'Manufacturer' | 'Trader' | 'Distributor' | 'Service Provider' | 'Import-Export' | 'Other'
type VendorStatus = 'Pending' | 'Approved' | 'Rejected' | 'On Hold'
type IdProofType = 'Aadhar' | 'PAN' | 'Voter ID' | 'Passport' | 'Driving License'
type Department = 'Accounts' | 'Finance' | 'Admin' | 'Other'
type CommMethod = 'Email' | 'WhatsApp' | 'Phone' | 'All'

interface UploadedFile {
  name: string
  size: number
  preview: string
  fileType: string
}

interface Step1 {
  companyName: string; tradeName: string; businessType: BusinessType | ''
  yearEstablished: string; natureOfBusiness: NatureOfBusiness | ''; website: string
  address: string; city: string; state: string; pincode: string
  primaryContact: string; altContact: string; email: string
}
interface Step2 {
  gstNumber: string; panNumber: string; tanNumber: string; cinNumber: string
  msmeNumber: string; fssaiNumber: string; drugLicense: string; iecCode: string; tradeLicense: string
}
interface Step3 {
  gstCert: UploadedFile | null; panCard: UploadedFile | null; tanCert: UploadedFile | null
  cinCert: UploadedFile | null; msmeCert: UploadedFile | null; cancelledCheque: UploadedFile | null
  bankProof: UploadedFile | null; letterhead: UploadedFile | null; gstReturn: UploadedFile | null
}
interface PersonA {
  name: string; designation: string; mobile: string; email: string
  idType: IdProofType | ''; idNumber: string
  idProof: UploadedFile | null; photo: UploadedFile | null; isPrimaryContact: boolean
}
interface PersonB {
  name: string; designation: string; mobile: string; email: string
  department: Department | ''; commMethod: CommMethod | ''
  visitingCard: UploadedFile | null; note: string
}
interface Step4 { personA: PersonA; personB: PersonB; decl1: boolean; decl2: boolean }

interface VendorSubmission {
  refNo: string; companyName: string; businessType: string
  gstNo: string; submittedOn: string; status: VendorStatus
  step1: Step1; step2: Step2; adminNote?: string
}

// ─────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────
const makeStep1 = (partial: Partial<Step1>): Step1 => ({
  companyName: '', tradeName: '', businessType: '', yearEstablished: '',
  natureOfBusiness: '', website: '', address: '', city: '', state: '',
  pincode: '', primaryContact: '', altContact: '', email: '', ...partial,
})
const makeStep2 = (partial: Partial<Step2>): Step2 => ({
  gstNumber: '', panNumber: '', tanNumber: '', cinNumber: '',
  msmeNumber: '', fssaiNumber: '', drugLicense: '', iecCode: '', tradeLicense: '', ...partial,
})

const MOCK_VENDORS: VendorSubmission[] = [
  {
    refNo: 'VND-20260401-0001', companyName: 'Raj Traders Pvt Ltd',
    businessType: 'Pvt Ltd', gstNo: '27AABCR1234H1Z5',
    submittedOn: '01 Apr 2026, 10:30 AM', status: 'Pending',
    step1: makeStep1({ companyName: 'Raj Traders Pvt Ltd', tradeName: 'Raj Traders', businessType: 'Pvt Ltd', yearEstablished: '2015', natureOfBusiness: 'Trader', website: 'www.rajtraders.com', address: '42, Nehru Market, Sector 18', city: 'Gurugram', state: 'Haryana', pincode: '122001', primaryContact: '9876543210', altContact: '9876543211', email: 'accounts@rajtraders.com' }),
    step2: makeStep2({ gstNumber: '27AABCR1234H1Z5', panNumber: 'AABCR1234H', tanNumber: 'DELR12345G', cinNumber: 'U51909HR2015PTC123456', msmeNumber: 'UDYAM-HR-01-1234567', tradeLicense: 'TL/2015/GGN/4567' }),
  },
  {
    refNo: 'VND-20260415-0002', companyName: 'Sri Foods & Beverages',
    businessType: 'Partnership', gstNo: '29AABCS5678K1Z2',
    submittedOn: '15 Apr 2026, 02:15 PM', status: 'Approved',
    step1: makeStep1({ companyName: 'Sri Foods & Beverages', tradeName: 'Sri Foods', businessType: 'Partnership', yearEstablished: '2009', natureOfBusiness: 'Manufacturer', address: 'Plot No 7, Industrial Area Phase 2', city: 'Bengaluru', state: 'Karnataka', pincode: '560058', primaryContact: '9845123456', email: 'info@srifoods.com' }),
    step2: makeStep2({ gstNumber: '29AABCS5678K1Z2', panNumber: 'AABCS5678K', msmeNumber: 'UDYAM-KA-05-9876543', fssaiNumber: 'FSSAI-KA-2024-123456' }),
  },
  {
    refNo: 'VND-20260422-0003', companyName: 'Metro Pharmaceuticals Pvt Ltd',
    businessType: 'Pvt Ltd', gstNo: '06AABCM9012P1Z8',
    submittedOn: '22 Apr 2026, 11:00 AM', status: 'Rejected',
    adminNote: 'GST certificate is expired. Please resubmit with valid documents dated within 3 months.',
    step1: makeStep1({ companyName: 'Metro Pharmaceuticals Pvt Ltd', tradeName: 'Metro Pharma', businessType: 'Pvt Ltd', yearEstablished: '2018', natureOfBusiness: 'Distributor', website: 'www.metropharma.in', address: 'Unit 12, Pharma Park, Sector 5', city: 'New Delhi', state: 'Delhi', pincode: '110064', primaryContact: '9811234567', altContact: '9811234568', email: 'compliance@metropharma.in' }),
    step2: makeStep2({ gstNumber: '06AABCM9012P1Z8', panNumber: 'AABCM9012P', tanNumber: 'DELM34567H', cinNumber: 'U24234DL2018PTC789012', drugLicense: 'DL/2018/DL/7890123', iecCode: '0518012345' }),
  },
  {
    refNo: 'VND-20260501-0004', companyName: 'Global Imports LLP',
    businessType: 'LLP', gstNo: '07AABCG3456L1Z3',
    submittedOn: '01 May 2026, 04:45 PM', status: 'On Hold',
    adminNote: 'Awaiting IEC code verification from DGFT portal. Contact vendor for updated certificate.',
    step1: makeStep1({ companyName: 'Global Imports LLP', tradeName: 'Global Imports', businessType: 'LLP', yearEstablished: '2021', natureOfBusiness: 'Import-Export', website: 'www.globalimports.co.in', address: 'Office 304, Trade Tower, Connaught Place', city: 'New Delhi', state: 'Delhi', pincode: '110001', primaryContact: '9899876543', altContact: '9899876544', email: 'ops@globalimports.co.in' }),
    step2: makeStep2({ gstNumber: '07AABCG3456L1Z3', panNumber: 'AABCG3456L', cinNumber: 'AAH-1234', iecCode: '0721098765' }),
  },
]

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
]

const STATUS_META: Record<VendorStatus, { cls: string; dot: string }> = {
  Pending:   { cls: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400' },
  Approved:  { cls: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  Rejected:  { cls: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500' },
  'On Hold': { cls: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function generateRefNo() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `VND-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}
function fmtSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function validGST(v: string) { return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v) }
function validPAN(v: string) { return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v) }
function validTAN(v: string) { return /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(v) }
function validPhone(v: string) { return /^\d{10}$/.test(v) }
function validEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }

// ─────────────────────────────────────────────────────────────
// Small UI primitives
// ─────────────────────────────────────────────────────────────
const ic = 'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all'
const iec = 'w-full px-3.5 py-2.5 bg-red-50 border border-red-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/25 focus:border-red-400 transition-all'
const sc = ic + ' appearance-none cursor-pointer'

function Lbl({ text, req }: { text: string; req?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-700 mb-1.5">{text}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
}
function Err({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{msg}</p>
}
function Hint({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 mb-1.5">{text}</p>
}

function SectionDivider({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-md flex items-center justify-center">{icon}</div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// FileUpload component
// ─────────────────────────────────────────────────────────────
function FileUpload({
  label, req, hint, value, onChange, accept = 'application/pdf,image/*', maxMB = 2, circular = false,
}: {
  label: string; req?: boolean; hint?: string
  value: UploadedFile | null; onChange: (f: UploadedFile | null) => void
  accept?: string; maxMB?: number; circular?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const process = useCallback((file: File) => {
    if (file.size > maxMB * 1048576) { alert(`Max file size is ${maxMB}MB`); return }
    const reader = new FileReader()
    reader.onload = e => onChange({ name: file.name, size: file.size, preview: e.target?.result as string, fileType: file.type })
    reader.readAsDataURL(file)
  }, [maxMB, onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    if (e.dataTransfer.files[0]) process(e.dataTransfer.files[0])
  }, [process])

  const isImg = value?.fileType?.startsWith('image/')

  return (
    <div>
      <Lbl text={label} req={req} />
      {hint && <Hint text={hint} />}
      {!value ? (
        <div
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
          onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          {circular
            ? <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400"><Camera size={24} /></div>
            : <Upload className="mx-auto mb-2 text-slate-400" size={24} />
          }
          <p className="text-xs font-semibold text-slate-500">Click to browse or drag file here</p>
          <p className="text-[11px] text-slate-400 mt-1">PDF / JPG / PNG · Max {maxMB}MB</p>
          <input ref={ref} type="file" className="hidden" accept={accept}
            onChange={e => { if (e.target.files?.[0]) process(e.target.files[0]); e.target.value = '' }} />
        </div>
      ) : (
        <div className={`flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl ${circular ? 'flex-col text-center' : ''}`}>
          {circular && isImg
            ? <img src={value.preview} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-300" />
            : isImg
              ? <img src={value.preview} alt="" className="w-12 h-12 rounded-lg object-cover border border-indigo-200 shrink-0" />
              : <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"><FileText className="text-indigo-600" size={20} /></div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{value.name}</p>
            <p className="text-[11px] text-slate-400">{fmtSize(value.size)}</p>
          </div>
          <button onClick={() => onChange(null)} className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors shrink-0 ml-auto">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Company Info', icon: <Building2 size={13} /> },
    { n: 2, label: 'Compliance',   icon: <Shield size={13} /> },
    { n: 3, label: 'Documents',    icon: <FileText size={13} /> },
    { n: 4, label: 'Contacts',     icon: <Users size={13} /> },
  ]
  return (
    <div className="mb-8">
      <div className="flex items-start">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${step > s.n ? 'bg-indigo-600 text-white' : step === s.n ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                {step > s.n ? <CheckCircle2 size={16} /> : s.icon}
              </div>
              <span className={`text-[10px] font-bold hidden sm:block text-center leading-tight
                ${step === s.n ? 'text-indigo-600' : step > s.n ? 'text-slate-500' : 'text-slate-300'}`}>{s.label}</span>
            </div>
            {i < 3 && (
              <div className={`h-0.5 flex-1 -mt-4 mx-1 transition-all ${step > s.n ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400 font-medium mt-3">Step {step} of 4</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function VendorPortal() {
  const [view, setView] = useState<'form' | 'admin'>('form')
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [refNo, setRefNo] = useState('')
  const [submittedAt, setSubmittedAt] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})

  // Form state
  const [s1, setS1] = useState<Step1>({ companyName: '', tradeName: '', businessType: '', yearEstablished: '', natureOfBusiness: '', website: '', address: '', city: '', state: '', pincode: '', primaryContact: '', altContact: '', email: '' })
  const [s2, setS2] = useState<Step2>({ gstNumber: '', panNumber: '', tanNumber: '', cinNumber: '', msmeNumber: '', fssaiNumber: '', drugLicense: '', iecCode: '', tradeLicense: '' })
  const [s3, setS3] = useState<Step3>({ gstCert: null, panCard: null, tanCert: null, cinCert: null, msmeCert: null, cancelledCheque: null, bankProof: null, letterhead: null, gstReturn: null })
  const [s4, setS4] = useState<Step4>({
    personA: { name: '', designation: '', mobile: '', email: '', idType: '', idNumber: '', idProof: null, photo: null, isPrimaryContact: false },
    personB: { name: '', designation: '', mobile: '', email: '', department: '', commMethod: '', visitingCard: null, note: '' },
    decl1: false, decl2: false,
  })

  // Admin state
  const [vendors, setVendors] = useState<VendorSubmission[]>(MOCK_VENDORS)
  const [selected, setSelected] = useState<VendorSubmission | null>(null)
  const [actionModal, setActionModal] = useState<{ type: 'reject' | 'hold' | 'info' | null; note: string }>({ type: null, note: '' })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<VendorStatus | 'All'>('All')

  const showCIN = ['LLP', 'Pvt Ltd', 'Public Ltd'].includes(s1.businessType)

  // ── Validation ────────────────────────────────────────────
  function v1() {
    const e: Record<string, string> = {}
    if (!s1.companyName.trim()) e.companyName = 'Company name is required'
    if (!s1.businessType) e.businessType = 'Select business type'
    if (!s1.yearEstablished) e.yearEstablished = 'Year of establishment is required'
    if (!s1.natureOfBusiness) e.natureOfBusiness = 'Select nature of business'
    if (!s1.address.trim()) e.address = 'Business address is required'
    if (!s1.city.trim()) e.city = 'City is required'
    if (!s1.state) e.state = 'Select state'
    if (!s1.pincode.trim() || !/^\d{6}$/.test(s1.pincode)) e.pincode = '6-digit PIN code required'
    if (!validPhone(s1.primaryContact)) e.primaryContact = 'Valid 10-digit mobile required'
    if (!validEmail(s1.email)) e.email = 'Valid email address required'
    setErrs(e); return Object.keys(e).length === 0
  }
  function v2() {
    const e: Record<string, string> = {}
    if (!s2.gstNumber.trim()) e.gstNumber = 'GST number is required'
    else if (!validGST(s2.gstNumber)) e.gstNumber = 'Invalid GSTIN (e.g. 27AABCR1234H1Z5)'
    if (!s2.panNumber.trim()) e.panNumber = 'PAN number is required'
    else if (!validPAN(s2.panNumber)) e.panNumber = 'Invalid PAN (e.g. AABCR1234H)'
    if (s2.tanNumber && !validTAN(s2.tanNumber)) e.tanNumber = 'Invalid TAN (e.g. DELR12345G)'
    setErrs(e); return Object.keys(e).length === 0
  }
  function v3() {
    const e: Record<string, string> = {}
    if (!s3.gstCert) e.gstCert = 'GST Certificate is required'
    if (!s3.panCard) e.panCard = 'PAN Card copy is required'
    if (!s3.cancelledCheque) e.cancelledCheque = 'Cancelled cheque is required'
    if (!s3.bankProof) e.bankProof = 'Bank account proof is required'
    setErrs(e); return Object.keys(e).length === 0
  }
  function v4() {
    const e: Record<string, string> = {}
    if (!s4.personA.name.trim()) e.pAName = 'Name is required'
    if (!s4.personA.designation.trim()) e.pADesig = 'Designation is required'
    if (!validPhone(s4.personA.mobile)) e.pAMobile = 'Valid 10-digit mobile required'
    if (!s4.personA.idType) e.pAIdType = 'Select ID proof type'
    if (!s4.personA.idNumber.trim()) e.pAIdNo = 'ID number is required'
    if (!s4.personA.photo) e.pAPhoto = 'Photo / selfie is required'
    if (!s4.personB.name.trim()) e.pBName = 'Name is required'
    if (!s4.personB.designation.trim()) e.pBDesig = 'Designation is required'
    if (!validPhone(s4.personB.mobile)) e.pBMobile = 'Valid 10-digit mobile required'
    if (!validEmail(s4.personB.email)) e.pBEmail = 'Valid email required'
    if (!s4.decl1) e.decl1 = 'Please confirm accuracy of information'
    if (!s4.decl2) e.decl2 = 'Please agree to Terms & Conditions'
    setErrs(e); return Object.keys(e).length === 0
  }

  function handleNext() {
    const ok = step === 1 ? v1() : step === 2 ? v2() : v3()
    if (ok) { setErrs({}); setStep(s => s + 1) }
  }

  function handleSubmit() {
    if (!v4()) return
    const ref = generateRefNo()
    const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    setVendors(prev => [{ refNo: ref, companyName: s1.companyName, businessType: s1.businessType, gstNo: s2.gstNumber, submittedOn: now, status: 'Pending', step1: s1, step2: s2 }, ...prev])
    setRefNo(ref); setSubmittedAt(now); setSubmitted(true)
  }

  function doAction(status: VendorStatus, note?: string) {
    if (!selected) return
    setVendors(prev => prev.map(v => v.refNo === selected.refNo ? { ...v, status, adminNote: note ?? v.adminNote } : v))
    setSelected(prev => prev ? { ...prev, status, adminNote: note ?? prev.adminNote } : null)
    setActionModal({ type: null, note: '' })
  }

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase()
    const matchQ = !q || v.companyName.toLowerCase().includes(q) || v.refNo.toLowerCase().includes(q) || v.gstNo.toLowerCase().includes(q)
    const matchS = filterStatus === 'All' || v.status === filterStatus
    return matchQ && matchS
  })

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
              <Building2 className="text-white" size={18} />
            </div>
            <div className="leading-tight">
              <p className="font-black text-slate-800 text-sm">Modern Bazaar</p>
              <p className="text-[11px] text-slate-400 font-medium">Vendor Portal</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['form', 'admin'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === v ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {v === 'form' ? 'Vendor Registration' : 'Admin Panel'}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-400 hidden sm:block font-medium">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </header>

      {/* ════════════════════════════════════════════════
          PUBLIC FORM
      ════════════════════════════════════════════════ */}
      {view === 'form' && (
        <div className="max-w-3xl mx-auto px-4 py-10">
          {!submitted ? (
            <>
              {/* Page heading */}
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                  <Shield size={11} /> Secure Vendor Onboarding
                </span>
                <h1 className="text-3xl font-black text-slate-800 mb-2">Supplier Registration</h1>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">Join the Modern Bazaar vendor network. All information is kept confidential.</p>
              </div>

              <ProgressBar step={step} />

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="p-6 sm:p-8 space-y-7">

                  {/* ──────────────────── STEP 1 ──────────────────── */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="pb-1">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Building2 className="text-indigo-600" size={20} /> Company Basic Information
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Legal entity details, address and contact information</p>
                      </div>

                      <SectionDivider title="Entity Details" icon={<Briefcase size={12} />} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <Lbl text="Company / Firm Name" req />
                          <input className={errs.companyName ? iec : ic} value={s1.companyName} placeholder="e.g. ABC Trading Private Limited"
                            onChange={e => setS1({ ...s1, companyName: e.target.value })} />
                          <Err msg={errs.companyName} />
                        </div>
                        <div>
                          <Lbl text="Trade Name / DBA" />
                          <Hint text="Also known as / Doing Business As" />
                          <input className={ic} value={s1.tradeName} placeholder="Trade name if different"
                            onChange={e => setS1({ ...s1, tradeName: e.target.value })} />
                        </div>
                        <div>
                          <Lbl text="Type of Business" req />
                          <select className={errs.businessType ? iec : sc} value={s1.businessType}
                            onChange={e => setS1({ ...s1, businessType: e.target.value as BusinessType })}>
                            <option value="">Select Type</option>
                            {['Proprietorship', 'Partnership', 'LLP', 'Pvt Ltd', 'Public Ltd', 'Other'].map(t => <option key={t}>{t}</option>)}
                          </select>
                          <Err msg={errs.businessType} />
                        </div>
                        <div>
                          <Lbl text="Year of Establishment" req />
                          <select className={errs.yearEstablished ? iec : sc} value={s1.yearEstablished}
                            onChange={e => setS1({ ...s1, yearEstablished: e.target.value })}>
                            <option value="">Select Year</option>
                            {Array.from({ length: 75 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}
                          </select>
                          <Err msg={errs.yearEstablished} />
                        </div>
                        <div>
                          <Lbl text="Nature of Business" req />
                          <select className={errs.natureOfBusiness ? iec : sc} value={s1.natureOfBusiness}
                            onChange={e => setS1({ ...s1, natureOfBusiness: e.target.value as NatureOfBusiness })}>
                            <option value="">Select Nature</option>
                            {['Manufacturer', 'Trader', 'Distributor', 'Service Provider', 'Import-Export', 'Other'].map(n => <option key={n}>{n}</option>)}
                          </select>
                          <Err msg={errs.natureOfBusiness} />
                        </div>
                        <div className="sm:col-span-2">
                          <Lbl text="Website URL" />
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input className={`${ic} pl-9`} value={s1.website} placeholder="https://www.yourcompany.com"
                              onChange={e => setS1({ ...s1, website: e.target.value })} />
                          </div>
                        </div>
                      </div>

                      <SectionDivider title="Registered Address" icon={<MapPin size={12} />} />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="sm:col-span-3">
                          <Lbl text="Business Address" req />
                          <textarea className={`${errs.address ? iec : ic} resize-none`} rows={3} value={s1.address}
                            placeholder="Full street address, building, area"
                            onChange={e => setS1({ ...s1, address: e.target.value })} />
                          <Err msg={errs.address} />
                        </div>
                        <div>
                          <Lbl text="City" req />
                          <input className={errs.city ? iec : ic} value={s1.city} placeholder="City"
                            onChange={e => setS1({ ...s1, city: e.target.value })} />
                          <Err msg={errs.city} />
                        </div>
                        <div>
                          <Lbl text="State" req />
                          <select className={errs.state ? iec : sc} value={s1.state}
                            onChange={e => setS1({ ...s1, state: e.target.value })}>
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                          </select>
                          <Err msg={errs.state} />
                        </div>
                        <div>
                          <Lbl text="PIN Code" req />
                          <input className={errs.pincode ? iec : ic} value={s1.pincode} placeholder="6-digit PIN" maxLength={6}
                            onChange={e => setS1({ ...s1, pincode: e.target.value.replace(/\D/g, '') })} />
                          <Err msg={errs.pincode} />
                        </div>
                      </div>

                      <SectionDivider title="Contact Information" icon={<Phone size={12} />} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <Lbl text="Primary Contact Number" req />
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input className={`${errs.primaryContact ? iec : ic} pl-9`} value={s1.primaryContact}
                              placeholder="10-digit mobile" maxLength={10}
                              onChange={e => setS1({ ...s1, primaryContact: e.target.value.replace(/\D/g, '') })} />
                          </div>
                          <Err msg={errs.primaryContact} />
                        </div>
                        <div>
                          <Lbl text="Alternate Contact Number" />
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input className={`${ic} pl-9`} value={s1.altContact} placeholder="Optional"
                              onChange={e => setS1({ ...s1, altContact: e.target.value.replace(/\D/g, '') })} />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <Lbl text="Official Email ID" req />
                          <Hint text="All future communications will be sent to this email" />
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input type="email" className={`${errs.email ? iec : ic} pl-9`} value={s1.email}
                              placeholder="contact@yourcompany.com"
                              onChange={e => setS1({ ...s1, email: e.target.value })} />
                          </div>
                          <Err msg={errs.email} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────── STEP 2 ──────────────────── */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="pb-1">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Shield className="text-indigo-600" size={20} /> Statutory & Compliance Details
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Legal registration numbers and government identifiers</p>
                      </div>

                      <SectionDivider title="Primary Tax Identifiers" icon={<CreditCard size={12} />} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <Lbl text="GST Number (GSTIN)" req />
                          <Hint text="15-character GST Identification Number" />
                          <input className={`${errs.gstNumber ? iec : ic} font-mono uppercase`} value={s2.gstNumber}
                            placeholder="e.g. 27AABCR1234H1Z5" maxLength={15}
                            onChange={e => setS2({ ...s2, gstNumber: e.target.value.toUpperCase() })} />
                          <Err msg={errs.gstNumber} />
                        </div>
                        <div>
                          <Lbl text="PAN Number" req />
                          <Hint text="10-character PAN" />
                          <input className={`${errs.panNumber ? iec : ic} font-mono uppercase`} value={s2.panNumber}
                            placeholder="e.g. AABCR1234H" maxLength={10}
                            onChange={e => setS2({ ...s2, panNumber: e.target.value.toUpperCase() })} />
                          <Err msg={errs.panNumber} />
                        </div>
                        <div>
                          <Lbl text="TAN Number" />
                          <Hint text="10-character TAN (if applicable)" />
                          <input className={`${errs.tanNumber ? iec : ic} font-mono uppercase`} value={s2.tanNumber}
                            placeholder="e.g. DELR12345G" maxLength={10}
                            onChange={e => setS2({ ...s2, tanNumber: e.target.value.toUpperCase() })} />
                          <Err msg={errs.tanNumber} />
                        </div>
                        {showCIN && (
                          <div className="sm:col-span-2">
                            <Lbl text="CIN Number" />
                            <Hint text="Company Identification Number (Pvt Ltd / Public Ltd / LLP)" />
                            <input className={`${ic} font-mono uppercase`} value={s2.cinNumber}
                              placeholder="e.g. U51909MH2015PTC123456"
                              onChange={e => setS2({ ...s2, cinNumber: e.target.value.toUpperCase() })} />
                          </div>
                        )}
                      </div>

                      <SectionDivider title="Optional Registrations" icon={<FileText size={12} />} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <Lbl text="MSME Registration Number" />
                          <Hint text="Udyam Registration Number" />
                          <input className={ic} value={s2.msmeNumber} placeholder="UDYAM-XX-XX-XXXXXXX"
                            onChange={e => setS2({ ...s2, msmeNumber: e.target.value.toUpperCase() })} />
                        </div>
                        <div>
                          <Lbl text="FSSAI License Number" />
                          <Hint text="For food & beverage vendors" />
                          <input className={`${ic} font-mono`} value={s2.fssaiNumber} placeholder="14-digit FSSAI number"
                            onChange={e => setS2({ ...s2, fssaiNumber: e.target.value })} />
                        </div>
                        <div>
                          <Lbl text="Drug License Number" />
                          <Hint text="For pharmaceutical vendors" />
                          <input className={ic} value={s2.drugLicense} placeholder="State drug license number"
                            onChange={e => setS2({ ...s2, drugLicense: e.target.value })} />
                        </div>
                        <div>
                          <Lbl text="IEC Code" />
                          <Hint text="Import Export Code (10 digits)" />
                          <input className={`${ic} font-mono`} value={s2.iecCode} placeholder="10-digit IEC"
                            onChange={e => setS2({ ...s2, iecCode: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                          <Lbl text="Trade License Number" />
                          <Hint text="Municipal / local body trade license" />
                          <input className={ic} value={s2.tradeLicense} placeholder="Trade license number"
                            onChange={e => setS2({ ...s2, tradeLicense: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────── STEP 3 ──────────────────── */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="pb-1">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <FileText className="text-indigo-600" size={20} /> Document Upload
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Upload clear, legible copies of all required documents</p>
                      </div>

                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <Info className="text-amber-600 shrink-0 mt-0.5" size={15} />
                        <p className="text-xs text-amber-700"><span className="font-bold">Upload Guidelines: </span>PDF / JPG / PNG · Max 2 MB per file · Documents must be clear, valid, and not expired</p>
                      </div>

                      <SectionDivider title="Required Documents" icon={<Shield size={12} />} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <FileUpload label="GST Registration Certificate" req value={s3.gstCert} onChange={f => setS3({ ...s3, gstCert: f })} />
                          <Err msg={errs.gstCert} />
                        </div>
                        <div>
                          <FileUpload label="PAN Card Copy" req value={s3.panCard} onChange={f => setS3({ ...s3, panCard: f })} />
                          <Err msg={errs.panCard} />
                        </div>
                        <div>
                          <FileUpload label="Cancelled Cheque" req hint="For bank account verification" value={s3.cancelledCheque} onChange={f => setS3({ ...s3, cancelledCheque: f })} />
                          <Err msg={errs.cancelledCheque} />
                        </div>
                        <div>
                          <FileUpload label="Bank Account Proof / Passbook" req hint="First page with account details" value={s3.bankProof} onChange={f => setS3({ ...s3, bankProof: f })} />
                          <Err msg={errs.bankProof} />
                        </div>
                      </div>

                      <SectionDivider title="Optional Documents" icon={<FileText size={12} />} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FileUpload label="TAN Certificate" value={s3.tanCert} onChange={f => setS3({ ...s3, tanCert: f })} />
                        {showCIN && (
                          <FileUpload label="CIN / Incorporation Certificate" value={s3.cinCert} onChange={f => setS3({ ...s3, cinCert: f })} />
                        )}
                        <FileUpload label="MSME Certificate" hint="Udyam Certificate" value={s3.msmeCert} onChange={f => setS3({ ...s3, msmeCert: f })} />
                        <FileUpload label="Company Letterhead Sample" value={s3.letterhead} onChange={f => setS3({ ...s3, letterhead: f })} />
                        <div className="sm:col-span-2">
                          <FileUpload label="GST Return (Last Filed 3B or R1)" hint="PDF of most recent GST return filing"
                            accept="application/pdf" value={s3.gstReturn} onChange={f => setS3({ ...s3, gstReturn: f })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────── STEP 4 ──────────────────── */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div className="pb-1">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Users className="text-indigo-600" size={20} /> Authorised Persons Details
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Two authorised contacts required for different business functions</p>
                      </div>

                      {/* Card A */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="bg-indigo-600 px-5 py-4 flex items-start gap-3">
                          <div className="w-7 h-7 bg-white/20 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0">A</div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Cheque Collection / Payment Pickup Person</h3>
                            <p className="text-indigo-200 text-xs mt-0.5">Person authorised to physically collect cheques or payments from our office</p>
                          </div>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white">
                          <div>
                            <Lbl text="Full Name" req />
                            <input className={errs.pAName ? iec : ic} value={s4.personA.name} placeholder="Full legal name"
                              onChange={e => setS4({ ...s4, personA: { ...s4.personA, name: e.target.value } })} />
                            <Err msg={errs.pAName} />
                          </div>
                          <div>
                            <Lbl text="Designation" req />
                            <input className={errs.pADesig ? iec : ic} value={s4.personA.designation} placeholder="e.g. Director, Manager"
                              onChange={e => setS4({ ...s4, personA: { ...s4.personA, designation: e.target.value } })} />
                            <Err msg={errs.pADesig} />
                          </div>
                          <div>
                            <Lbl text="Mobile Number" req />
                            <input className={errs.pAMobile ? iec : ic} value={s4.personA.mobile} placeholder="10-digit mobile" maxLength={10}
                              onChange={e => setS4({ ...s4, personA: { ...s4.personA, mobile: e.target.value.replace(/\D/g, '') } })} />
                            <Err msg={errs.pAMobile} />
                          </div>
                          <div>
                            <Lbl text="Email ID" />
                            <input type="email" className={ic} value={s4.personA.email} placeholder="person@company.com"
                              onChange={e => setS4({ ...s4, personA: { ...s4.personA, email: e.target.value } })} />
                          </div>
                          <div>
                            <Lbl text="ID Proof Type" req />
                            <select className={errs.pAIdType ? iec : sc} value={s4.personA.idType}
                              onChange={e => setS4({ ...s4, personA: { ...s4.personA, idType: e.target.value as IdProofType } })}>
                              <option value="">Select ID Type</option>
                              {['Aadhar', 'PAN', 'Voter ID', 'Passport', 'Driving License'].map(t => <option key={t}>{t}</option>)}
                            </select>
                            <Err msg={errs.pAIdType} />
                          </div>
                          <div>
                            <Lbl text="ID Proof Number" req />
                            <input className={`${errs.pAIdNo ? iec : ic} font-mono uppercase`} value={s4.personA.idNumber} placeholder="ID document number"
                              onChange={e => setS4({ ...s4, personA: { ...s4.personA, idNumber: e.target.value.toUpperCase() } })} />
                            <Err msg={errs.pAIdNo} />
                          </div>
                          <div>
                            <FileUpload label="Upload ID Proof" value={s4.personA.idProof}
                              onChange={f => setS4({ ...s4, personA: { ...s4.personA, idProof: f } })} />
                          </div>
                          <div>
                            <FileUpload label="Selfie / Photo" req hint="Clear face photo (JPG/PNG, max 1MB)"
                              accept="image/*" maxMB={1} circular value={s4.personA.photo}
                              onChange={f => setS4({ ...s4, personA: { ...s4.personA, photo: f } })} />
                            <Err msg={errs.pAPhoto} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={`flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border transition-colors ${s4.personA.isPrimaryContact ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                              <button type="button" onClick={() => setS4({ ...s4, personA: { ...s4.personA, isPrimaryContact: !s4.personA.isPrimaryContact } })}
                                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${s4.personA.isPrimaryContact ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${s4.personA.isPrimaryContact ? 'left-4' : 'left-0.5'}`} />
                              </button>
                              <span className="text-sm text-slate-700 font-medium">This person is also the primary contact</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Card B */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="bg-blue-600 px-5 py-4 flex items-start gap-3">
                          <div className="w-7 h-7 bg-white/20 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0">B</div>
                          <div>
                            <h3 className="font-bold text-white text-sm">Accounts / Ledger Communication Person</h3>
                            <p className="text-blue-200 text-xs mt-0.5">Person handling invoice queries, ledger reconciliation, and payment follow-ups</p>
                          </div>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white">
                          <div>
                            <Lbl text="Full Name" req />
                            <input className={errs.pBName ? iec : ic} value={s4.personB.name} placeholder="Full name"
                              onChange={e => setS4({ ...s4, personB: { ...s4.personB, name: e.target.value } })} />
                            <Err msg={errs.pBName} />
                          </div>
                          <div>
                            <Lbl text="Designation" req />
                            <input className={errs.pBDesig ? iec : ic} value={s4.personB.designation} placeholder="e.g. Accounts Manager"
                              onChange={e => setS4({ ...s4, personB: { ...s4.personB, designation: e.target.value } })} />
                            <Err msg={errs.pBDesig} />
                          </div>
                          <div>
                            <Lbl text="Mobile Number" req />
                            <input className={errs.pBMobile ? iec : ic} value={s4.personB.mobile} placeholder="10-digit mobile" maxLength={10}
                              onChange={e => setS4({ ...s4, personB: { ...s4.personB, mobile: e.target.value.replace(/\D/g, '') } })} />
                            <Err msg={errs.pBMobile} />
                          </div>
                          <div>
                            <Lbl text="Email ID" req />
                            <input type="email" className={errs.pBEmail ? iec : ic} value={s4.personB.email} placeholder="accounts@company.com"
                              onChange={e => setS4({ ...s4, personB: { ...s4.personB, email: e.target.value } })} />
                            <Err msg={errs.pBEmail} />
                          </div>
                          <div>
                            <Lbl text="Department" />
                            <select className={sc} value={s4.personB.department}
                              onChange={e => setS4({ ...s4, personB: { ...s4.personB, department: e.target.value as Department } })}>
                              <option value="">Select Department</option>
                              {['Accounts', 'Finance', 'Admin', 'Other'].map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <Lbl text="Preferred Communication" />
                            <select className={sc} value={s4.personB.commMethod}
                              onChange={e => setS4({ ...s4, personB: { ...s4.personB, commMethod: e.target.value as CommMethod } })}>
                              <option value="">Select Method</option>
                              {['Email', 'WhatsApp', 'Phone', 'All'].map(m => <option key={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <FileUpload label="Visiting Card or ID" hint="Optional" value={s4.personB.visitingCard}
                              onChange={f => setS4({ ...s4, personB: { ...s4.personB, visitingCard: f } })} />
                          </div>
                          <div className="sm:col-span-2">
                            <Lbl text="Note / Remark" />
                            <Hint text="Special instructions for the accounts team" />
                            <textarea className={`${ic} resize-none`} rows={3} value={s4.personB.note}
                              placeholder="Payment terms preference, special instructions, etc."
                              onChange={e => setS4({ ...s4, personB: { ...s4.personB, note: e.target.value } })} />
                          </div>
                        </div>
                      </div>

                      {/* Declaration */}
                      <SectionDivider title="Declaration & Submission" icon={<Shield size={12} />} />
                      <div className="space-y-3">
                        {[
                          { key: 'decl1', checked: s4.decl1, err: errs.decl1, onChange: (v: boolean) => setS4({ ...s4, decl1: v }), text: 'I confirm that all information provided in this form is accurate, complete, and up-to-date. I take full responsibility for the authenticity of submitted documents.' },
                          { key: 'decl2', checked: s4.decl2, err: errs.decl2, onChange: (v: boolean) => setS4({ ...s4, decl2: v }), text: 'I agree to the Terms & Conditions and Privacy Policy of Modern Bazaar Vendor Portal.' },
                        ].map(d => (
                          <div key={d.key}>
                            <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border transition-colors ${d.checked ? 'bg-indigo-50 border-indigo-200' : d.err ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                              <input type="checkbox" checked={d.checked} onChange={e => d.onChange(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 shrink-0" />
                              <span className="text-sm text-slate-700">{d.text}</span>
                            </label>
                            <Err msg={d.err} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex gap-3 pt-5 border-t border-slate-100">
                    {step > 1 && (
                      <button onClick={() => { setErrs({}); setStep(s => s - 1) }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors">
                        <ChevronLeft size={16} /> Previous
                      </button>
                    )}
                    <div className="flex-1" />
                    {step < 4 ? (
                      <button onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200">
                        Next <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button onClick={handleSubmit}
                        className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-indigo-200">
                        <CheckCircle2 size={16} /> Submit Application
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-center text-slate-400 text-xs mt-5">
                Need help? Email <span className="text-indigo-600 font-semibold">procurement@modernbazaar.com</span>
              </p>
            </>
          ) : (
            /* ── Success Screen ── */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-600" />
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="text-green-600" size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Submission Received!</h2>
                <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
                  Thank you for registering with Modern Bazaar. Our team will review your application within <strong>2–3 business days</strong>.
                </p>

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 max-w-xs mx-auto">
                  <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Application Reference Number</p>
                  <p className="text-2xl font-black text-indigo-700 font-mono tracking-wider">{refNo}</p>
                  <p className="text-xs text-slate-400 mt-2">Submitted: {submittedAt}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
                  {[
                    { n: '✓', label: 'Received', desc: 'Form submitted', done: true },
                    { n: '2', label: 'Under Review', desc: '2–3 business days', done: false },
                    { n: '3', label: 'Code Issued', desc: 'Email notification', done: false },
                  ].map(item => (
                    <div key={item.n} className={`p-3 rounded-xl border text-center ${item.done ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold ${item.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{item.n}</div>
                      <p className="text-[11px] font-bold text-slate-700">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <button onClick={() => { setSubmitted(false); setStep(1) }}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors">
                  Register Another Vendor
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ADMIN PANEL
      ════════════════════════════════════════════════ */}
      {view === 'admin' && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Vendor Applications</h2>
              <p className="text-slate-400 text-sm">Review and manage all vendor registration submissions</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(['All', 'Pending', 'Approved', 'Rejected', 'On Hold'] as const).map(s => {
                const cnt = s === 'All' ? vendors.length : vendors.filter(v => v.status === s).length
                return (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                    {s} <span className={`ml-1 ${filterStatus === s ? 'opacity-75' : 'text-slate-400'}`}>({cnt})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input className={`${ic} pl-10 bg-white`} value={search} placeholder="Search by company, ref no, or GST number…"
              onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Ref No', 'Company Name', 'Business Type', 'GST Number', 'Submitted On', 'Status', ''].map(h => (
                      <th key={h} className={`px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider ${['Business Type', 'GST Number'].includes(h) ? 'hidden md:table-cell' : h === 'Submitted On' ? 'hidden lg:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <Search className="mx-auto mb-3 text-slate-300" size={32} />
                        <p className="text-slate-400 font-semibold text-sm">No applications found</p>
                      </td>
                    </tr>
                  ) : filtered.map(v => (
                    <tr key={v.refNo} onClick={() => setSelected(v)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group">
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono font-bold text-indigo-600">{v.refNo}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                            {v.companyName.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{v.companyName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{v.businessType}</td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{v.gstNo}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400 hidden lg:table-cell">{v.submittedOn}</td>
                      <td className="px-5 py-4"><StatusBadge status={v.status} /></td>
                      <td className="px-5 py-4">
                        <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition-all hover:bg-indigo-100">
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          VENDOR DETAIL MODAL
      ════════════════════════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="px-6 py-5 border-b border-slate-100 shrink-0 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs font-mono text-slate-400">{selected.refNo}</span>
                </div>
                <h3 className="text-lg font-black text-slate-800">{selected.companyName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Submitted: {selected.submittedOn}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Admin note */}
              {selected.adminNote && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Info className="text-amber-600 shrink-0 mt-0.5" size={15} />
                  <div>
                    <p className="text-xs font-bold text-amber-700 mb-1">Admin Note</p>
                    <p className="text-sm text-amber-800">{selected.adminNote}</p>
                  </div>
                </div>
              )}

              {/* Company info */}
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Building2 size={13} /> Company Information</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ['Company Name', selected.step1.companyName],
                    ['Trade Name', selected.step1.tradeName || '—'],
                    ['Business Type', selected.step1.businessType],
                    ['Nature', selected.step1.natureOfBusiness],
                    ['Est. Year', selected.step1.yearEstablished],
                    ['Website', selected.step1.website || '—'],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{l}</p>
                      <p className="text-sm font-semibold text-slate-700 break-words">{v}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Address & contact */}
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin size={13} /> Address & Contact</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Full Address</p>
                    <p className="text-sm text-slate-700">{selected.step1.address}, {selected.step1.city}, {selected.step1.state} — {selected.step1.pincode}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Primary Contact</p>
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{selected.step1.primaryContact}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Email</p>
                      <p className="text-sm font-semibold text-indigo-600 flex items-center gap-1.5"><Mail size={12} />{selected.step1.email}</p>
                    </div>
                    {selected.step1.website && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Website</p>
                        <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Globe size={12} className="text-slate-400" />{selected.step1.website}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Compliance */}
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Shield size={13} /> Compliance & Registrations</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ['GSTIN', selected.step2.gstNumber],
                    ['PAN', selected.step2.panNumber],
                    ['TAN', selected.step2.tanNumber],
                    ['CIN', selected.step2.cinNumber],
                    ['MSME', selected.step2.msmeNumber],
                    ['FSSAI', selected.step2.fssaiNumber],
                    ['Drug License', selected.step2.drugLicense],
                    ['IEC Code', selected.step2.iecCode],
                    ['Trade License', selected.step2.tradeLicense],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{l}</p>
                      <p className={`text-xs font-semibold break-all ${v ? 'text-slate-800 font-mono' : 'text-slate-300'}`}>{v || '—'}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Documents */}
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText size={13} /> Documents</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['GST Certificate', 'PAN Card', 'Cancelled Cheque', 'Bank Proof', 'TAN Certificate', 'Company Letterhead', 'GST Return (3B/R1)'].map(doc => (
                    <button key={doc} className="border border-dashed border-slate-200 rounded-xl p-3.5 flex items-center gap-2.5 hover:bg-slate-50 hover:border-indigo-300 transition-colors text-left group">
                      <div className="w-9 h-9 bg-slate-100 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 transition-colors">
                        <FileText className="text-slate-400 group-hover:text-indigo-600 transition-colors" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-600 leading-tight truncate">{doc}</p>
                        <p className="text-[10px] text-indigo-500 mt-0.5 flex items-center gap-0.5"><ExternalLink size={9} /> View</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Actions footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => doAction('Approved')} disabled={selected.status === 'Approved'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors">
                  <ThumbsUp size={14} /> Approve
                </button>
                <button onClick={() => setActionModal({ type: 'reject', note: '' })} disabled={selected.status === 'Rejected'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors">
                  <ThumbsDown size={14} /> Reject
                </button>
                <button onClick={() => setActionModal({ type: 'hold', note: '' })} disabled={selected.status === 'On Hold'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors">
                  <Pause size={14} /> Put On Hold
                </button>
                <button onClick={() => setActionModal({ type: 'info', note: '' })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors">
                  <MessageSquare size={14} /> Request More Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ACTION REASON MODAL
      ════════════════════════════════════════════════ */}
      {actionModal.type && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`h-1.5 ${actionModal.type === 'reject' ? 'bg-red-500' : actionModal.type === 'hold' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <div className="p-6">
              <h4 className="font-bold text-slate-800 text-base mb-1">
                {actionModal.type === 'reject' ? '❌ Reject Application' : actionModal.type === 'hold' ? '⏸ Put On Hold' : '💬 Request More Information'}
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                {actionModal.type === 'reject'
                  ? 'Provide a reason for rejection. This will be communicated to the vendor.'
                  : actionModal.type === 'hold'
                    ? 'Specify what is pending before this application can proceed.'
                    : 'Describe what additional information or documents are needed.'}
              </p>
              <textarea
                className={`${ic} resize-none mb-5`} rows={4}
                placeholder="Enter your note here…"
                value={actionModal.note}
                onChange={e => setActionModal({ ...actionModal, note: e.target.value })}
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setActionModal({ type: null, note: '' })}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button
                  disabled={!actionModal.note.trim()}
                  onClick={() => {
                    const map: Record<string, VendorStatus> = { reject: 'Rejected', hold: 'On Hold', info: 'On Hold' }
                    doAction(map[actionModal.type!], actionModal.note)
                  }}
                  className={`flex-1 px-4 py-2.5 font-semibold rounded-xl text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                    ${actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : actionModal.type === 'hold' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
