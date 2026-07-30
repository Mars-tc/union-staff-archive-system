import { useState, useEffect, useCallback } from 'react'
import { Heart, AlertTriangle, CheckCircle, Upload, Banknote, Users, FileText, AlertCircle, Download, X, ChevronRight } from 'lucide-react'
import { SignaturePad } from '../components/SignaturePad'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface DiseaseType {
  id: number
  name: string
  category: string
}

interface DifficultyCategory {
  value: string
  label: string
}

interface DifficultyApplication {
  id: number
  disease_type_id: number | null
  disease_name?: string
  amount: number
  reason: string
  difficulty_category: string
  family_income: number | null
  family_members: string | null
  bank_account: string | null
  bank_name: string | null
  bank_account_name: string | null
  status: string
  created_at: string
}

export const MutualAidDifficultyApply = () => {
  const { user } = useAuthStore()
  const { showError, showSuccess } = useToast()
  const isMutualAidMember = user?.mutual_aid_member === true

  const [formData, setFormData] = useState({
    disease_type_id: '',
    amount: '',
    reason: '',
    difficulty_category: '',
    family_income: '',
    family_members: '',
    bank_account: '',
    bank_name: '',
    bank_account_name: '',
  })
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [diseaseTypes, setDiseaseTypes] = useState<DiseaseType[]>([])
  const [categories, setCategories] = useState<DifficultyCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [userApplications, setUserApplications] = useState<DifficultyApplication[]>([])
  const [importing, setImporting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [diseaseResponse, categoryResponse] = await Promise.all([
        api.mutualAidDifficulty.getDiseaseTypes(),
        api.mutualAidDifficulty.getCategories(),
      ])
      if (diseaseResponse.success) {
        setDiseaseTypes(diseaseResponse.data)
      }
      if (categoryResponse.success) {
        setCategories(categoryResponse.data)
      }
    } catch {
      showError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const checkDuplicate = useCallback(async (diseaseTypeId: number) => {
    try {
      const response = await api.mutualAidDifficulty.checkDuplicate(diseaseTypeId)
      if (response.success && response.data.isDuplicate) {
        const disease = diseaseTypes.find((d) => d.id === diseaseTypeId)
        setDuplicateWarning(`${disease?.name || '该病种'}已申请过爱心帮扶，同一病种仅能申请一次`)
      } else {
        setDuplicateWarning('')
      }
    } catch {
      showError('检查重复申请失败')
    }
  }, [diseaseTypes, showError])

  useEffect(() => {
    if (formData.disease_type_id && formData.difficulty_category === 'disease') {
      checkDuplicate(parseInt(formData.disease_type_id))
    } else {
      setDuplicateWarning('')
    }
  }, [formData.disease_type_id, formData.difficulty_category, checkDuplicate])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const response = await api.difficulty.getUserApplications()
      if (response.success) {
        setUserApplications(response.data)
        setShowImportDialog(true)
      } else {
        showError('获取困难帮扶记录失败')
      }
    } catch {
      showError('获取困难帮扶记录失败')
    } finally {
      setImporting(false)
    }
  }

  const handleSelectImport = (application: DifficultyApplication) => {
    setFormData({
      disease_type_id: application.disease_type_id ? application.disease_type_id.toString() : '',
      amount: application.amount.toString(),
      reason: application.reason || '',
      difficulty_category: application.difficulty_category || '',
      family_income: application.family_income ? application.family_income.toString() : '',
      family_members: application.family_members || '',
      bank_account: application.bank_account || '',
      bank_name: application.bank_name || '',
      bank_account_name: application.bank_account_name || '',
    })
    setSignature('')
    setShowImportDialog(false)
    showSuccess('已导入困难帮扶数据，请确认并完成签名')
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

    if (duplicateWarning) {
      setError(duplicateWarning)
      setSubmitting(false)
      return
    }

    const requiredFields = ['amount', 'reason', 'difficulty_category']
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setError('请填写所有必填项')
        setSubmitting(false)
        return
      }
    }

    if (formData.difficulty_category === 'disease' && !formData.disease_type_id) {
      setError('因病致困需要选择病种')
      setSubmitting(false)
      return
    }

    try {
      const response = await api.mutualAidDifficulty.apply({
        disease_type_id: formData.disease_type_id ? parseInt(formData.disease_type_id) : undefined,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        signature,
        difficulty_category: formData.difficulty_category,
        family_income: formData.family_income ? parseFloat(formData.family_income) : undefined,
        family_members: formData.family_members || undefined,
        bank_account: formData.bank_account || undefined,
        bank_name: formData.bank_name || undefined,
        bank_account_name: formData.bank_account_name || undefined,
      })

      if (response.success) {
        if (uploadFile && response.data?.id) {
          setUploading(true)
          await api.mutualAidDifficulty.uploadDocument(response.data.id, uploadFile)
          setUploading(false)
        }
        setSuccess(true)
      } else {
        setError(response.error)
      }
    } catch {
      setError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">申请提交成功</h2>
          <p className="text-gray-500">您的爱心帮扶申请已提交，请等待管理员审批</p>
        </div>
      </div>
    )
  }

  const groupedDiseaseTypes = {
    重疾: diseaseTypes.filter((d) => d.category === '重疾'),
    慢病: diseaseTypes.filter((d) => d.category === '慢病'),
    其他: diseaseTypes.filter((d) => d.category === '其他'),
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '审核中'
      case 'approved': return '已通过'
      case 'rejected': return '已拒绝'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'approved': return 'text-green-600 bg-green-50'
      case 'rejected': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryLabel = (category: string) => {
    const cat = categories.find((c) => c.value === category)
    return cat?.label || category
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Heart size={28} className="text-red-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">爱心帮扶申请</h2>
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={!isMutualAidMember || importing}
            className="flex items-center px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} className="mr-1" />
            {importing ? '加载中...' : '从困难帮扶导入'}
          </button>
        </div>

        {!isMutualAidMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle size={20} className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">您还不是爱心互助会会员</p>
                <p className="text-yellow-600 text-sm mt-1">请先申请加入爱心互助会成为会员后，才能申请爱心帮扶。</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">困难类别 *</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <label
                  key={cat.value}
                  className={`flex items-center p-2 border rounded-lg cursor-pointer ${
                    formData.difficulty_category === cat.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="difficulty_category"
                    value={cat.value}
                    checked={formData.difficulty_category === cat.value}
                    onChange={(e) => setFormData({ ...formData, difficulty_category: e.target.value })}
                    className="sr-only"
                  />
                  <span className="text-sm text-gray-700">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {formData.difficulty_category === 'disease' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">病种 *</label>
              {loading ? (
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
              ) : diseaseTypes.length === 0 ? (
                <div className="text-gray-500 text-sm">暂无病种数据</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedDiseaseTypes).map(([category, types]) => (
                    <div key={category}>
                      <p className="text-sm font-medium text-gray-600 mb-2">{category}</p>
                      {types.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {types.map((type) => (
                            <label
                              key={type.id}
                              className={`flex items-center p-2 border rounded-lg cursor-pointer ${
                                formData.disease_type_id === type.id.toString()
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="disease_type_id"
                                value={type.id}
                                checked={formData.disease_type_id === type.id.toString()}
                                onChange={(e) => setFormData({ ...formData, disease_type_id: e.target.value })}
                                className="sr-only"
                              />
                              <span className="text-sm text-gray-700">{type.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">暂无该分类下的病种</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {duplicateWarning && (
                <div className="mt-2 flex items-start text-red-500 text-sm">
                  <AlertTriangle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
                  {duplicateWarning}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申请金额 *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="请输入申请金额"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申请理由 *</label>
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-800 mb-1">填写说明：</p>
              {formData.difficulty_category === 'disease' && (
                <p className="text-xs text-red-700">请填写重疾名称和发生年份，例如："2023年确诊肺癌"</p>
              )}
              {formData.difficulty_category === 'disability' && (
                <p className="text-xs text-red-700">请注明经当地劳动部门鉴定的伤残级别，例如："经XX市劳动部门鉴定为三级伤残"</p>
              )}
              {formData.difficulty_category === 'education' && (
                <p className="text-xs text-red-700">请注明入学子女人数以及入读学校级别（小学、初中、高中/中专/技校、大学/大专/本科），例如："2名子女，1人就读高中，1人就读大学本科"</p>
              )}
              {formData.difficulty_category === 'special' && (
                <p className="text-xs text-red-700">请写明具体申请情况，若为一次性困难补助，请在备注中说明，例如："因家庭突发变故申请一次性困难补助"</p>
              )}
              {formData.difficulty_category === 'accident' && (
                <p className="text-xs text-red-700">请详细描述意外事故发生时间、经过及造成的困难，例如："2023年发生交通事故，导致家庭经济困难"</p>
              )}
              {!formData.difficulty_category && (
                <p className="text-xs text-red-700">请先选择困难类别，填写相应的申请理由</p>
              )}
            </div>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder={
                formData.difficulty_category === 'disease' ? '请填写重疾名称和发生年份' :
                formData.difficulty_category === 'disability' ? '请注明经当地劳动部门鉴定的伤残级别' :
                formData.difficulty_category === 'education' ? '请注明入学子女人数及入读学校级别' :
                formData.difficulty_category === 'special' ? '请写明具体申请情况，一次性困难补助需备注' :
                formData.difficulty_category === 'accident' ? '请详细描述意外事故情况' :
                '请详细描述困难情况、病情或灾害情况'
              }
              required
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center mb-4">
              <Users size={20} className="text-red-600 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">家庭经济情况</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">家庭年收入（元）</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={formData.family_income}
                    onChange={(e) => setFormData({ ...formData, family_income: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="请输入家庭年收入"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">家庭成员情况</label>
                <textarea
                  value={formData.family_members}
                  onChange={(e) => setFormData({ ...formData, family_members: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={2}
                  placeholder="请描述家庭成员构成"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center mb-4">
              <Banknote size={20} className="text-green-600 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">收款账户信息</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开户银行</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="请输入开户银行"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">收款人姓名</label>
                <input
                  type="text"
                  value={formData.bank_account_name}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="请输入收款人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">银行账号</label>
                <input
                  type="text"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="请输入银行账号"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center mb-4">
              <FileText size={20} className="text-orange-600 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">证明材料上传（可选）</h3>
            </div>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center py-4">
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {uploadFile ? uploadFile.name : '点击上传诊断证明、困难证明等材料'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">支持 PDF、JPG、PNG 格式</p>
                </div>
                <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            </div>
          </div>

          <SignaturePad onSignature={setSignature} />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={!isMutualAidMember || submitting || uploading || (formData.difficulty_category === 'disease' && !!duplicateWarning)}
            className="w-full py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:bg-red-300 transition-colors"
          >
            {!isMutualAidMember ? '请先加入爱心互助会' : submitting ? '提交中...' : uploading ? '上传文件中...' : '提交申请'}
          </button>
        </form>

        {showImportDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">选择困难帮扶记录</h3>
                <button
                  type="button"
                  onClick={() => setShowImportDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {userApplications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>暂无困难帮扶记录</p>
                    <p className="text-sm mt-1">请先申请困难帮扶，或直接填写爱心帮扶申请表</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userApplications.map((app) => (
                      <div
                        key={app.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectImport(app)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 mr-2">
                              {getCategoryLabel(app.difficulty_category)}
                            </span>
                            {app.disease_name && (
                              <span className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 mr-2">
                                {app.disease_name}
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded ${getStatusColor(app.status)}`}>
                              {getStatusLabel(app.status)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-red-600">
                            ¥{app.amount}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{app.reason}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>申请时间: {new Date(app.created_at).toLocaleDateString('zh-CN')}</span>
                          <span className="flex items-center text-red-500">
                            选择导入 <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50">
                <p className="text-xs text-gray-500">
                  选择困难帮扶记录后，将自动填充申请信息（包括病种、金额、理由等），您可在提交前进行修改。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
