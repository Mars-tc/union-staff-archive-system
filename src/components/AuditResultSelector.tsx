import { CheckCircle, XCircle } from 'lucide-react'

interface AuditResultSelectorProps {
  value: 'approved' | 'rejected'
  onChange: (value: 'approved' | 'rejected') => void
  name?: string
}

export const AuditResultSelector = ({ value, onChange, name = 'auditStatus' }: AuditResultSelectorProps) => {
  return (
    <div className="flex space-x-4">
      <label
        className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
          value === 'approved'
            ? 'border-green-500 bg-green-50 shadow-lg shadow-green-100'
            : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
        }`}
      >
        <input
          type="radio"
          name={name}
          value="approved"
          checked={value === 'approved'}
          onChange={(e) => onChange(e.target.value as 'approved' | 'rejected')}
          className="sr-only"
        />
        <div className={`flex items-center space-x-3 ${value === 'approved' ? 'text-green-700' : 'text-gray-600'}`}>
          <div
            className={`p-2 rounded-full transition-all duration-300 ${
              value === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <CheckCircle size={24} strokeWidth={2.5} />
          </div>
          <span className={`font-medium text-base ${value === 'approved' ? 'text-green-700' : 'text-gray-600'}`}>
            通过
          </span>
        </div>
      </label>

      <label
        className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
          value === 'rejected'
            ? 'border-red-500 bg-red-50 shadow-lg shadow-red-100'
            : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50'
        }`}
      >
        <input
          type="radio"
          name={name}
          value="rejected"
          checked={value === 'rejected'}
          onChange={(e) => onChange(e.target.value as 'approved' | 'rejected')}
          className="sr-only"
        />
        <div className={`flex items-center space-x-3 ${value === 'rejected' ? 'text-red-700' : 'text-gray-600'}`}>
          <div
            className={`p-2 rounded-full transition-all duration-300 ${
              value === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <XCircle size={24} strokeWidth={2.5} />
          </div>
          <span className={`font-medium text-base ${value === 'rejected' ? 'text-red-700' : 'text-gray-600'}`}>
            拒绝
          </span>
        </div>
      </label>
    </div>
  )
}