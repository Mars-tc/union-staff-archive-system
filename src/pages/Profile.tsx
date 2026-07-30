import { useState, useEffect } from 'react'
import { 
  User, Mail, Phone, Shield, CheckCircle, AlertCircle, Save, RotateCcw,
  Camera, MapPin, Building2, Award, FileText, Users, Star, ChevronRight,
  Upload, X, Plus, Trash2
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface UserData {
  id: number
  email: string
  name: string
  phone: string
  role: string
  is_retired?: boolean
  gender?: string
  education?: string
  photo_url?: string
  native_place?: string
  id_card?: string
  hukou_location?: string
  residence_address?: string
  work_unit?: string
  position?: string
  ethnicity?: string
  political_status?: string
  work_resume?: string
  family_members?: string
  specialty?: string
}

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
]

const educationOptions = [
  { value: '', label: '请选择学历' },
  { value: '小学', label: '小学' },
  { value: '初中', label: '初中' },
  { value: '高中', label: '高中' },
  { value: '中专', label: '中专' },
  { value: '大专', label: '大专' },
  { value: '本科', label: '本科' },
  { value: '硕士', label: '硕士' },
  { value: '博士', label: '博士' },
]

const politicalStatusOptions = [
  { value: '党员', label: '中共党员' },
  { value: '预备党员', label: '中共预备党员' },
  { value: '团员', label: '共青团员' },
  { value: '群众', label: '群众' },
  { value: '民主党派', label: '民主党派' },
  { value: '无党派', label: '无党派人士' },
]

const ethnicityOptions = [
  { value: '汉族', label: '汉族' },
  { value: '蒙古族', label: '蒙古族' },
  { value: '回族', label: '回族' },
  { value: '藏族', label: '藏族' },
  { value: '维吾尔族', label: '维吾尔族' },
  { value: '苗族', label: '苗族' },
  { value: '彝族', label: '彝族' },
  { value: '壮族', label: '壮族' },
  { value: '布依族', label: '布依族' },
  { value: '朝鲜族', label: '朝鲜族' },
  { value: '满族', label: '满族' },
  { value: '侗族', label: '侗族' },
  { value: '瑶族', label: '瑶族' },
  { value: '白族', label: '白族' },
  { value: '土家族', label: '土家族' },
  { value: '哈尼族', label: '哈尼族' },
  { value: '哈萨克族', label: '哈萨克族' },
  { value: '傣族', label: '傣族' },
  { value: '黎族', label: '黎族' },
  { value: '傈僳族', label: '傈僳族' },
  { value: '佤族', label: '佤族' },
  { value: '畲族', label: '畲族' },
  { value: '高山族', label: '高山族' },
  { value: '拉祜族', label: '拉祜族' },
  { value: '水族', label: '水族' },
  { value: '东乡族', label: '东乡族' },
  { value: '纳西族', label: '纳西族' },
  { value: '景颇族', label: '景颇族' },
  { value: '柯尔克孜族', label: '柯尔克孜族' },
  { value: '土族', label: '土族' },
  { value: '达斡尔族', label: '达斡尔族' },
  { value: '仫佬族', label: '仫佬族' },
  { value: '羌族', label: '羌族' },
  { value: '布朗族', label: '布朗族' },
  { value: '撒拉族', label: '撒拉族' },
  { value: '毛南族', label: '毛南族' },
  { value: '仡佬族', label: '仡佬族' },
  { value: '锡伯族', label: '锡伯族' },
  { value: '阿昌族', label: '阿昌族' },
  { value: '普米族', label: '普米族' },
  { value: '塔吉克族', label: '塔吉克族' },
  { value: '怒族', label: '怒族' },
  { value: '乌孜别克族', label: '乌孜别克族' },
  { value: '俄罗斯族', label: '俄罗斯族' },
  { value: '鄂温克族', label: '鄂温克族' },
  { value: '德昂族', label: '德昂族' },
  { value: '保安族', label: '保安族' },
  { value: '裕固族', label: '裕固族' },
  { value: '京族', label: '京族' },
  { value: '塔塔尔族', label: '塔塔尔族' },
  { value: '独龙族', label: '独龙族' },
  { value: '鄂伦春族', label: '鄂伦春族' },
  { value: '赫哲族', label: '赫哲族' },
  { value: '门巴族', label: '门巴族' },
  { value: '珞巴族', label: '珞巴族' },
  { value: '基诺族', label: '基诺族' },
]

