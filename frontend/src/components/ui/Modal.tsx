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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-app-card text-text-primary rounded-xl shadow-xl w-full ${width} mx-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold m-0">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-md text-text-muted hover:bg-app-bg hover:text-text-primary text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
