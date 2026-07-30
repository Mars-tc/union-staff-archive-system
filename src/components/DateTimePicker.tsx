import { Clock } from 'lucide-react'

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export const DateTimePicker = ({ value, onChange, label }: DateTimePickerProps) => {
  const handleNow = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    onChange(`${year}-${month}-${day}T${hours}:${minutes}`)
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center space-x-2">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleNow}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Clock size={16} className="mr-1" />
          此刻
        </button>
      </div>
    </div>
  )
}