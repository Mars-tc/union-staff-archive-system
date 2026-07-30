import { useEffect, useState } from 'react'
import { FileText, Trash2, Search, Calendar, Filter, Eye } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface Log {
  id: number
  user_id: number | null
  action: string
  resource: string | null
  resource_id: number | null
  details: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_name: string | null
  user_email: string | null
}

const actionLabels: Record<string, string> = {
  login: '登录系统',
  logout: '退出登录',
  create_user: '创建用户',
  update_user: '更新用户',
  delete_user: '删除用户',
  batch_create_users: '批量创建用户',
  batch_update_users: '批量更新用户',
  batch_delete_users: '批量删除用户',
  apply_membership: '提交入会申请',
  audit_membership: '审核入会申请',
  apply_fee: '提交会费授权',
  audit_fee: '审核会费授权',
  apply_difficulty: '提交困难帮扶申请',
  audit_difficulty: '审核困难帮扶申请',
  import_difficulty: '批量导入困难档案',
  apply_mutual_aid: '提交爱心互助会申请',
  audit_mutual_aid: '审核爱心互助会申请',
  update_profile: '更新个人信息',
  change_password: '修改密码',
}

const getActionLabel = (action: string) => {
  return actionLabels[action] || action
}

const getActionColor = (action: string) => {
  if (action.includes('create') || action.includes('apply')) return 'bg-green-100 text-green-700'
  if (action.includes('update')) return 'bg-blue-100 text-blue-700'
  if (action.includes('delete')) return 'bg-red-100 text-red-700'
  if (action.includes('audit')) return 'bg-purple-100 text-purple-700'
  if (action.includes('login')) return 'bg-orange-100 text-orange-700'
  if (action.includes('logout')) return 'bg-gray-100 text-gray-700'
  return 'bg-yellow-100 text-yellow-700'
}

const getResourceLabel = (resource: string | null) => {
  const resourceLabels: Record<string, string> = {
    users: '用户',
    membership: '入会申请',
    fee: '会费授权',
    difficulty: '困难帮扶',
    mutual_aid: '爱心互助会',
    profile: '个人信息',
  }
  return resource ? (resourceLabels[resource] || resource) : '-'
}

export const Logs = () => {
  const { showError, showSuccess } = useToast()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    type?: 'warning' | 'success' | 'error' | 'info'
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params: { page?: number; limit?: number; action?: string; userId?: number; startDate?: string; endDate?: string } = {
        page,
        limit,
      }
      if (filterAction) params.action = filterAction
      if (filterUserId) params.userId = parseInt(filterUserId)
      if (filterStartDate) params.startDate = filterStartDate
      if (filterEndDate) params.endDate = filterEndDate

      const response = await api.logs.getLogs(params)
      if (response.success) {
        setLogs(response.data)
        setTotal(response.total || 0)
      }
    } catch {
        showError('获取日志失败')
      } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, filterAction, filterUserId, filterStartDate, filterEndDate])

  const handleDelete = (logId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: '确认删除',
      message: '确定要删除该日志吗？',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await api.logs.deleteLog(logId)
          if (response.success) {
            setLogs(logs.filter((l) => l.id !== logId))
            setTotal(total - 1)
            showSuccess('日志删除成功')
          }
        } catch {
          showError('删除日志失败')
        }
      },
    })
  }

  const handleBatchDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: '确认批量删除',
      message: `确定要删除选中的 ${selectedLogIds.length} 条日志吗？`,
      type: 'warning',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          const response = await api.logs.batchDeleteLogs(selectedLogIds)
          if (response.success) {
            setLogs(logs.filter((l) => !selectedLogIds.includes(l.id)))
            setTotal(total - selectedLogIds.length)
            setSelectedLogIds([])
            showSuccess(`成功删除 ${selectedLogIds.length} 条日志`)
          } else {
            showError(response.error || '批量删除失败')
          }
        } catch {
          showError('批量删除失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleViewDetail = (log: Log) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const clearFilters = () => {
    setFilterAction('')
    setFilterUserId('')
    setFilterStartDate('')
    setFilterEndDate('')
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const actions = Object.keys(actionLabels)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText size={28} className="text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">系统日志</h2>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            共 <strong>{total}</strong> 条日志
          </span>
          <button
            onClick={handleBatchDelete}
            disabled={selectedLogIds.length === 0 || actionLoading}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} className="mr-2" />
            批量删除
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter size={18} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部</option>
              {actions.map((action) => (
                <option key={action} value={action}>{actionLabels[action]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户ID</label>
            <input
              type="number"
              value={filterUserId}
              onChange={(e) => {
                setFilterUserId(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入用户ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            清除筛选
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Search size={16} className="mr-1" />
            查询
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">暂无日志记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLogIds.length === logs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLogIds(logs.map((l) => l.id))
                        } else {
                          setSelectedLogIds([])
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">资源</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">详情</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLogIds.includes(log.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogIds([...selectedLogIds, log.id])
                          } else {
                            setSelectedLogIds(selectedLogIds.filter((id) => id !== log.id))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {getResourceLabel(log.resource)}
                        {log.resource_id && log.resource && ` #${log.resource_id}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {log.user_name ? (
                          <span>{log.user_name}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {log.user_email && (
                          <span className="text-gray-400 ml-2">({log.user_email})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-600 truncate" title={log.details || ''}>
                        {log.details || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600 font-mono">
                        {log.ip_address || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(log)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="查看详情"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    显示第{' '}
                    <span className="font-medium">
                      {(page - 1) * limit + 1}
                    </span>{' '}
                    到{' '}
                    <span className="font-medium">
                      {Math.min(page * limit, total)}
                    </span>{' '}
                    条，共{' '}
                    <span className="font-medium">{total}</span>{' '}
                    条
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }, (_, i) => {
                      let pageNum
                      if (Math.ceil(total / limit) <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= Math.ceil(total / limit) - 2) {
                        pageNum = Math.ceil(total / limit) - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= Math.ceil(total / limit)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">日志详情</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">日志ID</label>
                  <p className="text-sm text-gray-700 font-mono">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">操作类型</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getActionColor(selectedLog.action)}`}>
                    {getActionLabel(selectedLog.action)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">资源类型</label>
                  <p className="text-sm text-gray-700">{getResourceLabel(selectedLog.resource)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">资源ID</label>
                  <p className="text-sm text-gray-700">{selectedLog.resource_id || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">用户ID</label>
                  <p className="text-sm text-gray-700 font-mono">{selectedLog.user_id || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">用户名称</label>
                  <p className="text-sm text-gray-700">{selectedLog.user_name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">用户邮箱</label>
                  <p className="text-sm text-gray-700">{selectedLog.user_email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">IP地址</label>
                  <p className="text-sm text-gray-700 font-mono">{selectedLog.ip_address || '-'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">详情</label>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[60px]">
                  {selectedLog.details || '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">User Agent</label>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[40px] font-mono text-xs overflow-x-auto">
                  {selectedLog.user_agent || '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">操作时间</label>
                <p className="text-sm text-gray-700">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  )
}