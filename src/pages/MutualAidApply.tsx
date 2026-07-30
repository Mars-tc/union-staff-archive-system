import { useState } from 'react'
import { HandHeart, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { SignaturePad } from '../components/SignaturePad'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

const validateIdCard = (idCard: string): string | null => {
  if (!idCard) return null
  const regex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  return regex.test(idCard) ? null : '请输入有效的身份证号码'
}

const validateMobilePhone = (phone: string): string | null => {
  if (!phone) return null
  const regex = /^1[3-9]\d{9}$/
  return regex.test(phone) ? null : '请输入有效的手机号码'
}

const validateZipCode = (zip: string): string | null => {
  if (!zip) return null
  const regex = /^\d{6}$/
  return regex.test(zip) ? null : '请输入有效的邮编（6位数字）'
}

const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) return `${fieldName}不能为空`
  return null
}

interface FieldErrors {
  gender: string | null
  id_card: string | null
  department: string | null
  position: string | null
  mobile_phone: string | null
  zip_code: string | null
  family_members: { relation: string | null; name: string | null; phone: string | null }[]
  signature: string | null
}

export const MutualAidApply = () => {
  const { user } = useAuthStore()
  const { showError } = useToast()
  const [formData, setFormData] = useState({
    gender: '',
    birth_date: '',
    political_status: '',
    mobile_phone: '',
    home_phone: '',
    id_card: '',
    department: '',
    position: '',
    home_address: '',
    zip_code: '',
    family_members: [{ relation: '', name: '', phone: '' }],
  })
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    gender: null,
    id_card: null,
    department: null,
    position: null,
    mobile_phone: null,
    zip_code: null,
    family_members: [{ relation: null, name: null, phone: null }],
    signature: null,
  })

  const validateField = (field: keyof FieldErrors, value: string): string | null => {
    switch (field) {
      case 'gender':
        return validateRequired(value, '性别')
      case 'id_card':
        return validateIdCard(value)
      case 'department':
        return validateRequired(value, '所在部门')
      case 'position':
        return validateRequired(value, '岗位（单位）')
      case 'mobile_phone':
        return validateMobilePhone(value)
      case 'zip_code':
        return validateZipCode(value)
      case 'signature':
        return validateRequired(value, '电子签名')
      default:
        return null
    }
  }

  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData({ ...formData, [field]: value })
    if (field === 'gender' || field === 'id_card' || field === 'department' || 
        field === 'position' || field === 'mobile_phone' || field === 'zip_code') {
      setFieldErrors({ ...fieldErrors, [field]: validateField(field, value as string) })
    }
    setError('')
  }

  const updateFamilyMember = (index: number, field: 'relation' | 'name' | 'phone', value: string) => {
    const members = [...formData.family_members]
    members[index] = { ...members[index], [field]: value }
    setFormData({ ...formData, family_members: members })

    const newErrors = [...fieldErrors.family_members]
    if (field === 'relation') {
      newErrors[index] = { ...newErrors[index], relation: validateRequired(value, '家庭成员关系') }
    } else if (field === 'name') {
      newErrors[index] = { ...newErrors[index], name: validateRequired(value, '家庭成员姓名') }
    } else if (field === 'phone') {
      newErrors[index] = { ...newErrors[index], phone: validateMobilePhone(value) }
    }
    setFieldErrors({ ...fieldErrors, family_members: newErrors })
    setError('')
  }

  const addFamilyMember = () => {
    setFormData({
      ...formData,
      family_members: [...formData.family_members, { relation: '', name: '', phone: '' }],
    })
    setFieldErrors({
      ...fieldErrors,
      family_members: [...fieldErrors.family_members, { relation: null, name: null, phone: null }],
    })
  }

  const removeFamilyMember = (index: number) => {
    if (formData.family_members.length === 1) return
    setFormData({
      ...formData,
      family_members: formData.family_members.filter((_, i) => i !== index),
    })
    setFieldErrors({
      ...fieldErrors,
      family_members: fieldErrors.family_members.filter((_, i) => i !== index),
    })
  }

  const syncProfileData = async () => {
    setSyncing(true)
    try {
      const response = await api.auth.getMe()
      if (response.success) {
        const data = response.data
        let gender = data.gender || ''
        if (gender === 'male') gender = '男'
        if (gender === 'female') gender = '女'

        let politicalStatus = data.political_status || ''
        const statusMap: Record<string, string> = {
          '党员': '中共党员',
          '预备党员': '中共预备党员',
          '团员': '共青团员',
        }
        politicalStatus = statusMap[politicalStatus] || politicalStatus

        let familyMembers = [{ relation: '', name: '', phone: '' }]
        if (data.family_members) {
          try {
            const parsed = JSON.parse(data.family_members)
            if (Array.isArray(parsed)) {
              familyMembers = parsed.length > 0 ? parsed : [{ relation: '', name: '', phone: '' }]
            }
          } catch {
            const lines = data.family_members.split('\n').filter(l => l.trim())
            familyMembers = lines.length > 0
              ? lines.map(line => {
                  const parts = line.split('-')
                  return {
                    relation: parts[0] || '',
                    name: parts[1] || '',
                    phone: parts[2] || '',
                  }
                })
              : [{ relation: '', name: '', phone: '' }]
          }
        }

        setFormData({
          gender,
          birth_date: '',
          political_status: politicalStatus,
          mobile_phone: data.phone || '',
          home_phone: '',
          id_card: data.id_card || '',
          department: data.work_unit || '',
          position: data.position || '',
          home_address: data.residence_address || '',
          zip_code: '',
          family_members: familyMembers,
        })

        setFieldErrors({
          gender: validateField('gender', gender),
          id_card: validateField('id_card', data.id_card || ''),
          department: validateField('department', data.work_unit || ''),
          position: validateField('position', data.position || ''),
          mobile_phone: validateField('mobile_phone', data.phone || ''),
          zip_code: null,
          family_members: familyMembers.map(() => ({ relation: null, name: null, phone: null })),
          signature: null,
        })

        setProfileData(data)
      }
    } catch {
      showError('同步个人信息失败')
    } finally {
      setSyncing(false)
    }
  }

  const validateAll = (): boolean => {
    const errors: FieldErrors = {
      gender: validateField('gender', formData.gender),
      id_card: validateField('id_card', formData.id_card) || validateRequired(formData.id_card, '身份证号码'),
      department: validateField('department', formData.department),
      position: validateField('position', formData.position),
      mobile_phone: validateField('mobile_phone', formData.mobile_phone),
      zip_code: validateField('zip_code', formData.zip_code),
      family_members: [],
      signature: validateField('signature', signature),
    }

    const validMembers = formData.family_members.filter((m) => m.relation || m.name || m.phone)
    for (let i = 0; i < formData.family_members.length; i++) {
      const member = formData.family_members[i]
      if (!member.relation && !member.name && !member.phone) {
        errors.family_members.push({ relation: null, name: null, phone: null })
        continue
      }
      errors.family_members.push({
        relation: validateRequired(member.relation, '家庭成员关系'),
        name: validateRequired(member.name, '家庭成员姓名'),
        phone: member.phone ? validateMobilePhone(member.phone) : null,
      })
    }

    setFieldErrors(errors)

    const hasError = Object.values(errors).some((e) => {
      if (Array.isArray(e)) {
        return e.some((m) => m.relation || m.name || m.phone)
      }
      return e !== null
    })

    if (hasError) {
      setError('请检查表单中的错误')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateAll()) {
      return
    }

    setSubmitting(true)

    try {
      const validMembers = formData.family_members.filter(
        (m) => m.relation || m.name || m.phone
      )
      const familyMembersStr = validMembers
        .map((m) => `${m.relation}-${m.name}-${m.phone}`)
        .join('\n')

      const response = await api.mutualAid.apply({
        ...formData,
        family_members: familyMembersStr,
        signature,
      })

      if (response.success) {
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
          <p className="text-gray-500">您的爱心互助会入会申请已提交，请等待审核</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <HandHeart size={28} className="text-red-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">XX企业爱心互助会入会申请书</h2>
          </div>
          <button
            type="button"
            onClick={syncProfileData}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm"
          >
            <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中...' : '同步个人信息'}
          </button>
        </div>

        <div className="mb-8 p-4 bg-red-50 rounded-lg">
          <p className="text-red-800 text-sm">
            我自愿加入XX企业爱心互助会，承认其章程，执行其各项决议，积极参加互助会活动，为爱心互助奉献自己的绵薄之力。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                value={user?.name || ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性别 *</label>
              <select
                value={formData.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  fieldErrors.gender ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">请选择性别</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
              {fieldErrors.gender && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {fieldErrors.gender}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => updateField('birth_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">政治面貌</label>
              <select
                value={formData.political_status}
                onChange={(e) => updateField('political_status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">请选择政治面貌</option>
                <option value="中共党员">中共党员</option>
                <option value="中共预备党员">中共预备党员</option>
                <option value="共青团员">共青团员</option>
                <option value="群众">群众</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">联系电话-手机</label>
              <input
                type="text"
                value={formData.mobile_phone}
                onChange={(e) => updateField('mobile_phone', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  fieldErrors.mobile_phone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="请输入手机号码"
              />
              {fieldErrors.mobile_phone && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {fieldErrors.mobile_phone}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">联系电话-家庭</label>
              <input
                type="text"
                value={formData.home_phone}
                onChange={(e) => updateField('home_phone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="请输入家庭电话"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">身份证号码 *</label>
            <input
              type="text"
              value={formData.id_card}
              onChange={(e) => updateField('id_card', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                fieldErrors.id_card ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="请输入身份证号码"
            />
            {fieldErrors.id_card && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {fieldErrors.id_card}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所在部门 *</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => updateField('department', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  fieldErrors.department ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="请输入部门名称"
              />
              {fieldErrors.department && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {fieldErrors.department}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">岗位（单位） *</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => updateField('position', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  fieldErrors.position ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="请输入岗位"
              />
              {fieldErrors.position && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {fieldErrors.position}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">家庭住址</label>
            <input
              type="text"
              value={formData.home_address}
              onChange={(e) => updateField('home_address', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="请输入家庭住址"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮编</label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => updateField('zip_code', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                fieldErrors.zip_code ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="请输入邮编"
            />
            {fieldErrors.zip_code && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {fieldErrors.zip_code}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">家庭成员</label>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">关系</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">姓名</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">联系电话</th>
                    <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 w-16">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.family_members.map((member, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={member.relation}
                          onChange={(e) => updateFamilyMember(index, 'relation', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 ${
                            fieldErrors.family_members[index]?.relation ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="如：配偶"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 ${
                            fieldErrors.family_members[index]?.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="请输入姓名"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={member.phone}
                          onChange={(e) => updateFamilyMember(index, 'phone', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 ${
                            fieldErrors.family_members[index]?.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="请输入联系电话"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeFamilyMember(index)}
                          disabled={formData.family_members.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fieldErrors.family_members.some((m) => m.relation || m.name || m.phone) && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                请检查家庭成员信息填写是否完整
              </p>
            )}
            <button
              type="button"
              onClick={addFamilyMember}
              className="mt-2 text-red-500 hover:text-red-600 text-sm font-medium"
            >
              + 添加家庭成员
            </button>
          </div>

          <SignaturePad onSignature={setSignature} />

          {error && (
            <div className="text-red-500 text-sm flex items-center">
              <AlertCircle size={14} className="mr-1" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:bg-red-300 transition-colors"
          >
            {submitting ? '提交中...' : '提交申请'}
          </button>
        </form>
      </div>
    </div>
  )
}