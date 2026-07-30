import { useEffect, useState } from 'react'
import { CreditCard, Check, X, Eye, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { QuickOpinionButtons } from '../components/QuickOpinionButtons'
import { DateTimePicker } from '../components/DateTimePicker'
import { AuditResultSelector } from '../components/AuditResultSelector'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

interface Authorization {
  id: number
  user_id: number
  name: string
  email: string
  start_date: string
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
  created_at: string
  updated_at: string
}

export const FeeAudit = () => {
  const { showError, showSuccess } = useToast()
  const [authorizations, setAuthorizations] = useState<Authorization[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAuth, setSelectedAuth] = useState<Authorization | null>(null)
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
    start_date: '',
  })

  useEffect(() => {
    const fetchAuthorizations = async () => {
      try {
        const response = await api.fee.getAuthorizations('pending')
        if (response.success) {
          setAuthorizations(response.data)
        }
      } catch {
        showError('获取授权列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchAuthorizations()
  }, [])

  const handleView = (row: Authorization) => {
    setSelectedAuth(row)
    setAuditData({
      status: 'approved',
      remark: row.remark || '',
      grass_root_opinion: row.grass_root_opinion || '',
      grass_root_date: row.grass_root_date || '',
      union_committee_opinion: row.union_committee_opinion || '',
      union_committee_date: row.union_committee_date || '',
      audit_step: (row.audit_step || 'pending') as 'pending' | 'grass_root' | 'union_committee' | 'completed',
      start_date: row.start_date ? row.start_date.split('T')[0] : '',
    })
    setShowModal(true)
  }

  const handleAudit = async () => {
    if (!selectedAuth) return
    setActionLoading(true)

    const currentStep = (selectedAuth.audit_step || 'pending') as 'pending' | 'grass_root' | 'union_committee' | 'completed'
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
      const response = await api.fee.updateAuthorization(selectedAuth.id, {
        ...auditData,
        status: finalStatus,
        audit_step: nextStep,
      })
      if (response.success) {
        if (finalStatus === 'pending') {
          setAuthorizations(authorizations.map((auth) => auth.id === selectedAuth.id ? {
            ...auth,
            ...auditData,
            status: finalStatus,
            audit_step: nextStep,
            updated_at: new Date().toISOString(),
          } : auth))
        } else {
          setAuthorizations(authorizations.filter((auth) => auth.id !== selectedAuth.id))
        }
        setShowModal(false)
        setSelectedAuth(null)
      }
    } catch {
      showError('审批失败')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusText = (row: Authorization) => {
    const { status, audit_step } = row
    if (status === 'approved') return { text: '已通过', className: 'bg-green-100 text-green-700' }
    if (status === 'rejected') return { text: '已拒绝', className: 'bg-red-100 text-red-700' }
    if (audit_step === 'pending') return { text: '待基层审核', className: 'bg-yellow-100 text-yellow-700' }
    if (audit_step === 'grass_root') return { text: '待基层审核', className: 'bg-yellow-100 text-yellow-700' }
    if (audit_step === 'union_committee') return { text: '待委员会审核', className: 'bg-blue-100 text-blue-700' }
    return { text: '待审核', className: 'bg-yellow-100 text-yellow-700' }
  }

  const canAudit = (row: Authorization) => {
    return row.status === 'pending'
  }

  const columns = [
    { key: 'name', label: '申请人' },
    { key: 'email', label: '邮箱' },
    {
      key: 'start_date',
      label: '生效日期',
      render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
    },
    {
      key: 'status',
      label: '状态',
      render: (_: string, row: Authorization) => {
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
      <div className="flex items-center">
        <CreditCard size={28} className="text-green-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-800">会费授权审核</h2>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={authorizations}
          actions={(row) => (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleView(row)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="查看详情"
              >
                <Eye size={18} />
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
          setSelectedAuth(null)
        }}
        title="会费授权详情"
        size="lg"
      >
        {selectedAuth && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">申请人</p>
                <p className="font-medium text-gray-800">{selectedAuth.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">邮箱</p>
                <p className="font-medium text-gray-800">{selectedAuth.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">申请时间</p>
                <p className="font-medium text-gray-800">{new Date(selectedAuth.created_at).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">审核进度</p>
                <p className={`font-medium ${selectedAuth.status === 'approved' ? 'text-green-600' : selectedAuth.status === 'rejected' ? 'text-red-600' : selectedAuth.audit_step === 'union_committee' ? 'text-blue-600' : 'text-yellow-600'}`}>
                  {selectedAuth.status === 'approved' ? '已通过' : selectedAuth.status === 'rejected' ? '已拒绝' : selectedAuth.audit_step === 'union_committee' ? '待委员会审核' : '待基层审核'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">生效日期</p>
              <p className="font-medium text-gray-800">
                {selectedAuth.start_date ? new Date(selectedAuth.start_date).toLocaleDateString('zh-CN') : '-'}
              </p>
            </div>

            {selectedAuth.signature && (
              <div>
                <p className="text-sm text-gray-500">申请人签名</p>
                <div className="mt-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <img src={selectedAuth.signature} alt="签名" className="max-h-24" />
                </div>
              </div>
            )}

            {selectedAuth.status !== 'pending' && (
              <div className="border-t pt-4 space-y-4">
                {selectedAuth.grass_root_opinion && (
                  <div>
                    <p className="text-sm text-gray-500">工会基层委员会意见</p>
                    <p className="font-medium text-gray-800 mt-1">{selectedAuth.grass_root_opinion}</p>
                    {selectedAuth.grass_root_signature && (
                      <p className="text-sm text-gray-600 mt-1">签字人：{selectedAuth.grass_root_signature}</p>
                    )}
                    {selectedAuth.grass_root_date && (
                      <p className="text-sm text-gray-600">日期：{new Date(selectedAuth.grass_root_date).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                )}

                {selectedAuth.union_committee_opinion && (
                  <div>
                    <p className="text-sm text-gray-500">工会委员会意见</p>
                    <p className="font-medium text-gray-800 mt-1">{selectedAuth.union_committee_opinion}</p>
                    {selectedAuth.union_committee_signature && (
                      <p className="text-sm text-gray-600 mt-1">签字人：{selectedAuth.union_committee_signature}</p>
                    )}
                    {selectedAuth.union_committee_date && (
                      <p className="text-sm text-gray-600">日期：{new Date(selectedAuth.union_committee_date).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                )}

                {selectedAuth.remark && (
                  <div>
                    <p className="text-sm text-gray-500">审核备注</p>
                    <p className="font-medium text-gray-800">{selectedAuth.remark}</p>
                  </div>
                )}
              </div>
            )}

            {selectedAuth.status === 'pending' && (
              <div className="border-t pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={16} className="inline mr-1" />
                    生效日期（可修改）
                  </label>
                  <input
                    type="date"
                    value={auditData.start_date}
                    onChange={(e) => setAuditData({ ...auditData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">审核结果</label>
                  <AuditResultSelector
                    value={auditData.status}
                    onChange={(value) => setAuditData({ ...auditData, status: value })}
                    name="status"
                  />
                </div>

                {(selectedAuth.audit_step === 'pending' || selectedAuth.audit_step === 'grass_root') && (
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

                {selectedAuth.grass_root_opinion && selectedAuth.audit_step !== 'pending' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-800 mb-3">第一级：工会基层委员会意见（已审核）</h3>
                    <p className="font-medium text-gray-800">{selectedAuth.grass_root_opinion}</p>
                    {selectedAuth.grass_root_signature && (
                      <p className="text-sm text-gray-600 mt-1">签字人：{selectedAuth.grass_root_signature}</p>
                    )}
                    {selectedAuth.grass_root_date && (
                      <p className="text-sm text-gray-600">日期：{new Date(selectedAuth.grass_root_date).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                )}

                {selectedAuth.audit_step === 'union_committee' && (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-indigo-800 mb-3">第二级：工会委员会意见</h3>
                    {selectedAuth.grass_root_signature && (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-100">
                        <p className="text-sm text-gray-500">一级审批人：</p>
                        <p className="font-medium text-indigo-700">{selectedAuth.grass_root_signature}</p>
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

                <div className="flex space-x-3">
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
          </div>
        )}
      </Modal>
    </div>
  )
}
