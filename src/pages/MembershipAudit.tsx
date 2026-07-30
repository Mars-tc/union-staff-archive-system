import { useEffect, useState } from 'react'
import { FileText, Check, X, Eye, CheckCircle, XCircle, Tag, Plus, Trash2, ClipboardCheck } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { QuickOpinionButtons } from '../components/QuickOpinionButtons'
import { DateTimePicker } from '../components/DateTimePicker'
import { AuditResultSelector } from '../components/AuditResultSelector'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface Application {
  id: number
  name: string
  email: string
  phone: string
  position: string
  gender: string
  native_place: string
  education: string
  id_card: string
  hukou_location: string
  ethnicity: string
  residence_address: string
  political_status: string
  contact_phone: string
  work_resume: string
  family_members: string
  specialty: string
  signature: string
  status: string
  remark: string
  grass_root_opinion: string
  grass_root_signature: string
  grass_root_date: string
  union_committee_opinion: string
  union_committee_signature: string
  union_committee_date: string
  audit_step: string
  tags: string
  marked_as_audited: boolean
  created_at: string
  updated_at: string
}

export const MembershipAudit = () => {
  const { user } = useAuthStore()
  const { showError, showSuccess } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [auditData, setAuditData] = useState({
    status: 'approved' as 'approved' | 'rejected',
    remark: '',
    grass_root_opinion: '',
    grass_root_date: '',
    union_committee_opinion: '',
    union_committee_date: '',
    audit_step: 'pending' as 'pending' | 'grass_root' | 'union_committee' | 'completed',
  })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchAuditData, setBatchAuditData] = useState({
    status: 'approved' as 'approved' | 'rejected',
    remark: '',
    grass_root_opinion: '',
    grass_root_date: '',
    union_committee_opinion: '',
    union_committee_date: '',
  })
  const [batchLoading, setBatchLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [markedAsAuditedFilter, setMarkedAsAuditedFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [operationMessage, setOperationMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
        const response = await fetch(`/api/membership/applications?${queryString}`, {
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

  const handleView = (row: Application) => {
    setSelectedApp(row)
    setTags(row.tags ? JSON.parse(row.tags) : [])
    setAuditData({
      status: 'approved',
      remark: row.remark || '',
      grass_root_opinion: row.grass_root_opinion || '',
      grass_root_date: row.grass_root_date || '',
      union_committee_opinion: row.union_committee_opinion || '',
      union_committee_date: row.union_committee_date || '',
      audit_step: (row.audit_step || 'pending') as 'pending' | 'grass_root' | 'union_committee' | 'completed',
    })
    setShowModal(true)
  }

  const handleAudit = async () => {
    if (!selectedApp) return
    setActionLoading(true)

    const currentStep = (selectedApp.audit_step || 'pending') as 'pending' | 'grass_root' | 'union_committee' | 'completed'
    let nextStep = currentStep
    let finalStatus: 'pending' | 'approved' | 'rejected' = auditData.status

    if (auditData.status === 'approved') {
      if (currentStep === 'pending' || currentStep === 'grass_root') {
        nextStep = 'union_committee'
        finalStatus = 'pending'
      } else if (currentStep === 'union_committee') {
        nextStep = 'completed'
        finalStatus = 'approved'
      }
    } else {
      nextStep = 'completed'
      finalStatus = 'rejected'
    }

    try {
      const response = await api.membership.updateApplication(selectedApp.id, {
        ...auditData,
        status: finalStatus,
        audit_step: nextStep,
        tags: JSON.stringify(tags),
      })
      if (response.success) {
        if (finalStatus === 'pending') {
          setApplications(applications.map((app) => app.id === selectedApp.id ? {
            ...app,
            ...auditData,
            status: finalStatus,
            audit_step: nextStep,
            tags: JSON.stringify(tags),
            updated_at: new Date().toISOString(),
          } : app))
        } else {
          setApplications(applications.filter((app) => app.id !== selectedApp.id))
        }
        setShowModal(false)
        setSelectedApp(null)
      }
    } catch {
      showError('审批失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBatchAudit = async () => {
    if (selectedIds.length === 0) return
    setBatchLoading(true)

    try {
      const response = await api.membership.batchAuditApplications(selectedIds, batchAuditData)
      if (response.success) {
        setApplications(applications.filter((app) => !selectedIds.includes(app.id)))
        setSelectedIds([])
        setShowBatchModal(false)
      }
    } catch {
      showError('批量审批失败')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
      setShowTagInput(false)
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSaveTags = async () => {
    if (!selectedApp) return
    try {
      await api.membership.updateApplicationTags(selectedApp.id, tags)
      setApplications(applications.map((app) => app.id === selectedApp.id ? {
        ...app,
        tags: JSON.stringify(tags),
      } : app))
    } catch {
      showError('更新标签失败')
    }
  }

  const handleMarkAsAudited = async (row: Application) => {
    try {
      const response = await api.membership.markAsAudited(row.id, !row.marked_as_audited)
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
      const response = await api.membership.batchMarkAsAudited(selectedIds, true)
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

  const getStatusText = (row: Application) => {
    const { status, audit_step } = row
    if (status === 'approved') return { text: '已通过', className: 'bg-green-100 text-green-700' }
    if (status === 'rejected') return { text: '已拒绝', className: 'bg-red-100 text-red-700' }
    if (audit_step === 'pending') return { text: '待基层审核', className: 'bg-yellow-100 text-yellow-700' }
    if (audit_step === 'grass_root') return { text: '待基层审核', className: 'bg-yellow-100 text-yellow-700' }
    if (audit_step === 'union_committee') return { text: '待委员会审核', className: 'bg-blue-100 text-blue-700' }
    return { text: '待审核', className: 'bg-yellow-100 text-yellow-700' }
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

  const selectedApplications = applications.filter((app) => selectedIds.includes(app.id))
  const canBatchAudit = selectedApplications.every((app) => canAudit(app))

  const columns = [
    { key: 'name', label: '申请人' },
    { key: 'email', label: '邮箱' },
    { key: 'position', label: '工作单位及职务' },
    {
      key: 'tags',
      label: '标签',
      render: (tags: string) => {
        const tagList = tags ? JSON.parse(tags) : []
        if (tagList.length === 0) return <span className="text-gray-400">-</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tagList.map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )
      },
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
          <FileText size={28} className="text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">入会申请审核</h2>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={markedAsAuditedFilter}
            onChange={(e) => setMarkedAsAuditedFilter(e.target.value as 'all' | 'yes' | 'no')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
              {canBatchAudit && (
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  <ClipboardCheck size={18} className="mr-2" />
                  批量审批
                </button>
              )}
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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleView(row)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="查看详情"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={() => handleMarkAsAudited(row)}
                className={`p-1 rounded ${row.marked_as_audited ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
                title={row.marked_as_audited ? '取消已核' : '标为已核'}
              >
                <CheckCircle size={18} />
              </button>
              {canAudit(row) && (
                <>
                  <button
                    onClick={() => handleView(row)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="通过"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleView(row)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="拒绝"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedApp(null)
        }}
        title="入会申请详情"
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-4" style={{ flex: 1 }}>
                <div>
                  <p className="text-sm text-gray-500">申请人</p>
                  <p className="font-medium text-gray-800">{selectedApp.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">邮箱</p>
                  <p className="font-medium text-gray-800">{selectedApp.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">手机号</p>
                  <p className="font-medium text-gray-800">{selectedApp.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">联系电话</p>
                  <p className="font-medium text-gray-800">{selectedApp.contact_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">工作单位及职务</p>
                  <p className="font-medium text-gray-800">{selectedApp.position || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">性别</p>
                  <p className="font-medium text-gray-800">{selectedApp.gender || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">籍贯</p>
                  <p className="font-medium text-gray-800">{selectedApp.native_place || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">学历</p>
                  <p className="font-medium text-gray-800">{selectedApp.education || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">身份证号码</p>
                  <p className="font-medium text-gray-800">{selectedApp.id_card || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">户口所在地</p>
                  <p className="font-medium text-gray-800">{selectedApp.hukou_location || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">民族</p>
                  <p className="font-medium text-gray-800">{selectedApp.ethnicity || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">政治面貌</p>
                  <p className="font-medium text-gray-800">{selectedApp.political_status || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">现居地址</p>
                  <p className="font-medium text-gray-800">{selectedApp.residence_address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">特长</p>
                  <p className="font-medium text-gray-800">{selectedApp.specialty || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">申请时间</p>
                  <p className="font-medium text-gray-800">{new Date(selectedApp.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">审核进度</p>
                  <p className={`font-medium ${selectedApp.status === 'approved' ? 'text-green-600' : selectedApp.status === 'rejected' ? 'text-red-600' : selectedApp.audit_step === 'union_committee' ? 'text-blue-600' : 'text-yellow-600'}`}>
                    {selectedApp.status === 'approved' ? '已通过' : selectedApp.status === 'rejected' ? '已拒绝' : selectedApp.audit_step === 'union_committee' ? '待委员会审核' : '待基层审核'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">标签</p>
                <button
                  onClick={() => setShowTagInput(!showTagInput)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} className="mr-1" />
                  添加标签
                </button>
              </div>
              {showTagInput && (
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入标签名称"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => setShowTagInput(false)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              )}
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full"
                    >
                      <Tag size={12} className="mr-1" />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={handleSaveTags}
                    className="px-2 py-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    保存标签
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">暂无标签</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500">个人工作简历</p>
              <textarea
                readOnly
                value={selectedApp.work_resume || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 mt-1"
                rows={3}
              />
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">家庭主要成员以及联系方式</p>
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

            {selectedApp.signature && (
              <div>
                <p className="text-sm text-gray-500">申请人签名</p>
                <div className="mt-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <img src={selectedApp.signature} alt="签名" className="max-h-24" />
                </div>
              </div>
            )}

            {selectedApp.status !== 'pending' && (
              <div className="border-t pt-4 space-y-4">
                {selectedApp.grass_root_opinion && (
                  <div>
                    <p className="text-sm text-gray-500">工会基层委员会意见</p>
                    <p className="font-medium text-gray-800 mt-1">{selectedApp.grass_root_opinion}</p>
                    {selectedApp.grass_root_signature && (
                      <p className="text-sm text-gray-600 mt-1">签字人：{selectedApp.grass_root_signature}</p>
                    )}
                    {selectedApp.grass_root_date && (
                      <p className="text-sm text-gray-600">日期：{new Date(selectedApp.grass_root_date).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                )}

                {selectedApp.union_committee_opinion && (
                  <div>
                    <p className="text-sm text-gray-500">工会委员会意见</p>
                    <p className="font-medium text-gray-800 mt-1">{selectedApp.union_committee_opinion}</p>
                    {selectedApp.union_committee_signature && (
                      <p className="text-sm text-gray-600 mt-1">签字人：{selectedApp.union_committee_signature}</p>
                    )}
                    {selectedApp.union_committee_date && (
                      <p className="text-sm text-gray-600">日期：{new Date(selectedApp.union_committee_date).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                )}

                {selectedApp.remark && (
                  <div>
                    <p className="text-sm text-gray-500">审核备注</p>
                    <p className="font-medium text-gray-800">{selectedApp.remark}</p>
                  </div>
                )}
              </div>
            )}

            {selectedApp.status === 'pending' && canAudit(selectedApp) && (
              <div className="border-t pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">审核结果</label>
                  <AuditResultSelector
                    value={auditData.status}
                    onChange={(value) => setAuditData({ ...auditData, status: value })}
                    name="status"
                  />
                </div>

                {((selectedApp.audit_step === 'pending' || selectedApp.audit_step === 'grass_root') && canDoGrassRootAudit()) && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-3">第一级：工会基层委员会意见</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">审核意见</label>
                      <QuickOpinionButtons onSelect={(opinion) => setAuditData({ ...auditData, grass_root_opinion: opinion })} />
                      <textarea
                        value={auditData.grass_root_opinion}
                        onChange={(e) => setAuditData({ ...auditData, grass_root_opinion: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入工会基层委员会意见"
                        rows={3}
                      />
                    </div>
                    <div className="mt-4">
                      <DateTimePicker
                        label="日期"
                        value={auditData.grass_root_date}
                        onChange={(value) => setAuditData({ ...auditData, grass_root_date: value })}
                      />
                    </div>
                  </div>
                )}

                {selectedApp.grass_root_opinion && selectedApp.audit_step !== 'pending' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-800 mb-3">第一级：工会基层委员会意见（已审核）</h3>
                    <p className="font-medium text-gray-800">{selectedApp.grass_root_opinion}</p>
                    {selectedApp.grass_root_signature && (
                      <p className="text-sm text-gray-600 mt-1">签字人：{selectedApp.grass_root_signature}</p>
                    )}
                    {selectedApp.grass_root_date && (
                      <p className="text-sm text-gray-600">日期：{new Date(selectedApp.grass_root_date).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                )}

                {selectedApp.audit_step === 'union_committee' && canDoUnionCommitteeAudit() && (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-indigo-800 mb-3">第二级：工会委员会意见</h3>
                    {selectedApp.grass_root_signature && (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-100">
                        <p className="text-sm text-gray-500">一级审批人：</p>
                        <p className="font-medium text-indigo-700">{selectedApp.grass_root_signature}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">审核意见</label>
                      <QuickOpinionButtons onSelect={(opinion) => setAuditData({ ...auditData, union_committee_opinion: opinion })} />
                      <textarea
                        value={auditData.union_committee_opinion}
                        onChange={(e) => setAuditData({ ...auditData, union_committee_opinion: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="请输入工会委员会意见"
                        rows={3}
                      />
                    </div>
                    <div className="mt-4">
                      <DateTimePicker
                        label="日期"
                        value={auditData.union_committee_date}
                        onChange={(value) => setAuditData({ ...auditData, union_committee_date: value })}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注（选填）</label>
                  <textarea
                    value={auditData.remark}
                    onChange={(e) => setAuditData({ ...auditData, remark: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="请输入审核备注"
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
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAudit}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {actionLoading ? '处理中...' : '确认审核'}
                  </button>
                </div>
              </div>
            )}

            {selectedApp.status === 'pending' && !canAudit(selectedApp) && (
              <div className="border-t pt-4">
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

      <Modal
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false)
        }}
        title={`批量审批（已选择 ${selectedIds.length} 项）`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">审核结果</label>
            <AuditResultSelector
              value={batchAuditData.status}
              onChange={(value) => setBatchAuditData({ ...batchAuditData, status: value })}
              name="batchStatus"
            />
          </div>

          {canDoGrassRootAudit() && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-3">第一级：工会基层委员会意见</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">审核意见</label>
                <QuickOpinionButtons onSelect={(opinion) => setBatchAuditData({ ...batchAuditData, grass_root_opinion: opinion })} />
                <textarea
                  value={batchAuditData.grass_root_opinion}
                  onChange={(e) => setBatchAuditData({ ...batchAuditData, grass_root_opinion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入工会基层委员会意见"
                  rows={3}
                />
              </div>
              <div className="mt-4">
                <DateTimePicker
                  label="日期"
                  value={batchAuditData.grass_root_date}
                  onChange={(value) => setBatchAuditData({ ...batchAuditData, grass_root_date: value })}
                />
              </div>
            </div>
          )}

          {canDoUnionCommitteeAudit() && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-indigo-800 mb-3">第二级：工会委员会意见</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">审核意见</label>
                <QuickOpinionButtons onSelect={(opinion) => setBatchAuditData({ ...batchAuditData, union_committee_opinion: opinion })} />
                <textarea
                  value={batchAuditData.union_committee_opinion}
                  onChange={(e) => setBatchAuditData({ ...batchAuditData, union_committee_opinion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入工会委员会意见"
                  rows={3}
                />
              </div>
              <div className="mt-4">
                <DateTimePicker
                  label="日期"
                  value={batchAuditData.union_committee_date}
                  onChange={(value) => setBatchAuditData({ ...batchAuditData, union_committee_date: value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注（选填）</label>
            <textarea
              value={batchAuditData.remark}
              onChange={(e) => setBatchAuditData({ ...batchAuditData, remark: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="请输入审核备注"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowBatchModal(false)}
              className="flex-1 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleBatchAudit}
              disabled={batchLoading}
              className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {batchLoading ? '处理中...' : '确认批量审批'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}