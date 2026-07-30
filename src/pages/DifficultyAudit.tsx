import { useEffect, useState } from 'react'
import { FileText, Check, X, Eye, CheckCircle, XCircle, Heart, Banknote, Users, Upload, AlertCircle, ClipboardCheck } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { SignaturePad } from '../components/SignaturePad'
import { QuickOpinionButtons } from '../components/QuickOpinionButtons'
import { DateTimePicker } from '../components/DateTimePicker'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface Application {
  id: number
  name: string
  email: string
  phone: string
  disease_name: string
  disease_category: string
  amount: number
  actual_amount: number | null
  reason: string
  status: string
  audit_step: string
  difficulty_category: string
  family_income: number | null
  family_members: string | null
  bank_account: string | null
  bank_name: string | null
  bank_account_name: string | null
  document_path: string | null
  grass_root_opinion: string | null
  grass_root_signature: string | null
  grass_root_date: string | null
  union_committee_opinion: string | null
  union_committee_signature: string | null
  union_committee_date: string | null
  remark: string | null
  marked_as_audited: boolean
  created_at: string
  updated_at: string
}

const difficultyCategoryLabels: Record<string, string> = {
  disability: '伤残致困',
  accident: '意外致困',
  disease: '因病致困',
  education: '子女助学',
  special: '特殊困难',
}

