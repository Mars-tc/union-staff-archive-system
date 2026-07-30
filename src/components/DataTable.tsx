import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column[]
  data: T[]
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
  pagination?: boolean
  selectable?: boolean
  selectedIds?: number[]
  onSelectChange?: (ids: number[]) => void
  getId?: (row: T) => number
}

export const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  actions,
  pagination = true,
  selectable = false,
  selectedIds = [],
  onSelectChange,
  getId = (row) => row.id,
}: DataTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(data.length / pageSize)
  const paginatedData = pagination
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data

  const isAllSelected = useMemo(() => {
    if (!selectable || paginatedData.length === 0) return false
    return paginatedData.every((row) => selectedIds.includes(getId(row)))
  }, [selectable, paginatedData, selectedIds, getId])

  const handleSelectAll = () => {
    if (!onSelectChange) return
    if (isAllSelected) {
      const newIds = selectedIds.filter((id) => !paginatedData.some((row) => getId(row) === id))
      onSelectChange(newIds)
    } else {
      const pageIds = paginatedData.map((row) => getId(row))
      const newIds = [...new Set([...selectedIds, ...pageIds])]
      onSelectChange(newIds)
    }
  }

  const handleSelect = (row: T) => {
    if (!onSelectChange) return
    const rowId = getId(row)
    if (selectedIds.includes(rowId)) {
      onSelectChange(selectedIds.filter((id) => id !== rowId))
    } else {
      onSelectChange([...selectedIds, rowId])
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">暂无数据</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((row, index) => {
              const rowId = getId(row)
              const isSelected = selectedIds.includes(rowId)
              return (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${isSelected ? 'bg-blue-50' : ''} transition-colors`}
                >
                  {selectable && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelect(row)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, data.length)} 条，共 {data.length} 条
          </p>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
