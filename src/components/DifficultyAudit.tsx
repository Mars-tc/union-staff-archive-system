import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, FileText, Banknote, Users, Heart, Upload, AlertCircle } from 'lucide-react'
import { Modal } from './Modal'
import { SignaturePad } from './SignaturePad'
import { QuickOpinionButtons } from './QuickOpinionButtons'
import { DateTimePicker } from './DateTimePicker'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface DifficultyApplicationDetail {
  id: number
  user_id: number
  disease_type_id: number
  amount: number
  reason: string
  status: string
  signature: string
  remark: string
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
  auditor_id: number | null
  audit_step: string
  actual_amount: number | null
  created_at: string
  updated_at: string
  name: string
  email: string
  phone: string
  disease_name: string
  disease_category: string
}

interface DifficultyAuditProps {
  isOpen: boolean
  onClose: () => void
  applicationId: number
  onAuditComplete: () => void
}

const categoryLabels: Record<string, string> = {
  disability: '伤残致困',
  accident: '意外致困',
  disease: '因病致困',
  education: '子女助学',
  special: '特殊困难',
}

export const DifficultyAudit = ({ isOpen, onClose, applicationId, onAuditComplete }: DifficultyAuditProps) => {
  const { user } = useAuthStore()
  const { showError } = useToast()
  const [application, setApplication] = useState<DifficultyApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')

  const canDoGrassRootAudit = () => {
    return user?.role === 'grass_root_auditor' || user?.role === 'admin'
  }

  const canDoUnionCommitteeAudit = () => {
    return user?.role === 'union_committee_auditor' || user?.role === 'admin'
  }

  const [auditForm, setAuditForm] = useState({
    grass_root_opinion: '',
    grass_root_date: '',
    union_committee_opinion: '',
    union_committee_date: '',
    actual_amount: '',
    remark: '',
  })

  const fetchApplication = useCallback(async () => {
    setLoading(true)
    setDuplicateWarning('')
    try {
      const response = await api.difficulty.getApplication(applicationId)
      if (response.success) {
        setApplication(response.data)
        setAuditForm({
          grass_root_opinion: response.data.grass_root_opinion || '',
          grass_root_date: response.data.grass_root_date || '',
          union_committee_opinion: response.data.union_committee_opinion || '',
          union_committee_date: response.data.union_committee_date || '',
          actual_amount: response.data.actual_amount?.toString() || '',
          remark: response.data.remark || '',
        })
        

        if (response.data.disease_type_id) {
          const duplicateResponse = await api.difficulty.checkDuplicate(response.data.disease_type_id, response.data.user_id)
          if (duplicateResponse.success && duplicateResponse.data.isDuplicate) {
            const existingApp = duplicateResponse.data.existingApplication
            if (existingApp && existingApp.id !== applicationId) {
              const diseaseName = existingApp.disease_name || response.data.disease_name || '该病种'
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
      }
    } catch {
      showError('获取申请详情失败')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchApplication()
    }
  }, [isOpen, applicationId, fetchApplication])

  const handleGrassRootPass = async () => {
    if (!auditForm.grass_root_opinion) {
      setError('请填写基层工会审核意见')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.difficulty.updateApplication(applicationId, {
        grass_root_opinion: auditForm.grass_root_opinion,
        grass_root_date: auditForm.grass_root_date || new Date().toISOString().split('T')[0],
        audit_step: 'union_committee',
      })
      onAuditComplete()
      onClose()
    } catch (error) {
      setError((error as Error).message || '审核提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrassRootReject = async () => {
    if (!auditForm.grass_root_opinion) {
      setError('请填写基层工会审核意见')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.difficulty.updateApplication(applicationId, {
        grass_root_opinion: auditForm.grass_root_opinion,
        grass_root_date: auditForm.grass_root_date || new Date().toISOString().split('T')[0],
        status: 'rejected',
        audit_step: 'completed',
        remark: auditForm.remark,
      })
      onAuditComplete()
      onClose()
    } catch (error) {
      setError((error as Error).message || '审核提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommitteePass = async () => {
    if (!auditForm.union_committee_opinion) {
      setError('请填写委员会审核意见')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.difficulty.updateApplication(applicationId, {
        union_committee_opinion: auditForm.union_committee_opinion,
        union_committee_date: auditForm.union_committee_date || new Date().toISOString().split('T')[0],
        status: 'approved',
        audit_step: 'completed',
        actual_amount: auditForm.actual_amount ? parseFloat(auditForm.actual_amount) : undefined,
        remark: auditForm.remark,
      })
      onAuditComplete()
      onClose()
    } catch (error) {
      setError((error as Error).message || '审核提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommitteeReject = async () => {
    if (!auditForm.union_committee_opinion) {
      setError('请填写委员会审核意见')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.difficulty.updateApplication(applicationId, {
        union_committee_opinion: auditForm.union_committee_opinion,
        union_committee_date: auditForm.union_committee_date || new Date().toISOString().split('T')[0],
        status: 'rejected',
        audit_step: 'completed',
        remark: auditForm.remark,
      })
      onAuditComplete()
      onClose()
    } catch (error) {
      setError((error as Error).message || '审核提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getStepStatus = () => {
    if (!application) return '待审批'
    if (application.status === 'approved') return '已通过'
    if (application.status === 'rejected') return '已拒绝'
    switch (application.audit_step) {
      case 'pending':
        return '待基层工会审核'
      case 'grass_root':
        return '待基层工会审核'
      case 'union_committee':
        return '待委员会审核'
      case 'completed':
        return '已完成'
      default:
        return '待审批'
    }
  }

  const getStepColor = () => {
    if (!application) return 'bg-yellow-100 text-yellow-700'
    if (application.status === 'approved') return 'bg-green-100 text-green-700'
    if (application.status === 'rejected') return 'bg-red-100 text-red-700'
    if (application.audit_step === 'union_committee') return 'bg-blue-100 text-blue-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="困难帮扶审批" size="lg">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Modal>
    )
  }

  if (!application) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="困难帮扶审批" size="lg">
        <div className="text-center py-8 text-gray-500">申请不存在</div>
      </Modal>
    )
  }

  const isGrassRootStep = application.audit_step === 'pending' || application.audit_step === 'grass_root'
  const isCommitteeStep = application.audit_step === 'union_committee'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="困难帮扶审批" size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Heart size={24} className="text-purple-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-800">困难帮扶申请</h3>
              <p className="text-sm text-gray-500">申请编号：{application.id}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm rounded-full ${getStepColor()}`}>
            {getStepStatus()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">申请人</p>
            <p className="font-medium text-gray-800">{application.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">联系电话</p>
            <p className="font-medium text-gray-800">{application.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">申请时间</p>
            <p className="font-medium text-gray-800">{new Date(application.created_at).toLocaleString('zh-CN')}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">申请信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 mr-2">
                  {categoryLabels[application.difficulty_category] || '其他'}
                </span>
                <span className="font-medium text-gray-800">{application.disease_name}</span>
              </div>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">申请金额</p>
              <p className="font-medium text-gray-800">¥{Number(application.amount || 0).toFixed(2)}</p>
            </div>
          </div>
          {application.reason && (
            <div className="mt-3 p-3 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">申请理由</p>
              <p className="text-gray-700 text-sm">{application.reason}</p>
            </div>
          )}
        </div>

        {application.family_income || application.family_members ? (
          <div>
            <div className="flex items-center mb-3">
              <Users size={18} className="text-blue-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">家庭经济情况</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {application.family_income !== null && (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">家庭年收入</p>
                  <p className="font-medium text-gray-800">¥{application.family_income.toFixed(2)}</p>
                </div>
              )}
              {application.family_members && (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">家庭成员情况</p>
                  <p className="text-gray-700 text-sm">{application.family_members}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {application.bank_name || application.bank_account_name || application.bank_account ? (
          <div>
            <div className="flex items-center mb-3">
              <Banknote size={18} className="text-green-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">收款账户信息</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {application.bank_name && (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">开户银行</p>
                  <p className="font-medium text-gray-800">{application.bank_name}</p>
                </div>
              )}
              {application.bank_account_name && (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">收款人</p>
                  <p className="font-medium text-gray-800">{application.bank_account_name}</p>
                </div>
              )}
              {application.bank_account && (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">银行账号</p>
                  <p className="font-medium text-gray-800">{application.bank_account}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {application.document_path && (
          <div>
            <div className="flex items-center mb-3">
              <FileText size={18} className="text-orange-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">证明材料</h4>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <a href={`/api/uploads/${application.document_path}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                <Upload size={18} className="mr-2" />
                {application.document_path}
              </a>
            </div>
          </div>
        )}

        {application.grass_root_opinion && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">基层工会审核意见</h4>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-gray-700 mb-2">{application.grass_root_opinion}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>审核人：{application.grass_root_signature || '-'}</span>
                <span>审核日期：{application.grass_root_date ? new Date(application.grass_root_date).toLocaleDateString('zh-CN') : '-'}</span>
              </div>
            </div>
          </div>
        )}

        {isGrassRootStep && application.status === 'pending' && canDoGrassRootAudit() && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">基层工会审核</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">审核意见 *</label>
                <QuickOpinionButtons onSelect={(opinion) => setAuditForm({ ...auditForm, grass_root_opinion: opinion })} />
                <textarea
                  value={auditForm.grass_root_opinion}
                  onChange={(e) => setAuditForm({ ...auditForm, grass_root_opinion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="请填写基层工会审核意见"
                />
              </div>
              <DateTimePicker
              label="审核日期"
              value={auditForm.grass_root_date}
              onChange={(value) => setAuditForm({ ...auditForm, grass_root_date: value })}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleGrassRootPass}
                disabled={submitting || !auditForm.grass_root_opinion}
                className="flex-1 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center"
              >
                <CheckCircle size={18} className="mr-2" />
                审核通过
              </button>
              <button
                onClick={handleGrassRootReject}
                disabled={submitting || !auditForm.grass_root_opinion}
                className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center"
              >
                <XCircle size={18} className="mr-2" />
                  拒绝申请
                </button>
              </div>
            </div>
          </div>
        )}

        {isCommitteeStep && application.status === 'pending' && canDoUnionCommitteeAudit() && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">委员会审核</h4>
            <div className="space-y-4">
              {application.grass_root_signature && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-500">一级审批人：</p>
                  <p className="font-medium text-blue-700">{application.grass_root_signature}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">审核意见 *</label>
                <QuickOpinionButtons onSelect={(opinion) => setAuditForm({ ...auditForm, union_committee_opinion: opinion })} />
                <textarea
                  value={auditForm.union_committee_opinion}
                  onChange={(e) => setAuditForm({ ...auditForm, union_committee_opinion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="请填写委员会审核意见"
                />
              </div>
              <DateTimePicker
                label="审批日期"
                value={auditForm.union_committee_date}
                onChange={(value) => setAuditForm({ ...auditForm, union_committee_date: value })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">实际补助金额（元）</label>
                <input
                  type="number"
                  value={auditForm.actual_amount}
                  onChange={(e) => setAuditForm({ ...auditForm, actual_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="实际补助金额"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={auditForm.remark}
                  onChange={(e) => setAuditForm({ ...auditForm, remark: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="其他备注信息"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCommitteePass}
                  disabled={submitting || !auditForm.union_committee_opinion}
                  className="flex-1 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center"
                >
                  <CheckCircle size={18} className="mr-2" />
                  审批通过
                </button>
                <button
                  onClick={handleCommitteeReject}
                  disabled={submitting || !auditForm.union_committee_opinion}
                  className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center"
                >
                  <XCircle size={18} className="mr-2" />
                  拒绝申请
                </button>
              </div>
            </div>
          </div>
        )}

        {application.union_committee_opinion && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">委员会审核意见</h4>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-gray-700 mb-2">{application.union_committee_opinion}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>审核人：{application.union_committee_signature || '-'}</span>
                <span>审核日期：{application.union_committee_date ? new Date(application.union_committee_date).toLocaleDateString('zh-CN') : '-'}</span>
              </div>
              {application.actual_amount !== null && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <span className="text-sm text-gray-500">实际补助金额：</span>
                  <span className="font-medium text-blue-700">¥{application.actual_amount.toFixed(2)}</span>
                </div>
              )}
              {application.remark && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <span className="text-sm text-gray-500">备注：</span>
                  <span className="text-gray-700">{application.remark}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {duplicateWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle size={20} className="text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">重复申请警告</p>
              <p className="text-red-600 text-sm mt-1">{duplicateWarning}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {application.status === 'pending' && !canDoGrassRootAudit() && !canDoUnionCommitteeAudit() && (
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
  </Modal>
)
}