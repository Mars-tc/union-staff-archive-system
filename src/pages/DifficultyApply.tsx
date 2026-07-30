import { useState, useEffect, useCallback } from 'react'
import { Heart, AlertTriangle, CheckCircle, Upload, Banknote, Users, FileText, AlertCircle, GitBranch } from 'lucide-react'
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

export const DifficultyApply = () => {
  const { user } = useAuthStore()
  const { showError, showSuccess } = useToast()
  const isUnionMember = user?.union_member === true
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
  const [syncMutualAid, setSyncMutualAid] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [diseaseResponse, categoryResponse] = await Promise.all([
          api.difficulty.getDiseaseTypes(),
          api.difficulty.getCategories(),
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
    }
    fetchData()
  }, [showError])

  const checkDuplicate = useCallback(async (diseaseTypeId: number) => {
    try {
      const response = await api.difficulty.checkDuplicate(diseaseTypeId)
      if (response.success && response.data.isDuplicate) {
        const disease = diseaseTypes.find((d) => d.id === diseaseTypeId)
        setDuplicateWarning(`${disease?.name || '该病种'}已享受过补助，同一病种仅能申请一次`)
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
      const response = await api.difficulty.apply({
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
        create_mutual_aid: syncMutualAid,
      })

      if (response.success) {
        if (uploadFile && response.data?.id) {
          setUploading(true)
          await api.difficulty.uploadDocument(response.data.id, uploadFile)
          setUploading(false)
        }
        if (syncMutualAid && response.mutualAidApplication) {
          setSuccessMessage('您的困难帮扶申请和爱心帮扶申请均已提交，请等待管理员审批')
        } else if (syncMutualAid && !response.mutualAidApplication) {
          setSuccessMessage('您的困难帮扶申请已提交（爱心帮扶申请因同病种已存在而未创建），请等待管理员审批')
        } else {
          setSuccessMessage('您的困难帮扶申请已提交，请等待管理员审批')
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
          <p className="text-gray-500">{successMessage}</p>
        </div>
      </div>
    )
  }

  const groupedDiseaseTypes = {
    重疾: diseaseTypes.filter((d) => d.category === '重疾'),
    慢病: diseaseTypes.filter((d) => d.category === '慢病'),
    其他: diseaseTypes.filter((d) => d.category === '其他'),
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center mb-6">
          <Heart size={28} className="text-purple-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">困难帮扶申请</h2>
        </div>

        {!isUnionMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle size={20} className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">您还不是工会会员</p>
                <p className="text-yellow-600 text-sm mt-1">请先申请加入工会成为工会会员后，才能申请困难帮扶。</p>
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
                      ? 'border-blue-500 bg-blue-50'
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
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
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
                                  ? 'border-blue-500 bg-blue-50'
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
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入申请金额"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申请理由 *</label>
            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-800 mb-1">填写说明：</p>
              {formData.difficulty_category === 'disease' && (
                <p className="text-xs text-blue-700">请填写重疾名称和发生年份，例如："2023年确诊肺癌"</p>
              )}
              {formData.difficulty_category === 'disability' && (
                <p className="text-xs text-blue-700">请注明经当地劳动部门鉴定的伤残级别，例如："经XX市劳动部门鉴定为三级伤残"</p>
              )}
              {formData.difficulty_category === 'education' && (
                <p className="text-xs text-blue-700">请注明入学子女人数以及入读学校级别（小学、初中、高中/中专/技校、大学/大专/本科），例如："2名子女，1人就读高中，1人就读大学本科"</p>
              )}
              {formData.difficulty_category === 'special' && (
                <p className="text-xs text-blue-700">请写明具体申请情况，若为一次性困难补助，请在备注中说明，例如："因家庭突发变故申请一次性困难补助"</p>
              )}
              {formData.difficulty_category === 'accident' && (
                <p className="text-xs text-blue-700">请详细描述意外事故发生时间、经过及造成的困难，例如："2023年发生交通事故，导致家庭经济困难"</p>
              )}
              {!formData.difficulty_category && (
                <p className="text-xs text-blue-700">请先选择困难类别，填写相应的申请理由</p>
              )}
            </div>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <Users size={20} className="text-blue-600 mr-2" />
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
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入家庭年收入"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">家庭成员情况</label>
                <textarea
                  value={formData.family_members}
                  onChange={(e) => setFormData({ ...formData, family_members: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入开户银行"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">收款人姓名</label>
                <input
                  type="text"
                  value={formData.bank_account_name}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入收款人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">银行账号</label>
                <input
                  type="text"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入银行账号"
                />
              </div>
            </div>
          </div>

          {isMutualAidMember && isUnionMember && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncMutualAid}
                    onChange={(e) => setSyncMutualAid(e.target.checked)}
                    className="mt-1 mr-3 w-4 h-4 text-pink-500 border-pink-300 rounded focus:ring-pink-500"
                  />
                  <div>
                    <div className="flex items-center">
                      <GitBranch size={16} className="text-pink-600 mr-1" />
                      <span className="text-sm font-medium text-pink-800">同时申请爱心帮扶</span>
                    </div>
                    <p className="text-xs text-pink-600 mt-1">
                      勾选后，提交困难帮扶申请的同时将自动创建一份爱心帮扶申请（使用相同的申请信息）
                    </p>
                    {syncMutualAid && formData.difficulty_category === 'disease' && (
                      <p className="text-xs text-orange-600 mt-1">
                        注意：爱心帮扶也受"因病致困同一病种仅能申请一次"的限制，若已有该病种的爱心帮扶申请，则不会重复创建
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

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
            disabled={!isUnionMember || submitting || uploading || (formData.difficulty_category === 'disease' && !!duplicateWarning)}
            className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
          >
            {!isUnionMember ? '请先加入工会' : submitting ? '提交中...' : uploading ? '上传文件中...' : '提交申请'}
          </button>
        </form>
      </div>
    </div>
  )
}
