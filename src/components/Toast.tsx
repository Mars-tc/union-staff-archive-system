import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { Toast, ToastType, useToast } from '../context/ToastContext'

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const iconStyles: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}

const ToastItem = ({ toast }: { toast: Toast }) => {
  const { removeToast } = useToast()
  const Icon = icons[toast.type]

  return (
    <div
      className={`flex items-center justify-between px-6 py-4 border-2 rounded-xl shadow-lg shadow-black/20 ${styles[toast.type]} animate-bounce-in`}
    >
      <div className="flex items-center space-x-4">
        <Icon size={28} className={iconStyles[toast.type]} />
        <span className="text-lg font-semibold">{toast.message}</span>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-2 hover:bg-black/10 rounded-lg transition-colors"
      >
        <X size={20} className="opacity-70" />
      </button>
    </div>
  )
}

export const ToastContainer = () => {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col space-y-3 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}