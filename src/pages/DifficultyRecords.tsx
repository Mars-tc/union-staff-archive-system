import { useEffect, useState, useRef } from 'react'
import { FileText, Search, User, Heart, TrendingUp, Filter, Upload, CheckCircle, XCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface DifficultyRecord {
  user_id: number
  name: string
  email: string
  phone: string
  department: string | null
  applications: Array<{
    application_id: number
    disease_name: string
    category: string
    amount: number
    reason: string
    status: string
    created_at: string
    difficulty_category: string
    actual_amount: number | null
    audit_step: string
    family_income: number | null
    personal_income: number | null
    dependents_count: number | null
    is_retired: boolean
    is_one_time: boolean
    apply_count: number
    employee_id: string | null
    applied_before: boolean
    remark: string | null
  }>
}

const categoryLabels: { [key: string]: string } = {
  disability: '伤残致困',
  accident: '意外致困',
  disease: '因病致困',
  education: '子女助学',
  special: '特殊困难',
}

const auditStepLabels: { [key: string]: string } = {
  pending: '待审批',
  grass_root: '待基层工会审核',
  union_committee: '待委员会审核',
  completed: '已完成',
}

export const DifficultyRecords = () => {
  const { user } = useAuthStore()
  const { showError, showWarning } = useToast()
  const isAdmin = user?.role === 'admin'
  const [records, setRecords] = useState<DifficultyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<DifficultyRecord | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; total_amount: number; category_stats: Array<{ difficulty_category: string; count: number; amount: number }> } | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; success: number; failed: number; details: Array<{ success: boolean; message: string; row: number; createdUser?: { name: string; email: string; password: string; employeeId: string; department: string } }> } | null>(null)
  const [previewResult, setPreviewResult] = useState<{ total: number; matched: number; unmatched: number; matchedRows: Array<{ row: number; name: string; employeeId: string; phone: string; department: string; userId: number }>; unmatchedRows: Array<{ row: number; name: string; employeeId: string; phone: string; department: string }> } | null>(null)
  const [showCreateUserConfirm, setShowCreateUserConfirm] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsResponse, statsResponse] = await Promise.all([
          api.difficulty.getRecords(),
          api.difficulty.getStats(),
        ])
        if (recordsResponse.success) {
          setRecords(recordsResponse.data)
          setError('')
        } else if (recordsResponse.error) {
          setError(recordsResponse.error)
        }
        if (statsResponse.success) {
          setStats(statsResponse.data)
        }
      } catch {
        showError('获取数据失败')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handlePreview(file)
    }
  }

  const handlePreview = async (file: File) => {
    setImportLoading(true)
    setImportResult(null)
    setPreviewResult(null)

    try {
      const response = await api.difficulty.importPreview(file)
      if (response.success) {
        setPreviewResult(response.data)
        setCurrentFile(file)
        if (response.data.unmatched > 0) {
          setShowCreateUserConfirm(true)
          setImportLoading(false)
        } else {
          await handleConfirmImport(false)
        }
      } else {
        showError(`预览失败: ${response.error}`)
        setImportLoading(false)
      }
    } catch (error) {
      showError(`预览失败: ${(error as Error).message}`)
      setImportLoading(false)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleConfirmImport = async (createUsers: boolean) => {
    setShowCreateUserConfirm(false)
    setImportLoading(true)

    try {
      if (!currentFile) {
        showError('请选择文件')
        return
      }

      const response = await api.difficulty.importRecords(currentFile, createUsers)
      if (response.success) {
        setImportResult(response.data)
        const [recordsResponse, statsResponse] = await Promise.all([
          api.difficulty.getRecords(),
          api.difficulty.getStats(),
        ])
        if (recordsResponse.success) {
          setRecords(recordsResponse.data)
        }
        if (statsResponse.success) {
          setStats(statsResponse.data)
        }
      } else {
        showError(`导入失败: ${response.error}`)
      }
    } catch (error) {
      showError(`导入失败: ${(error as Error).message}`)
    } finally {
      setImportLoading(false)
      setCurrentFile(null)
      setPreviewResult(null)
    }
  }

  const handleExportCreatedUsers = () => {
    if (!importResult) return

    const createdUsers = importResult.details.filter(d => d.createdUser)
    if (createdUsers.length === 0) {
      showWarning('没有新创建的用户')
      return
    }

    const headers = ['序号', '姓名', '员工编码', '邮箱', '密码', '所属单位']
    const templateData = createdUsers.map((d, index) => ({
      '序号': index + 1,
      '姓名': d.createdUser?.name || '',
      '员工编码': d.createdUser?.employeeId || '',
      '邮箱': d.createdUser?.email || '',
      '密码': d.createdUser?.password || '',
      '所属单位': d.createdUser?.department || '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(templateData, { header: headers })
    worksheet['!cols'] = headers.map(() => ({ wch: 15 }))

    const warningSheet = XLSX.utils.json_to_sheet([
      { '': '⚠️ 安全提示' },
      { '': '' },
      { '': '本文件包含新创建用户的账号和密码信息，请妥善保管。' },
      { '': '建议将密码发放给用户后立即删除本文件。' },
      { '': '用户首次登录后应尽快修改密码。' },
      { '': '' },
      { '': '生成时间：' + new Date().toLocaleString('zh-CN') },
    ], { header: [''] })

    const workbook = {
      SheetNames: ['安全提示', '新创建用户账号'],
      Sheets: { '安全提示': warningSheet, '新创建用户账号': worksheet }
    }

    XLSX.writeFile(workbook, '新创建用户账号.xlsx')
  }

  const handleDownloadTemplate = () => {
    const headers = ['序号', '姓名', '员工编码/身份证号', '所属单位', '联系电话', '家庭年收入（万元）', '个人年收入（万元）', '需要抚养人数', '是否退休', '是否申请过困难帮扶', '困难帮扶申请类别', '申请原因', '是否属于一次性领取', '困难帮扶金额（元）', '帮扶次数', '备注']
    const templateData = [
      {
        '序号': 1,
        '姓名': '张三',
        '员工编码/身份证号': 'EMP001',
        '所属单位': '第一车间',
        '联系电话': '13800138001',
        '家庭年收入（万元）': 5,
        '个人年收入（万元）': 3,
        '需要抚养人数': 2,
        '是否退休': '否',
        '是否申请过困难帮扶': '是',
        '困难帮扶申请类别': '因病致困',
        '申请原因': '因病致困',
        '是否属于一次性领取': '是',
        '困难帮扶金额（元）': 5000,
        '帮扶次数': 1,
        '备注': '无',
      }
    ]

    const worksheet = {
      '!cols': headers.map(() => ({ wch: 15 })),
      ...headers.reduce((acc, header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
        acc[cellRef] = { v: header, t: 's' }
        return acc
      }, {} as Record<string, { v: string; t: 's' }>),
      ...templateData.reduce((acc, row, rowIndex) => {
        headers.forEach((header, colIndex) => {
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex })
          const value = row[header as keyof typeof row]
          acc[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's' }
        })
        return acc
      }, {} as Record<string, { v: unknown; t: 's' | 'n' }>)
    }

    const workbook = {
      SheetNames: ['困难档案导入模板'],
      Sheets: { '困难档案导入模板': worksheet }
    }

    XLSX.writeFile(workbook, '困难档案导入模板.xlsx')
  }

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterStatus) {
      const hasMatchingStatus = record.applications.some((app) => app.status === filterStatus)
      return matchesSearch && hasMatchingStatus
    }

    if (filterCategory) {
      const hasMatchingCategory = record.applications.some((app) => app.difficulty_category === filterCategory)
      return matchesSearch && hasMatchingCategory
    }

    return matchesSearch
  })

  const columns = [
    {
      key: 'name',
      label: '姓名',
      render: (name: string) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2">
            <User size={16} className="text-purple-600" />
          </div>
          {name}
        </div>
      ),
    },
    { key: 'email', label: '邮箱' },
    { key: 'phone', label: '手机号' },
    {
      key: 'applications',
      label: '帮扶次数',
      render: (apps: Array<{ status: string }>) => apps.filter((a) => a.status === 'approved').length,
    },
    {
      key: 'total_amount',
      label: '累计补助',
      render: (_: unknown, row: DifficultyRecord) => {
        const total = row.applications
          .filter((a) => a.status === 'approved')
          .reduce((sum, a) => sum + (a.actual_amount || a.amount), 0)
        return `¥${total.toFixed(2)}`
      },
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-yellow-100 text-yellow-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return '已审批'
      case 'rejected':
        return '已拒绝'
      default:
        return '待审批'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText size={28} className="text-orange-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">困难职工档案</h2>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload size={18} />
              <span>批量导入</span>
            </button>
          )}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="搜索姓名或邮箱"
            />
          </div>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <XCircle size={20} className="mr-2" />
          <span>{error}</span>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">待审批</p>
                <p className="text-xl font-semibold text-gray-800">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <Heart size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已通过</p>
                <p className="text-xl font-semibold text-gray-800">{stats.approved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <FileText size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已拒绝</p>
                <p className="text-xl font-semibold text-gray-800">{stats.rejected}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <TrendingUp size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">累计补助</p>
                <p className="text-xl font-semibold text-gray-800">¥{stats.total_amount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">状态：</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部</option>
            <option value="approved">已通过</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">类别：</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部</option>
            <option value="disability">伤残致困</option>
            <option value="accident">意外致困</option>
            <option value="disease">因病致困</option>
            <option value="education">子女助学</option>
            <option value="special">特殊困难</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRecords}
          onRowClick={(row) => {
            setSelectedRecord(row)
            setShowModal(true)
          }}
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedRecord(null)
        }}
        title={`${selectedRecord?.name} 的困难帮扶档案`}
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">姓名</p>
                <p className="font-medium text-gray-800">{selectedRecord.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">邮箱</p>
                <p className="font-medium text-gray-800">{selectedRecord.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">手机号</p>
                <p className="font-medium text-gray-800">{selectedRecord.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">所属单位</p>
                <p className="font-medium text-gray-800">{selectedRecord.department || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">帮扶次数</p>
                <p className="text-xl font-semibold text-purple-700">
                  {selectedRecord.applications.filter((a) => a.status === 'approved').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">累计补助金额</p>
                <p className="text-xl font-semibold text-purple-700">
                  ¥
                  {selectedRecord.applications
                    .filter((a) => a.status === 'approved')
                    .reduce((sum, a) => sum + (a.actual_amount || a.amount), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">帮扶申请记录</h4>
              {selectedRecord.applications.length > 0 && selectedRecord.applications.some((a) => a.status === 'approved') ? (
                <div className="space-y-3">
                  {selectedRecord.applications
                    .filter((a) => a.status === 'approved')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((app) => (
                      <div key={app.application_id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                              {categoryLabels[app.difficulty_category] || '其他'}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                              {app.category}
                            </span>
                            <span className="font-medium text-gray-800">{app.disease_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(app.status)}`}>
                              {getStatusText(app.status)}
                            </span>
                            {app.audit_step !== 'completed' && app.status === 'pending' && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">
                                {auditStepLabels[app.audit_step] || '待审批'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">申请金额：</span>
                            <span className="font-medium">¥{Number(app.amount || 0).toFixed(2)}</span>
                          </div>
                          {app.actual_amount !== null && app.status === 'approved' && (
                            <div>
                              <span className="text-gray-500">实际补助：</span>
                              <span className="font-medium text-green-600">¥{Number(app.actual_amount || 0).toFixed(2)}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">申请时间：</span>
                            <span>{new Date(app.created_at).toLocaleString('zh-CN')}</span>
                          </div>
                          {app.employee_id && (
                            <div>
                              <span className="text-gray-500">员工编码：</span>
                              <span className="font-medium">{app.employee_id}</span>
                            </div>
                          )}
                        </div>
                        {app.family_income !== null || app.personal_income !== null || app.dependents_count !== null || app.is_retired || app.is_one_time || app.apply_count > 0 ? (
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                            {app.family_income !== null && (
                              <div>
                                <span className="text-gray-500">家庭年收入：</span>
                                <span className="font-medium">¥{(app.family_income / 10000).toFixed(1)}万</span>
                              </div>
                            )}
                            {app.personal_income !== null && (
                              <div>
                                <span className="text-gray-500">个人年收入：</span>
                                <span className="font-medium">¥{(app.personal_income / 10000).toFixed(1)}万</span>
                              </div>
                            )}
                            {app.dependents_count !== null && (
                              <div>
                                <span className="text-gray-500">抚养人数：</span>
                                <span className="font-medium">{app.dependents_count}人</span>
                              </div>
                            )}
                            {app.is_retired && (
                              <div>
                                <span className="text-gray-500">是否退休：</span>
                                <span className="font-medium text-orange-600">是</span>
                              </div>
                            )}
                            {app.is_one_time && (
                              <div>
                                <span className="text-gray-500">是否一次性：</span>
                                <span className="font-medium text-blue-600">是</span>
                              </div>
                            )}
                            {app.apply_count > 0 && (
                              <div>
                                <span className="text-gray-500">帮扶次数：</span>
                                <span className="font-medium">{app.apply_count}次</span>
                              </div>
                            )}
                          </div>
                        ) : null}
                        {app.reason && (
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">申请理由：</span>
                            <p className="text-gray-700 text-sm">{app.reason}</p>
                          </div>
                        )}
                        {app.remark && (
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">备注：</span>
                            <p className="text-gray-700 text-sm">{app.remark}</p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  暂无帮扶申请记录
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setImportResult(null)
        }}
        title="批量导入困难档案"
        size="lg"
      >
        <div className="space-y-4">
          {!importResult ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">导入说明：</p>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• 支持 .xlsx 和 .xls 格式的Excel文件</li>
                  <li>• 必须包含以下字段：序号、姓名、员工编码/身份证号、所属单位、联系电话</li>
                  <li>• 可选字段：家庭年收入（万元）、个人年收入（万元）、需要抚养人数、是否退休等</li>
                  <li>• "是否退休"、"是否申请过困难帮扶"、"是否属于一次性领取"字段值为：是/否</li>
                  <li>• "困难帮扶申请类别"可选值：伤残致困、意外致困、因病致困、子女助学、特殊困难</li>
                </ul>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download size={18} />
                  <span>下载导入模板</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">点击或拖拽上传Excel文件</p>
                <p className="text-sm text-gray-400">支持 .xlsx, .xls 格式</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2" />
                  <span className="text-gray-600">导入中，请稍候...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">总记录数</p>
                  <p className="text-xl font-semibold text-gray-800">{importResult.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-500">成功导入</p>
                  <p className="text-xl font-semibold text-green-700">{importResult.success}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-500">导入失败</p>
                  <p className="text-xl font-semibold text-red-700">{importResult.failed}</p>
                </div>
              </div>

              {importResult.details.length > 0 && importResult.details.some(d => !d.success) && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">失败详情</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {importResult.details.filter(d => !d.success).map((detail, index) => (
                      <div key={index} className="flex items-center space-x-2 px-4 py-2 border-b border-gray-100 last:border-0">
                        <XCircle size={16} className="text-red-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">第{detail.row}行：{detail.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.details.length > 0 && importResult.details.some(d => d.success) && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">成功记录</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {importResult.details.filter(d => d.success).slice(0, 20).map((detail, index) => (
                      <div key={index} className="flex items-center space-x-2 px-4 py-2 border-b border-gray-100 last:border-0">
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">第{detail.row}行：{detail.message}</span>
                      </div>
                    ))}
                    {importResult.success > 20 && (
                      <div className="px-4 py-2 text-center text-sm text-gray-400">
                        还有 {importResult.success - 20} 条成功记录未显示
                      </div>
                    )}
                  </div>
                </div>
              )}

              {importResult.details.some(d => d.createdUser) && (
                <button
                  onClick={handleExportCreatedUsers}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Download size={18} />
                  <span>导出新创建用户账号</span>
                </button>
              )}

              <button
                onClick={() => {
                  setImportResult(null)
                  setShowImportModal(false)
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                完成
              </button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showCreateUserConfirm}
        onClose={() => {
          setShowCreateUserConfirm(false)
          setPreviewResult(null)
          setCurrentFile(null)
        }}
        title="用户匹配结果确认"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">总记录数</p>
              <p className="text-xl font-semibold text-gray-800">{previewResult?.total || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-500">已匹配用户</p>
              <p className="text-xl font-semibold text-green-700">{previewResult?.matched || 0}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-500">未匹配用户</p>
              <p className="text-xl font-semibold text-yellow-700">{previewResult?.unmatched || 0}</p>
            </div>
          </div>

          {previewResult?.unmatchedRows && previewResult.unmatchedRows.length > 0 && (
            <div className="border border-yellow-200 rounded-lg">
              <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
                <p className="text-sm font-medium text-yellow-700">未匹配的用户（将被创建）</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {previewResult.unmatchedRows.map((row, index) => (
                  <div key={index} className="flex items-center justify-between px-4 py-2 border-b border-yellow-100 last:border-0">
                    <div>
                      <span className="text-sm text-gray-600">第{row.row}行：</span>
                      <span className="font-medium text-gray-800">{row.name}</span>
                      <span className="text-sm text-gray-400"> ({row.employeeId})</span>
                    </div>
                    <span className="text-sm text-gray-500">{row.department}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              未匹配的用户将被自动创建为<span className="font-medium">普通职工</span>，并自动加入<span className="font-medium">工会会员</span>。
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => handleConfirmImport(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              跳过未匹配用户
            </button>
            <button
              onClick={() => handleConfirmImport(true)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              自动创建用户并导入
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}