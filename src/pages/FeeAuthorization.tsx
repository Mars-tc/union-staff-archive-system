import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Clock, XCircle, ArrowRight, FileText, Calendar, Signature, ChevronRight, Shield, Award, RefreshCw, UserPlus } from 'lucide-react'
import { SignaturePad } from '../components/SignaturePad'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface ExistingAuthorization {
  id: number
  start_date: string
  signature: string
  status: string
  audit_step: string
  grass_root_opinion: string
  grass_root_signature: string
  grass_root_date: string
  union_committee_opinion: string
  union_committee_signature: string
  union_committee_date: string
  remark: string
  created_at: string
}

export const FeeAuthorization = () => {
  const { user } = useAuthStore()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    start_date: '',
  })
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [existingAuthorization, setExistingAuthorization] = useState<ExistingAuthorization | null>(null)
  const [isRejected, setIsRejected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.union_member) {
      setLoading(false)
      return
    }
    const checkExistingAuthorization = async () => {
      try {
        const response = await api.fee.getAuthorizations(undefined, true)
        if (response.success && response.data.length > 0) {
          const auth = response.data[0]
          setExistingAuthorization(auth)
          setIsRejected(auth.status === 'rejected')
        }
      } catch {
        showError('检查授权状态失败')
      } finally {
        setLoading(false)
      }
    }
    checkExistingAuthorization()
  }, [user?.union_member])

  if (!user?.union_member) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto">
              <CreditCard size={48} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">仅工会会员可申请会费授权</h2>
            <p className="text-blue-100 mt-2">请先加入工会成为工会会员</p>
          </div>
          <div className="p-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <UserPlus size={20} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">如何成为工会会员</h4>
                  <p className="text-gray-500 text-sm">请提交入会申请，经审核通过后即可成为工会会员</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/membership/apply'}
              className="mt-6 w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
            >
              <UserPlus size={18} className="mr-2" />
              提交入会申请
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusInfo = () => {
    if (!existingAuthorization) return { text: '', color: '', bg: '', icon: null }
    const { status, audit_step } = existingAuthorization
    if (status === 'approved') {
      return { text: '授权已通过', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle }
    }
    if (status === 'rejected') {
      return { text: '授权已拒绝', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle }
    }
    if (audit_step === 'pending' || audit_step === 'grass_root') {
      return { text: '待基层审核', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock }
    }
    if (audit_step === 'union_committee') {
      return { text: '待委员会审核', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock }
    }
    return { text: '审核中', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    if (!signature) {
      setError('请完成电子签名')
      setSubmitting(false)
      return
    }

    if (!formData.start_date) {
      setError('请选择生效日期')
      setSubmitting(false)
      return
    }

    try {
      const response = await api.fee.authorize({
        signature,
        start_date: formData.start_date,
      })

      if (response.success) {
        showSuccess('授权提交成功，等待审核')
        setExistingAuthorization(response.data)
      } else {
        showError(response.error)
      }
    } catch {
      showError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReapply = () => {
    setExistingAuthorization(null)
    setIsRejected(false)
    setFormData({ start_date: '' })
    setSignature('')
    setError('')
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (existingAuthorization && !isRejected) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-white/20 rounded-xl mr-4">
              <CreditCard size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">工会会费缴纳的授权书</h1>
              <p className="text-green-100 mt-1">查看您的会费授权状态</p>
            </div>
          </div>
          <div className="flex items-center mt-6">
            <div className={`flex items-center px-4 py-2 rounded-full ${statusInfo.bg} ${statusInfo.color} font-medium`}>
              {StatusIcon && <StatusIcon size={20} className="mr-2" />}
              {statusInfo.text}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <FileText size={20} className="mr-2 text-green-600" />
                授权详情
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center text-green-600 mb-2">
                    <Calendar size={18} className="mr-2" />
                    <span className="text-sm font-medium">生效日期</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">
                    {new Date(existingAuthorization.start_date).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center text-blue-600 mb-2">
                    <Clock size={18} className="mr-2" />
                    <span className="text-sm font-medium">申请时间</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(existingAuthorization.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              {existingAuthorization.signature && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-gray-600">
                      <Signature size={18} className="mr-2" />
                      <span className="text-sm font-medium">申请人签名</span>
                    </div>
                    <span className="text-sm text-gray-500">{user?.name}</span>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <img src={existingAuthorization.signature} alt="签名" className="max-h-20" />
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <Shield size={18} className="mr-2 text-green-600" />
                  审核流程
                </h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  <div className={`relative pl-12 pb-6 ${existingAuthorization.grass_root_opinion ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${existingAuthorization.grass_root_opinion ? 'bg-green-500' : 'bg-gray-300'} text-white`}>
                      {existingAuthorization.grass_root_opinion ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div className="mt-3">
                      <h4 className="font-medium text-gray-800">工会基层委员会审核</h4>
                      {existingAuthorization.grass_root_opinion && (
                        <div className="mt-2 bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-600">{existingAuthorization.grass_root_opinion}</p>
                          <div className="flex items-center mt-2 text-sm text-gray-500">
                            <span className="mr-4">签字人：{existingAuthorization.grass_root_signature}</span>
                            {existingAuthorization.grass_root_date && (
                              <span>日期：{new Date(existingAuthorization.grass_root_date).toLocaleDateString('zh-CN')}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {!existingAuthorization.grass_root_opinion && (
                        <p className="text-gray-400 mt-2">等待审核中...</p>
                      )}
                    </div>
                  </div>

                  <div className={`relative pl-12 ${existingAuthorization.union_committee_opinion ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${existingAuthorization.union_committee_opinion ? 'bg-green-500' : 'bg-gray-300'} text-white`}>
                      {existingAuthorization.union_committee_opinion ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div className="mt-3">
                      <h4 className="font-medium text-gray-800">工会委员会审核</h4>
                      {existingAuthorization.union_committee_opinion && (
                        <div className="mt-2 bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-600">{existingAuthorization.union_committee_opinion}</p>
                          <div className="flex items-center mt-2 text-sm text-gray-500">
                            <span className="mr-4">签字人：{existingAuthorization.union_committee_signature}</span>
                            {existingAuthorization.union_committee_date && (
                              <span>日期：{new Date(existingAuthorization.union_committee_date).toLocaleDateString('zh-CN')}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {!existingAuthorization.union_committee_opinion && (
                        <p className="text-gray-400 mt-2">等待审核中...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {existingAuthorization.remark && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-1">审核备注</h4>
                  <p className="text-yellow-700">{existingAuthorization.remark}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center mb-4">
          <div className="p-3 bg-white/20 rounded-xl mr-4">
            <CreditCard size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">工会会费缴纳的授权书</h1>
            <p className="text-green-100 mt-1">授权工会从您的工资账户划扣会费</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full" />
            <span className="text-sm">填写信息</span>
            <ArrowRight size={16} className="text-green-200" />
            <div className="w-3 h-3 bg-white/50 rounded-full" />
            <span className="text-sm text-green-200">电子签名</span>
            <ArrowRight size={16} className="text-green-200" />
            <div className="w-3 h-3 bg-white/50 rounded-full" />
            <span className="text-sm text-green-200">提交审核</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText size={20} className="mr-2 text-green-600" />
              {isRejected ? '重新申请授权' : '新增授权'}
            </h2>
          </div>

          <div className="p-6">
            <div className="relative bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 mb-6">
              <div className="absolute top-3 left-3 w-8 h-0.5 bg-green-400" />
              <div className="absolute top-3 right-3 w-8 h-0.5 bg-green-400" />
              <div className="absolute bottom-3 left-3 w-8 h-0.5 bg-green-400" />
              <div className="absolute bottom-3 right-3 w-8 h-0.5 bg-green-400" />
              
              <h3 className="text-center font-bold text-green-800 mb-4">授权声明</h3>
              <p className="text-green-800 text-sm leading-relaxed text-justify">
                XX企业工会：本人作为工会会员，负有缴纳工会会费的义务，具体的缴费标准和要求按照局相关制度执行。本人工会会费的缴纳方式为：授权工会按照缴费标准和要求从我的个人工资账户直接划扣。本授权从生效日期起生效，在本人书面撤销本授权书之前，一直有效。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-4 flex items-center">
                  <Calendar size={18} className="mr-2 text-green-600" />
                  授权信息
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    生效日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-2">授权将从所选日期开始生效</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-4 flex items-center">
                  <Signature size={18} className="mr-2 text-green-600" />
                  电子签名
                </h3>
                <SignaturePad onSignature={setSignature} />
              </div>

              {error && (
                <div className="flex items-center text-red-500 bg-red-50 rounded-lg p-3">
                  <XCircle size={16} className="mr-2 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 flex items-center justify-center shadow-lg shadow-green-200"
              >
                {submitting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                    提交中...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} className="mr-2" />
                    确认授权
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                点击确认授权即表示您已阅读并同意授权声明内容
              </p>
            </form>
          </div>
        </div>

        {isRejected && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 mt-4">
            <div className="flex items-center">
              <XCircle size={18} className="text-red-500 mr-2" />
              <span className="text-red-700">您的授权申请已被拒绝，可重新提交申请</span>
              <button
                onClick={handleReapply}
                className="ml-auto flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
              >
                <RefreshCw size={16} className="mr-1" />
                重新申请
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}