export const DifficultyAudit = () => {
  const { user } = useAuthStore()
  const { showError, showSuccess } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [markedAsAuditedFilter, setMarkedAsAuditedFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [operationMessage, setOperationMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [auditData, setAuditData] = useState({
    grass_root_opinion: '',
    grass_root_date: '',
    union_committee_opinion: '',
    union_committee_date: '',
    actual_amount: '',
    remark: '',
  })

  const canDoGrassRootAudit = () => {
    return user?.role === 'grass_root_auditor' || user?.role === 'admin'
  }

  const canDoUnionCommitteeAudit = () => {
    return user?.role === 'union_committee_auditor' || user?.role === 'admin'
  }

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const params: string[] = []
        params.push('status=pending')
        if (markedAsAuditedFilter !== 'all') {
          params.push(`marked_as_audited=${markedAsAuditedFilter === 'yes'}`)
        }
        const queryString = params.join('&')
        const response = await fetch(`/api/difficulty/applications?${queryString}`, {
          headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
        })
        const result = await response.json()
        if (result.success) {
          setApplications(result.data)
        }
      } catch {
                showError('获取申请列表失败')
              } finally {
        setLoading(false)
      }
    }
    fetchApplications()
  }, [markedAsAuditedFilter])

  const handleView = async (row: Application) => {
    setSelectedApp(row)
    setDuplicateWarning('')
    setAuditData({
      grass_root_opinion: row.grass_root_opinion || '',
      grass_root_date: row.grass_root_date || '',
      union_committee_opinion: row.union_committee_opinion || '',
      union_committee_date: row.union_committee_date || '',
      actual_amount: row.actual_amount?.toString() || '',
      remark: row.remark || '',
    })

    const detailResponse = await api.difficulty.getApplication(row.id)
    if (detailResponse.success && detailResponse.data.disease_type_id) {
      const duplicateResponse = await api.difficulty.checkDuplicate(detailResponse.data.disease_type_id, detailResponse.data.user_id)
      if (duplicateResponse.success && duplicateResponse.data.isDuplicate) {
        const existingApp = duplicateResponse.data.existingApplication
        if (existingApp && existingApp.id !== row.id) {
          const diseaseName = existingApp.disease_name || row.disease_name || '该病种'
          let statusLabel = ''
          if (existingApp.status === 'approved') {
            statusLabel = '已通过'
          } else if (existingApp.status === 'pending') {
            statusLabel = '审核中'
          } else {
            statusLabel = existingApp.status
          }
          setDuplicateWarning(`该用户已有${diseaseName}的困难帮扶申请（${statusLabel}），同一病种仅能申请一次`)
        }
      }
    }

    setShowModal(true)
  }

  const handleGrassRootPass = async () => {
    if (!selectedApp) return
    if (!auditData.grass_root_opinion) {
      showError('请填写基层工会审核意见')
      return
    }

    setActionLoading(true)
    try {
      await api.difficulty.updateApplication(selectedApp.id, {
        grass_root_opinion: auditData.grass_root_opinion,
        grass_root_date: auditData.grass_root_date || new Date().toISOString().split('T')[0],
        audit_step: 'union_committee',
      })
      setApplications(applications.map((app) => app.id === selectedApp.id ? {
        ...app,
        grass_root_opinion: auditData.grass_root_opinion,
        grass_root_date: auditData.grass_root_date || new Date().toISOString().split('T')[0],
        audit_step: 'union_committee',
        updated_at: new Date().toISOString(),
      } : app))
      setShowModal(false)
      setSelectedApp(null)
      showSuccess('基层工会审核通过')
    } catch (error) {
      showError((error as Error).message || '审批失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGrassRootReject = async () => {
    if (!selectedApp) return
    if (!auditData.grass_root_opinion) {
      showError('请填写基层工会审核意见')
      return
    }

    setActionLoading(true)
    try {
      await api.difficulty.updateApplication(selectedApp.id, {
        grass_root_opinion: auditData.grass_root_opinion,
        grass_root_date: auditData.grass_root_date || new Date().toISOString().split('T')[0],
        status: 'rejected',
        audit_step: 'completed',
        remark: auditData.remark,
      })
      setApplications(applications.filter((app) => app.id !== selectedApp.id))
      setShowModal(false)
      setSelectedApp(null)
      showSuccess('已拒绝申请')
    } catch (error) {
      showError((error as Error).message || '审批失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCommitteePass = async () => {
    if (!selectedApp) return
    if (!auditData.union_committee_opinion) {
      showError('请填写委员会审核意见')
      return
    }

    setActionLoading(true)
    try {
      await api.difficulty.updateApplication(selectedApp.id, {
        union_committee_opinion: auditData.union_committee_opinion,
        union_committee_date: auditData.union_committee_date || new Date().toISOString().split('T')[0],
        status: 'approved',
        audit_step: 'completed',
        actual_amount: auditData.actual_amount ? parseFloat(auditData.actual_amount) : undefined,
        remark: auditData.remark,
      })
      setApplications(applications.filter((app) => app.id !== selectedApp.id))
      setShowModal(false)
      setSelectedApp(null)
      showSuccess('委员会审批通过')
    } catch (error) {
      showError('审批失败，可能存在重复申请')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCommitteeReject = async () => {
    if (!selectedApp) return
    if (!auditData.union_committee_opinion) {
      showError('请填写委员会审核意见')
      return
    }

    setActionLoading(true)
    try {
      await api.difficulty.updateApplication(selectedApp.id, {
        union_committee_opinion: auditData.union_committee_opinion,
        union_committee_date: auditData.union_committee_date || new Date().toISOString().split('T')[0],
        status: 'rejected',
        audit_step: 'completed',
        remark: auditData.remark,
      })
      setApplications(applications.filter((app) => app.id !== selectedApp.id))
      setShowModal(false)
      setSelectedApp(null)
      showSuccess('已拒绝申请')
    } catch (error) {
      showError((error as Error).message || '审批失败')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusText = (row: Application) => {
    const { status, audit_step } = row
    if (status === 'approved') return { text: '已通过', className: 'bg-green-100 text-green-700' }
    if (status === 'rejected') return { text: '已拒绝', className: 'bg-red-100 text-red-700' }
    if (audit_step === 'union_committee') return { text: '待委员会审核', className: 'bg-blue-100 text-blue-700' }
    return { text: '待基层审核', className: 'bg-yellow-100 text-yellow-700' }
  }

  const canAudit = (row: Application) => {
    if (row.status !== 'pending') return false
    const currentStep = row.audit_step || 'pending'
    if (currentStep === 'pending' || currentStep === 'grass_root') {
      return canDoGrassRootAudit()
    }
    if (currentStep === 'union_committee') {
      return canDoUnionCommitteeAudit()
    }
    return false
  }

  const handleMarkAsAudited = async (row: Application) => {
    try {
      const response = await api.difficulty.markAsAudited(row.id, !row.marked_as_audited)
      if (response.success) {
        setApplications(applications.map((app) => app.id === row.id ? {
          ...app,
          marked_as_audited: !row.marked_as_audited,
        } : app))
        if (selectedApp && selectedApp.id === row.id) {
          setSelectedApp({
            ...selectedApp,
            marked_as_audited: !selectedApp.marked_as_audited,
          })
        }
        setOperationMessage({ message: row.marked_as_audited ? '已取消已核标记' : '已成功标为已核', type: 'success' })
      } else {
        setOperationMessage({ message: response.error || '操作失败', type: 'error' })
      }
    } catch {
      setOperationMessage({ message: '操作失败', type: 'error' })
    }
    setTimeout(() => setOperationMessage(null), 3000)
  }

  const handleBatchMarkAsAudited = async () => {
    if (selectedIds.length === 0) return
    try {
      const response = await api.difficulty.batchMarkAsAudited(selectedIds, true)
      if (response.success) {
        setApplications(applications.map((app) => selectedIds.includes(app.id) ? {
          ...app,
          marked_as_audited: true,
        } : app))
        setSelectedIds([])
      }
    } catch {
      showError('批量标记失败')
    }
  }

  const columns = [
    { key: 'name', label: '申请人' },
    { key: 'disease_name', label: '病种' },
    {
      key: 'difficulty_category',
      label: '类别',
      render: (category: string) => {
        const label = difficultyCategoryLabels[category] || '其他'
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
            {label}
          </span>
        )
      },
    },
    {
      key: 'amount',
      label: '金额',
      render: (amount: number) => `¥${Number(amount || 0).toFixed(2)}`,
    },
    {
      key: 'marked_as_audited',
      label: '已核',
      render: (marked: boolean) => (
        <span className={`px-2 py-0.5 text-xs rounded-full ${marked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {marked ? '是' : '否'}
        </span>
      ),
    },
    {
      key: 'status',
      label: '状态',
      render: (_: string, row: Application) => {
        const config = getStatusText(row)
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>
            {config.text}
          </span>
        )
      },
    },
    {
      key: 'created_at',
      label: '申请时间',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText size={28} className="text-purple-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">困难帮扶审批</h2>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={markedAsAuditedFilter}
            onChange={(e) => setMarkedAsAuditedFilter(e.target.value as 'all' | 'yes' | 'no')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            <option value="all">全部</option>
            <option value="yes">已核</option>
            <option value="no">未核</option>
          </select>
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">已选择 {selectedIds.length} 项</span>
              <button
                onClick={handleBatchMarkAsAudited}
                className="flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700"
              >
                <CheckCircle size={18} className="mr-2" />
                标为已核
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={applications}
          selectable={true}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          actions={(row) => (
            <button
              onClick={() => handleView(row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
            >
              <Eye size={16} />
              查看
            </button>
          )}
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedApp(null)
          setDuplicateWarning('')
        }}
        title="困难帮扶审批"
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Heart size={24} className="text-purple-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-800">困难帮扶申请</h3>
                  <p className="text-sm text-gray-500">申请编号：{selectedApp.id}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusText(selectedApp).className}`}>
                {getStatusText(selectedApp).text}
              </span>
            </div>

            {duplicateWarning && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle size={20} className="text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">重复申请警告</p>
                    <p className="text-red-600 text-sm mt-1">{duplicateWarning}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">申请人</p>
                <p className="font-medium text-gray-800">{selectedApp.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">联系电话</p>
                <p className="font-medium text-gray-800">{selectedApp.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">申请时间</p>
                <p className="font-medium text-gray-800">{new Date(selectedApp.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">申请信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 mr-2">
                      {difficultyCategoryLabels[selectedApp.difficulty_category] || '其他'}
                    </span>
                    <span className="font-medium text-gray-800">{selectedApp.disease_name}</span>
                  </div>
                </div>
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">申请金额</p>
                  <p className="font-medium text-gray-800">¥{Number(selectedApp.amount || 0).toFixed(2)}</p>
                </div>
              </div>
              {selectedApp.reason && (
                <div className="mt-3 p-3 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">申请理由</p>
                  <p className="text-gray-700 text-sm">{selectedApp.reason}</p>
                </div>
              )}
            </div>

            {selectedApp.family_income !== null || selectedApp.family_members ? (
              <div>
                <div className="flex items-center mb-3">
                  <Users size={18} className="text-blue-600 mr-2" />
                  <h4 className="text-sm font-medium text-gray-700">家庭经济情况</h4>
                </div>
                <div className="space-y-4">
                  {selectedApp.family_income !== null && (
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-500">家庭年收入</p>
                      <p className="font-medium text-gray-800">¥{(selectedApp.family_income / 10000).toFixed(1)}万</p>
                    </div>
                  )}
                  {selectedApp.family_members && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">家庭成员情况</p>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse bg-white rounded-lg border border-gray-200 shadow-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">关系</th>
                              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">姓名</th>
                              <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">联系电话</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const familyMembers = selectedApp.family_members
                                ? selectedApp.family_members.split('\n').filter(Boolean).map(m => m.split('-'))
                                : []
                              return familyMembers.length > 0 ? (
                                familyMembers.map((member, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-800">{member[0] || '-'}</td>
                                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-800">{member[1] || '-'}</td>
                                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-800">{member[2] || '-'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="border border-gray-200 px-4 py-4 text-center text-gray-500">暂无数据</td>
                                </tr>
                              )
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {selectedApp.bank_name || selectedApp.bank_account_name || selectedApp.bank_account ? (
              <div>
                <div className="flex items-center mb-3">
                  <Banknote size={18} className="text-green-600 mr-2" />
                  <h4 className="text-sm font-medium text-gray-700">收款账户信息</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {selectedApp.bank_name && (
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-500">开户银行</p>
                      <p className="font-medium text-gray-800">{selectedApp.bank_name}</p>
                    </div>
                  )}
                  {selectedApp.bank_account_name && (
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-500">收款人</p>
                      <p className="font-medium text-gray-800">{selectedApp.bank_account_name}</p>
                    </div>
                  )}
                  {selectedApp.bank_account && (
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-500">银行账号</p>
                      <p className="font-medium text-gray-800">{selectedApp.bank_account}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {selectedApp.document_path && (
              <div>
                <div className="flex items-center mb-3">
                  <FileText size={18} className="text-orange-600 mr-2" />
                  <h4 className="text-sm font-medium text-gray-700">证明材料</h4>
                </div>
                <div className="p-3 border border-gray-200 rounded-lg">
                  <a href={`/api/uploads/${selectedApp.document_path}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                    <Upload size={18} className="mr-2" />
                    {selectedApp.document_path}
                  </a>
                </div>
              </div>
            )}

            {selectedApp.grass_root_opinion && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">基层工会审核意见</h4>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-gray-700 mb-2">{selectedApp.grass_root_opinion}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>审核人：{selectedApp.grass_root_signature || '-'}</span>
                    <span>审核日期：{selectedApp.grass_root_date ? new Date(selectedApp.grass_root_date).toLocaleDateString('zh-CN') : '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedApp.union_committee_opinion && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">委员会审核意见</h4>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-gray-700 mb-2">{selectedApp.union_committee_opinion}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>审核人：{selectedApp.union_committee_signature || '-'}</span>
                    <span>审核日期：{selectedApp.union_committee_date ? new Date(selectedApp.union_committee_date).toLocaleDateString('zh-CN') : '-'}</span>
                  </div>
                  {selectedApp.actual_amount !== null && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <span className="text-sm text-gray-500">实际补助金额：</span>
                      <span className="font-medium text-blue-700">¥{selectedApp.actual_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedApp.remark && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <span className="text-sm text-gray-500">备注：</span>
                      <span className="text-gray-700">{selectedApp.remark}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedApp.status === 'pending' && selectedApp.audit_step !== 'completed' && canAudit(selectedApp) && (
              <div className="border-t border-gray-200 pt-4">
                {((selectedApp.audit_step === 'pending' || selectedApp.audit_step === 'grass_root') && canDoGrassRootAudit()) && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">基层工会审核</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">审核意见 *</label>
                      <QuickOpinionButtons onSelect={(opinion) => setAuditData({ ...auditData, grass_root_opinion: opinion })} />
                      <textarea
                        value={auditData.grass_root_opinion}
                        onChange={(e) => setAuditData({ ...auditData, grass_root_opinion: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="请填写基层工会审核意见"
                      />
                    </div>
                    <DateTimePicker
                      label="审核日期"
                      value={auditData.grass_root_date}
                      onChange={(value) => setAuditData({ ...auditData, grass_root_date: value })}
                    />
                    {operationMessage && (
                        <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 ${operationMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} animate-scale-in`}>
                          {operationMessage.type === 'success' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                          <span className="font-medium">{operationMessage.message}</span>
                        </div>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleMarkAsAudited(selectedApp)}
                          className={`flex-1 py-2 font-medium rounded-lg transition-colors flex items-center justify-center ${selectedApp.marked_as_audited ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                        >
                          <CheckCircle size={18} className="mr-2" />
                          {selectedApp.marked_as_audited ? '取消已核' : '标为已核'}
                        </button>
                        <button
                          onClick={handleGrassRootPass}
                        disabled={actionLoading || !auditData.grass_root_opinion}
                        className="flex-1 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center"
                      >
                        <CheckCircle size={18} className="mr-2" />
                        审核通过
                      </button>
                      <button
                        onClick={handleGrassRootReject}
                        disabled={actionLoading || !auditData.grass_root_opinion}
                        className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center"
                      >
                        <XCircle size={18} className="mr-2" />
                        拒绝申请
                      </button>
                    </div>
                  </div>
                )}

                {selectedApp.audit_step === 'union_committee' && canDoUnionCommitteeAudit() && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">委员会审核</h4>
                    {selectedApp.grass_root_signature && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-500">一级审批人：</p>
                        <p className="font-medium text-blue-700">{selectedApp.grass_root_signature}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">审核意见 *</label>
                      <QuickOpinionButtons onSelect={(opinion) => setAuditData({ ...auditData, union_committee_opinion: opinion })} />
                      <textarea
                        value={auditData.union_committee_opinion}
                        onChange={(e) => setAuditData({ ...auditData, union_committee_opinion: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="请填写委员会审核意见"
                      />
                    </div>
                    <DateTimePicker
                      label="审批日期"
                      value={auditData.union_committee_date}
                      onChange={(value) => setAuditData({ ...auditData, union_committee_date: value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">实际补助金额（元）</label>
                      <input
                        type="number"
                        value={auditData.actual_amount}
                        onChange={(e) => setAuditData({ ...auditData, actual_amount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="实际补助金额"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                      <textarea
                        value={auditData.remark}
                        onChange={(e) => setAuditData({ ...auditData, remark: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="其他备注信息"
                      />
                    </div>
                    {operationMessage && (
                        <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 ${operationMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} animate-scale-in`}>
                          {operationMessage.type === 'success' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                          <span className="font-medium">{operationMessage.message}</span>
                        </div>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleMarkAsAudited(selectedApp)}
                          className={`flex-1 py-2 font-medium rounded-lg transition-colors flex items-center justify-center ${selectedApp.marked_as_audited ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                        >
                          <CheckCircle size={18} className="mr-2" />
                          {selectedApp.marked_as_audited ? '取消已核' : '标为已核'}
                        </button>
                        <button
                          onClick={handleCommitteePass}
                        disabled={actionLoading || !auditData.union_committee_opinion}
                        className="flex-1 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center"
                      >
                        <CheckCircle size={18} className="mr-2" />
                        审批通过
                      </button>
                      <button
                        onClick={handleCommitteeReject}
                        disabled={actionLoading || !auditData.union_committee_opinion}
                        className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center"
                      >
                        <XCircle size={18} className="mr-2" />
                        拒绝申请
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedApp.status === 'pending' && !canAudit(selectedApp) && (
              <div className="border-t border-gray-200 pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-center">
                  {user?.role === 'grass_root_auditor' ? (
                    <p>当前申请已进入委员会审核阶段，您无法进行操作</p>
                  ) : user?.role === 'union_committee_auditor' ? (
                    <p>当前申请尚未完成基层审核，请等待基层审核人操作</p>
                  ) : (
                    <p>您没有审核权限</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}