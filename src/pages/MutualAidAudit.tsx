import { useState, useEffect } from 'react'
import { HandHeart, CheckCircle, XCircle, Eye, ClipboardCheck } from 'lucide-react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { QuickOpinionButtons } from '../components/QuickOpinionButtons'
import { DateTimePicker } from '../components/DateTimePicker'
import { AuditResultSelector } from '../components/AuditResultSelector'
import { useToast } from '../context/ToastContext'

interface MutualAidApplication {
  id: number
  name: string
  email: string
  phone: string
  gender: string
  birth_date: string
  political_status: string
  mobile_phone: string
  home_phone: string
  id_card: string
  department: string
  position: string
  home_address: string
  zip_code: string
  family_members: string
  work_group_opinion: string
  work_group_signature: string
  work_group_date: string
  office_opinion: string
  office_signature: string
  office_date: string
  status: string
  remark: string
  marked_as_audited: boolean
  created_at: string
  updated_at: string
}

export const MutualAidAudit = () => {
  const { showError, showSuccess } = useToast()
  const [applications, setApplications] = useState<MutualAidApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [markedAsAuditedFilter, setMarkedAsAuditedFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [selectedApplication, setSelectedApplication] = useState<MutualAidApplication | null>(null)
  const [operationMessage, setOperationMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [auditData, setAuditData] = useState({
    status: 'approved' as 'approved' | 'rejected',
    remark: '',
    work_group_opinion: '',
    work_group_date: '',
    office_opinion: '',
    office_date: '',
  })

  useEffect(() => {
    fetchApplications()
  }, [statusFilter, markedAsAuditedFilter])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const params: string[] = []
      if (statusFilter) params.push(`status=${statusFilter}`)
      if (markedAsAuditedFilter !== 'all') {
        params.push(`marked_as_audited=${markedAsAuditedFilter === 'yes'}`)
      }
      const queryString = params.length > 0 ? `?${params.join('&')}` : ''
      const response = await fetch(`/api/mutual-aid/applications${queryString}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
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

  const handleView = (application: MutualAidApplication) => {
    setSelectedApplication(application)
    setAuditData({
      status: 'approved',
      remark: '',
      work_group_opinion: application.work_group_opinion || '',
      work_group_date: application.work_group_date || '',
      office_opinion: application.office_opinion || '',
      office_date: application.office_date || '',
    })
  }

  const handleAudit = async () => {
    if (!selectedApplication) return

    try {
      const response = await api.mutualAid.updateApplication(selectedApplication.id, auditData)
      if (response.success) {
        setSelectedApplication(null)
        fetchApplications()
      }
    } catch {
      showError('审批失败')
    }
  }

  const handleMarkAsAudited = async (row: MutualAidApplication) => {
    try {
      const response = await api.mutualAid.markAsAudited(row.id, !row.marked_as_audited)
      if (response.success) {
        setApplications(applications.map((app) => app.id === row.id ? {
          ...app,
          marked_as_audited: !row.marked_as_audited,
        } : app))
        if (selectedApplication && selectedApplication.id === row.id) {
          setSelectedApplication({
            ...selectedApplication,
            marked_as_audited: !selectedApplication.marked_as_audited,
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
      const response = await api.mutualAid.batchMarkAsAudited(selectedIds, true)
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
    { key: 'department', label: '部门' },
    { key: 'position', label: '岗位' },
    { key: 'mobile_phone', label: '手机' },
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
      render: (status: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          status === 'approved' ? 'bg-green-100 text-green-700' :
          status === 'rejected' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : '待审核'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: '申请时间',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ]

  const renderActions = (row: MutualAidApplication) => (
    <button
      onClick={() => handleView(row)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
    >
      <Eye size={16} />
      查看
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <HandHeart size={28} className="text-red-500 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">爱心互助会入会审核</h2>
        </div>
        <div className="flex items-center space-x-4">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">筛选:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">全部</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
            <select
              value={markedAsAuditedFilter}
              onChange={(e) => setMarkedAsAuditedFilter(e.target.value as 'all' | 'yes' | 'no')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">全部</option>
              <option value="yes">已核</option>
              <option value="no">未核</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={applications}
            selectable={true}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            actions={renderActions}
          />
        )}
      </div>

      <Modal
        isOpen={selectedApplication !== null}
        onClose={() => setSelectedApplication(null)}
        title={selectedApplication ? `爱心互助会入会申请 - ${selectedApplication.name}` : ''}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
                <p className="text-gray-800">{selectedApplication.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                <p className="text-gray-800">{selectedApplication.gender}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
                <p className="text-gray-800">{selectedApplication.birth_date ? new Date(selectedApplication.birth_date).toLocaleDateString('zh-CN') : '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">政治面貌</label>
                <p className="text-gray-800">{selectedApplication.political_status || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机</label>
                <p className="text-gray-800">{selectedApplication.mobile_phone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">家庭电话</label>
                <p className="text-gray-800">{selectedApplication.home_phone || '-'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">身份证号码</label>
              <p className="text-gray-800">{selectedApplication.id_card}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <p className="text-gray-800">{selectedApplication.department}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
                <p className="text-gray-800">{selectedApplication.position}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">家庭住址</label>
              <p className="text-gray-800">{selectedApplication.home_address || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮编</label>
              <p className="text-gray-800">{selectedApplication.zip_code || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">家庭成员</label>
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
                      const familyMembers = selectedApplication.family_members
                        ? selectedApplication.family_members.split('\n').filter(Boolean).map(m => m.split('-'))
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

            {selectedApplication.status === 'pending' && (
              <div className="border-t pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">审核结果</label>
                  <AuditResultSelector
                    value={auditData.status}
                    onChange={(value) => setAuditData({ ...auditData, status: value })}
                    name="status"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">工作小组意见</label>
                  <QuickOpinionButtons onSelect={(opinion) => setAuditData({ ...auditData, work_group_opinion: opinion })} />
                  <textarea
                    value={auditData.work_group_opinion}
                    onChange={(e) => setAuditData({ ...auditData, work_group_opinion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="请输入工作小组意见"
                    rows={2}
                  />
                </div>

                <div className="mt-4">
                  <DateTimePicker
                    label="日期"
                    value={auditData.work_group_date}
                    onChange={(value) => setAuditData({ ...auditData, work_group_date: value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">互助会办公室意见</label>
                  <QuickOpinionButtons onSelect={(opinion) => setAuditData({ ...auditData, office_opinion: opinion })} />
                  <textarea
                    value={auditData.office_opinion}
                    onChange={(e) => setAuditData({ ...auditData, office_opinion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="请输入办公室意见"
                    rows={2}
                  />
                </div>

                <div className="mt-4">
                  <DateTimePicker
                    label="日期"
                    value={auditData.office_date}
                    onChange={(value) => setAuditData({ ...auditData, office_date: value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={auditData.remark}
                    onChange={(e) => setAuditData({ ...auditData, remark: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="请输入备注"
                    rows={2}
                  />
                </div>

                {operationMessage && (
                    <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 ${operationMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} animate-scale-in`}>
                      {operationMessage.type === 'success' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                      <span className="font-medium">{operationMessage.message}</span>
                    </div>
                  )}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => handleMarkAsAudited(selectedApplication)}
                      className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center ${selectedApplication.marked_as_audited ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                    >
                      <CheckCircle size={18} className="mr-2" />
                      {selectedApplication.marked_as_audited ? '取消已核' : '标为已核'}
                    </button>
                  <button
                    type="button"
                    onClick={() => setSelectedApplication(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleAudit}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    确认审核
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}