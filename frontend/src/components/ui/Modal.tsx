interface modal_props {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  width?: string
}

export default function modal({ title, open, onClose, children, width = 'max-w-md' }: modal_props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} mx-4`}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