export const Profile = () => {
  const { login } = useAuthStore()
  const { showSuccess, showError } = useToast()
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<UserData | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    is_retired: false,
    gender: '',
    education: '',
    photo_url: '',
    native_place: '',
    id_card: '',
    hukou_location: '',
    residence_address: '',
    work_unit: '',
    position: '',
    ethnicity: '',
    political_status: '',
    work_resume: '',
    family_members: '',
    specialty: '',
  })

  interface FamilyMember {
    relation: string
    name: string
    phone: string
  }

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])

  const familyMemberRelationOptions = [
    { value: '父亲', label: '父亲' },
    { value: '母亲', label: '母亲' },
    { value: '配偶', label: '配偶' },
    { value: '儿子', label: '儿子' },
    { value: '女儿', label: '女儿' },
    { value: '兄弟', label: '兄弟' },
    { value: '姐妹', label: '姐妹' },
    { value: '其他', label: '其他' },
  ]
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)

  const [errors, setErrors] = useState({
    email: '',
    phone: '',
    id_card: '',
    familyPhone: '',
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.auth.getMe()
        if (response.success) {
          setProfileData(response.data)
          setFormData({
            name: response.data.name,
            phone: response.data.phone || '',
            email: response.data.email,
            is_retired: response.data.is_retired || false,
            gender: response.data.gender || '',
            education: response.data.education || '',
            photo_url: response.data.photo_url || '',
            native_place: response.data.native_place || '',
            id_card: response.data.id_card || '',
            hukou_location: response.data.hukou_location || '',
            residence_address: response.data.residence_address || '',
            work_unit: response.data.work_unit || '',
            position: response.data.position || '',
            ethnicity: response.data.ethnicity || '',
            political_status: response.data.political_status || '',
            work_resume: response.data.work_resume || '',
            family_members: response.data.family_members || '',
            specialty: response.data.specialty || '',
          })
          
          const familyStr = response.data.family_members || ''
          if (familyStr) {
            try {
              const members = JSON.parse(familyStr)
              if (Array.isArray(members)) {
                setFamilyMembers(members)
              }
            } catch {
              const lines = familyStr.split('\n').filter(l => l.trim())
              const parsedMembers: FamilyMember[] = lines.map(line => {
                const parts = line.split('-')
                return {
                  relation: parts[0] || '',
                  name: parts[1] || '',
                  phone: parts[2] || '',
                }
              })
              setFamilyMembers(parsedMembers)
            }
          }
        }
      } catch {
        showError('获取个人信息失败')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const validateEmail = (email: string): string => {
    if (!email) return ''
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regex.test(email)) return '邮箱格式不正确'
    return ''
  }

  const validatePhone = (phone: string): string => {
    if (!phone) return ''
    const regex = /^1[3-9]\d{9}$/
    if (!regex.test(phone)) return '手机号格式不正确，请输入11位手机号'
    return ''
  }

  const validateIdCard = (idCard: string): string => {
    if (!idCard) return ''
    if (idCard.length !== 18) return '身份证号码必须为18位'
    const regex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
    if (!regex.test(idCard)) return '身份证号码格式不正确'
    return ''
  }

  const validateFamilyPhone = (members: FamilyMember[]): string => {
    for (const member of members) {
      if (member.phone && !/^1[3-9]\d{9}$/.test(member.phone)) {
        return '家庭成员联系电话格式不正确'
      }
    }
    return ''
  }

  const validateForm = (): boolean => {
    const newErrors = {
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      id_card: validateIdCard(formData.id_card),
      familyPhone: validateFamilyPhone(familyMembers),
    }
    setErrors(newErrors)
    return Object.values(newErrors).every(err => err === '')
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    if (!validateForm()) {
      setActionLoading(false)
      return
    }

    const submitData = {
      ...formData,
      family_members: JSON.stringify(familyMembers),
    }

    try {
      const response = await api.auth.updateMe(submitData)
      if (response.success) {
        showSuccess('个人信息更新成功')
        setProfileData(response.data)
        login(response.data, localStorage.getItem('token') || '')
      } else {
        showError(response.error || '更新失败')
      }
    } catch {
      showError('请求失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('两次输入的新密码不一致')
      setActionLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      showError('新密码长度至少6位')
      setActionLoading(false)
      return
    }

    try {
      const response = await api.auth.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      if (response.success) {
        showSuccess('密码修改成功，请重新登录')
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        showError(response.error || '修改失败')
      }
    } catch {
      showError('请求失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetForm = () => {
    if (profileData) {
      setFormData({
        name: profileData.name,
        phone: profileData.phone || '',
        email: profileData.email,
        is_retired: profileData.is_retired || false,
        gender: profileData.gender || '',
        education: profileData.education || '',
        photo_url: profileData.photo_url || '',
        native_place: profileData.native_place || '',
        id_card: profileData.id_card || '',
        hukou_location: profileData.hukou_location || '',
        residence_address: profileData.residence_address || '',
        work_unit: profileData.work_unit || '',
        position: profileData.position || '',
        ethnicity: profileData.ethnicity || '',
        political_status: profileData.political_status || '',
        work_resume: profileData.work_resume || '',
        family_members: profileData.family_members || '',
        specialty: profileData.specialty || '',
      })
    }
  }

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { relation: '', name: '', phone: '' }])
  }

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index))
  }

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const newMembers = [...familyMembers]
    newMembers[index] = { ...newMembers[index], [field]: value }
    setFamilyMembers(newMembers)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setPreviewPhoto(result)
      setFormData({ ...formData, photo_url: result })
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPreviewPhoto(null)
    setFormData({ ...formData, photo_url: '' })
  }

  const maskIdCard = (idCard: string) => {
    if (!idCard) return ''
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mr-4 relative">
          {previewPhoto || formData.photo_url ? (
            <img 
              src={previewPhoto || formData.photo_url} 
              alt="头像"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User size={40} className="text-blue-600" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{profileData?.name}</h2>
          <p className="text-sm text-gray-500">{profileData?.role === 'admin' ? '管理员' : '会员'}</p>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            个人信息
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            修改密码
          </button>
        </nav>
      </div>

      {activeTab === 'info' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <User className="mr-2 text-blue-600" size={20} />
              基本信息
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入姓名"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="请输入联系电话"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择性别</option>
                    {genderOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学历</label>
                  <select
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {educationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="请输入邮箱"
                      required
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">身份证号码</label>
                  <input
                    type="text"
                    value={formData.id_card}
                    onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.id_card ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="请输入身份证号码"
                    maxLength={18}
                  />
                  {errors.id_card && <p className="mt-1 text-sm text-red-500">{errors.id_card}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">民族</label>
                  <select
                    value={formData.ethnicity}
                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择民族</option>
                    {ethnicityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">政治面貌</label>
                  <select
                    value={formData.political_status}
                    onChange={(e) => setFormData({ ...formData, political_status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择政治面貌</option>
                    {politicalStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">电子免冠照</label>
                <div className="flex-1 border border-gray-300 rounded-lg p-4 flex items-center justify-center">
                  {previewPhoto || formData.photo_url ? (
                    <div className="relative w-full h-full max-w-28 max-h-40">
                      <img 
                        src={previewPhoto || formData.photo_url} 
                        alt="照片预览"
                        className="w-full h-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                      <Camera size={24} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">点击上传照片</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <MapPin className="mr-2 text-blue-600" size={20} />
              地址信息
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">籍贯</label>
                <input
                  type="text"
                  value={formData.native_place}
                  onChange={(e) => setFormData({ ...formData, native_place: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入籍贯"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">户口所在地</label>
                <input
                  type="text"
                  value={formData.hukou_location}
                  onChange={(e) => setFormData({ ...formData, hukou_location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入户口所在地"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">现居地址</label>
                <input
                  type="text"
                  value={formData.residence_address}
                  onChange={(e) => setFormData({ ...formData, residence_address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入现居地址"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Building2 className="mr-2 text-blue-600" size={20} />
              工作信息
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工作单位</label>
                <input
                  type="text"
                  value={formData.work_unit}
                  onChange={(e) => setFormData({ ...formData, work_unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入工作单位"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职务</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入职务"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">是否退休</label>
                <div className={`px-4 py-2 border border-gray-300 rounded-lg ${formData.is_retired ? 'bg-gray-100' : 'bg-white'}`}>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${formData.is_retired ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                    {formData.is_retired ? '是' : '否'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <FileText className="mr-2 text-blue-600" size={20} />
              个人工作简历
            </h3>
            
            <textarea
              value={formData.work_resume}
              onChange={(e) => setFormData({ ...formData, work_resume: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="请输入个人工作简历"
              rows={4}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <Users className="mr-2 text-blue-600" size={20} />
                家庭主要成员及联系方式
              </h3>
              <button
                type="button"
                onClick={addFamilyMember}
                className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} className="mr-1" />
                添加成员
              </button>
            </div>
            
            {errors.familyPhone && <p className="mb-3 text-sm text-red-500">{errors.familyPhone}</p>}
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">关系</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">姓名</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">联系电话</th>
                    <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 w-16">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {familyMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        暂无家庭成员，点击上方按钮添加
                      </td>
                    </tr>
                  ) : (
                    familyMembers.map((member, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2">
                          <select
                            value={member.relation}
                            onChange={(e) => updateFamilyMember(index, 'relation', e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">请选择关系</option>
                            {familyMemberRelationOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="请输入姓名"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="tel"
                            value={member.phone}
                            onChange={(e) => updateFamilyMember(index, 'phone', e.target.value)}
                            className={`w-full px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                              errors.familyPhone ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                            }`}
                            placeholder="请输入联系电话"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeFamilyMember(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Star className="mr-2 text-blue-600" size={20} />
              有何特长
            </h3>
            
            <input
              type="text"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入个人特长"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <RotateCcw size={16} className="mr-2" />
              重置
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              <Save size={16} className="mr-2" />
              {actionLoading ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'password' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">修改密码</h3>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前密码 *</label>
              <div className="relative">
                <Shield size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入当前密码"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密码 *</label>
              <div className="relative">
                <Shield size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入新密码（至少6位）"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码 *</label>
              <div className="relative">
                <Shield size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请再次输入新密码"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })
                  
                }}
                className="flex items-center px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <RotateCcw size={16} className="mr-2" />
                重置
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                <Save size={16} className="mr-2" />
                {actionLoading ? '修改中...' : '修改密码'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}