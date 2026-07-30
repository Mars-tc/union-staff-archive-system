import { useState, useEffect } from 'react'
import { UserPlus, CheckCircle, Eye, Clock, XCircle, RefreshCw } from 'lucide-react'
import { SignaturePad } from '../components/SignaturePad'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useToast } from '../context/ToastContext'

interface ExistingApplication {
  id: number
  status: string
  audit_step: string
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
  created_at: string
  grass_root_opinion: string
  grass_root_signature: string
  grass_root_date: string
  union_committee_opinion: string
  union_committee_signature: string
  union_committee_date: string
  remark: string
}

export const MembershipApply = () => {
  const { user } = useAuthStore()
  const { showError } = useToast()
  const [formData, setFormData] = useState({
    position: '',
    gender: '',
    native_place: '',
    education: '',
    id_card: '',
    hukou_location: '',
    ethnicity: '',
    residence_address: '',
    political_status: '',
    contact_phone: '',
    work_resume: '',
    family_members: [{ relation: '', name: '', phone: '' }],
    specialty: '',
  })
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [existingApplication, setExistingApplication] = useState<ExistingApplication | null>(null)
  const [isRejected, setIsRejected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)

  const addFamilyMember = () => {
    setFormData({
      ...formData,
      family_members: [...formData.family_members, { relation: '', name: '', phone: '' }],
    })
  }

  const removeFamilyMember = (index: number) => {
    if (formData.family_members.length === 1) return
    setFormData({
      ...formData,
      family_members: formData.family_members.filter((_, i) => i !== index),
    })
  }

  const updateFamilyMember = (index: number, field: 'relation' | 'name' | 'phone', value: string) => {
    const members = [...formData.family_members]
    members[index] = { ...members[index], [field]: value }
    setFormData({ ...formData, family_members: members })
  }

  const fetchProfileData = async () => {
    try {
      const response = await api.auth.getMe()
      if (response.success) {
        setProfileData(response.data)
      }
    } catch {
      showError('获取个人信息失败')
    }
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

        const positionValue = data.work_unit && data.position 
          ? `${data.work_unit}${data.position}`
          : data.work_unit || data.position || ''

        setFormData({
          position: positionValue,
          gender,
          native_place: data.native_place || '',
          education: data.education || '',
          id_card: data.id_card || '',
          hukou_location: data.hukou_location || '',
          ethnicity: data.ethnicity || '',
          residence_address: data.residence_address || '',
          political_status: politicalStatus,
          contact_phone: data.phone || '',
          work_resume: data.work_resume || '',
          family_members: familyMembers,
          specialty: data.specialty || '',
        })
      }
    } catch {
      showError('同步个人信息失败')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const checkExistingApplication = async () => {
      try {
        const response = await api.membership.getApplications(undefined, true)
        if (response.success && response.data.length > 0) {
          const app = response.data[0]
          if (app.status === 'rejected') {
            setIsRejected(true)
            setExistingApplication(app)
            const familyMembers = app.family_members
              ? app.family_members.split('\n').filter(Boolean).map(m => {
                  const [relation, name, phone] = m.split('-')
                  return { relation: relation || '', name: name || '', phone: phone || '' }
                })
              : [{ relation: '', name: '', phone: '' }]
            setFormData({
              position: app.position || '',
              gender: app.gender || '',
              native_place: app.native_place || '',
              education: app.education || '',
              id_card: app.id_card || '',
              hukou_location: app.hukou_location || '',
              ethnicity: app.ethnicity || '',
              residence_address: app.residence_address || '',
              political_status: app.political_status || '',
              contact_phone: app.contact_phone || '',
              work_resume: app.work_resume || '',
              family_members: familyMembers,
              specialty: app.specialty || '',
            })
          } else {
            setExistingApplication(app)
          }
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    checkExistingApplication()
  }, [])

  const getStatusInfo = () => {
    if (!existingApplication) return { text: '', color: '', icon: null }
    const { status, audit_step } = existingApplication
    if (status === 'approved') {
      return { text: '申请已通过', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle }
    }
    if (status === 'rejected') {
      return { text: '申请已拒绝', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle }
    }
    if (audit_step === 'grass_root') {
      return { text: '待基层审核', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock }
    }
    if (audit_step === 'union_committee') {
      return { text: '待委员会审核', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock }
    }
    return { text: '审核中', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock }
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

    try {
      const familyMembersStr = formData.family_members
        .filter((m) => m.relation || m.name || m.phone)
        .map((m) => `${m.relation}-${m.name}-${m.phone}`)
        .join('\n')

      const response = await api.membership.apply({
        ...formData,
        employee_id: '',
        department: '',
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  if (existingApplication && !isRejected) {
    const statusInfo = getStatusInfo()
    const StatusIcon = statusInfo.icon || Eye
    const familyMembers = existingApplication.family_members
      ? existingApplication.family_members.split('\n').filter(Boolean).map(m => m.split('-'))
      : []

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Eye size={28} className="text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-800">入会申请详情</h2>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
              <StatusIcon size={20} />
              <span className="font-medium">{statusInfo.text}</span>
            </div>
          </div>

          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">我自愿加入中华全国总工会，遵守工会章程，执行工会决议，积极参加工会活动，为全面建成小康社会、把我国建设成为富强民主文明和谐的社会主义现代化国家、实现中华民族伟大复兴的中国梦而奋斗。</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">姓名</p>
                <p className="font-medium text-gray-800">{user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">性别</p>
                <p className="font-medium text-gray-800">{existingApplication.gender || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">籍贯</p>
                <p className="font-medium text-gray-800">{existingApplication.native_place || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">学历</p>
                <p className="font-medium text-gray-800">{existingApplication.education || '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">身份证号码</p>
              <p className="font-medium text-gray-800">{existingApplication.id_card || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">户口所在地</p>
                <p className="font-medium text-gray-800">{existingApplication.hukou_location || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">民族</p>
                <p className="font-medium text-gray-800">{existingApplication.ethnicity || '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">现居地址</p>
              <p className="font-medium text-gray-800">{existingApplication.residence_address || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">政治面貌</p>
                <p className="font-medium text-gray-800">{existingApplication.political_status || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">联系电话</p>
                <p className="font-medium text-gray-800">{existingApplication.contact_phone || '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">工作单位及职务</p>
              <p className="font-medium text-gray-800">{existingApplication.position || '-'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">个人工作简历</p>
              <p className="font-medium text-gray-800 whitespace-pre-wrap">{existingApplication.work_resume || '-'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">家庭主要成员以及联系方式</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">关系</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">姓名</th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">联系电话</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyMembers.length > 0 ? (
                      familyMembers.map((member, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-4 py-2">{member[0] || '-'}</td>
                          <td className="border border-gray-300 px-4 py-2">{member[1] || '-'}</td>
                          <td className="border border-gray-300 px-4 py-2">{member[2] || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="border border-gray-300 px-4 py-2 text-center text-gray-500">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">有何特长</p>
              <p className="font-medium text-gray-800">{existingApplication.specialty || '-'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">申请时间</p>
              <p className="font-medium text-gray-800">{new Date(existingApplication.created_at).toLocaleString('zh-CN')}</p>
            </div>

            {(existingApplication.grass_root_opinion || existingApplication.union_committee_opinion) && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">审核意见</h3>
                
                {existingApplication.grass_root_opinion && (
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-800">基层委员会审核意见</span>
                      {existingApplication.grass_root_date && (
                        <span className="text-xs text-yellow-600">{new Date(existingApplication.grass_root_date).toLocaleDateString('zh-CN')}</span>
                      )}
                    </div>
                    <p className="text-gray-700">{existingApplication.grass_root_opinion}</p>
                    {existingApplication.grass_root_signature && (
                      <p className="text-sm text-gray-500 mt-2">签字：{existingApplication.grass_root_signature}</p>
                    )}
                  </div>
                )}

                {existingApplication.union_committee_opinion && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">工会委员会审核意见</span>
                      {existingApplication.union_committee_date && (
                        <span className="text-xs text-blue-600">{new Date(existingApplication.union_committee_date).toLocaleDateString('zh-CN')}</span>
                      )}
                    </div>
                    <p className="text-gray-700">{existingApplication.union_committee_opinion}</p>
                    {existingApplication.union_committee_signature && (
                      <p className="text-sm text-gray-500 mt-2">签字：{existingApplication.union_committee_signature}</p>
                    )}
                  </div>
                )}

                {existingApplication.remark && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">备注</p>
                    <p className="text-gray-700">{existingApplication.remark}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">申请提交成功</h2>
          <p className="text-gray-500">您的入会申请已提交，请等待管理员审核</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {isRejected && existingApplication && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <XCircle size={20} className="text-red-600" />
              <span className="font-medium text-red-800">您的入会申请已被拒绝</span>
            </div>
            {(existingApplication.remark || existingApplication.grass_root_opinion || existingApplication.union_committee_opinion) && (
              <div className="space-y-2 text-sm">
                {existingApplication.remark && (
                  <div>
                    <span className="text-gray-600 font-medium">拒绝原因：</span>
                    <span className="text-gray-700">{existingApplication.remark}</span>
                  </div>
                )}
                {existingApplication.grass_root_opinion && (
                  <div>
                    <span className="text-gray-600 font-medium">基层委员会意见：</span>
                    <span className="text-gray-700">{existingApplication.grass_root_opinion}</span>
                  </div>
                )}
                {existingApplication.union_committee_opinion && (
                  <div>
                    <span className="text-gray-600 font-medium">工会委员会意见：</span>
                    <span className="text-gray-700">{existingApplication.union_committee_opinion}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-red-600 text-sm mt-3">您可以修改信息后重新提交申请</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <UserPlus size={28} className="text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">工会会员登记表和入会申请书</h2>
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

        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-sm">我自愿加入中华全国总工会，遵守工会章程，执行工会决议，积极参加工会活动，为全面建成小康社会、把我国建设成为富强民主文明和谐的社会主义现代化国家、实现中华民族伟大复兴的中国梦而奋斗。</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择性别</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">学历</label>
              <select
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择学历</option>
                <option value="小学">小学</option>
                <option value="初中">初中</option>
                <option value="高中/中专">高中/中专</option>
                <option value="大专">大专</option>
                <option value="本科">本科</option>
                <option value="硕士">硕士</option>
                <option value="博士">博士</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">身份证号码</label>
            <input
              type="text"
              value={formData.id_card}
              onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入身份证号码"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">民族</label>
              <input
                type="text"
                value={formData.ethnicity}
                onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入民族"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">现居地址</label>
            <input
              type="text"
              value={formData.residence_address}
              onChange={(e) => setFormData({ ...formData, residence_address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入现居地址"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">政治面貌</label>
              <select
                value={formData.political_status}
                onChange={(e) => setFormData({ ...formData, political_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择政治面貌</option>
                <option value="中共党员">中共党员</option>
                <option value="中共预备党员">中共预备党员</option>
                <option value="共青团员">共青团员</option>
                <option value="群众">群众</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入联系电话"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工作单位及职务 *</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入工作单位及职务（如：XX公司 经理）"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">个人工作简历</label>
            <textarea
              value={formData.work_resume}
              onChange={(e) => setFormData({ ...formData, work_resume: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入个人工作简历"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">家庭主要成员以及联系方式</label>
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
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="如：配偶"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="请输入姓名"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={member.phone}
                          onChange={(e) => updateFamilyMember(index, 'phone', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
            <button
              type="button"
              onClick={addFamilyMember}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + 添加家庭成员
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">有何特长</label>
            <input
              type="text"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入特长"
            />
          </div>

          <SignaturePad onSignature={setSignature} />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {submitting ? '提交中...' : '提交申请'}
          </button>
        </form>
      </div>
    </div>
  )
}