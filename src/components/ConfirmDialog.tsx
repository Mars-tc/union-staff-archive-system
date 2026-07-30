import { useEffect } from 'react'
import { AlertCircle, X, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export type ConfirmType = 'warning' | 'success' | 'error' | 'info'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: ConfirmType
  confirmText?: string
  cancelText?: string
}

const icons = {
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const styles: Record<ConfirmType, { icon: string; bg: string; border: string; text: string; button: string }> = {
  warning: {
    icon: 'text-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  success: {
    icon: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    button: 'bg-green-600 hover:bg-green-700',
  },
  error: {
    icon: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    button: 'bg-red-600 hover:bg-red-700',
  },
  info: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = '确定',
  cancelText = '取消',
}: ConfirmDialogProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const Icon = icons[type]
  const style = styles[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className={`flex items-start space-x-4 ${style.bg} ${style.border} p-4 rounded-lg`}>
            <Icon size={24} className={`${style.icon} flex-shrink-0`} />
            <div>
              <p className={`text-sm font-medium ${style.text}`}>{message}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${style.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}