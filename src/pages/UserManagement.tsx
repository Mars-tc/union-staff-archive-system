import { useEffect, useState, useRef } from 'react'
import { Users, Plus, Edit, Trash2, Upload, Download, X, CheckCircle, AlertCircle, FileSpreadsheet, ChevronRight, Settings, Search, RotateCcw } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import * as XLSX from 'xlsx'

interface User {
  id: number
  email: string
  name: string
  phone: string
  role: 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor'
  union_member: boolean
  mutual_aid_member: boolean
  is_retired: boolean
  created_at: string
}

interface Module {
  id: number
  name: string
  code: string
  description: string
}

const roleOptions = [
  { value: 'employee', label: '普通职工' },
  { value: 'admin', label: '管理员' },
  { value: 'grass_root_auditor', label: '基层审核人' },
  { value: 'union_committee_auditor', label: '委员会审核人' },
]

const getRoleLabel = (role: string) => {
  const option = roleOptions.find(o => o.value === role)
  return option ? option.label : role
}

const getMembershipLabels = (user: User) => {
  const labels: string[] = []
  if (user.union_member) labels.push('工会会员')
  if (user.mutual_aid_member) labels.push('爱心互助会会员')
  return labels.length > 0 ? labels.join('、') : '无'
}

const getMembershipColor = (user: User) => {
  if (user.union_member && user.mutual_aid_member) return 'bg-purple-100 text-purple-700'
  if (user.union_member) return 'bg-blue-100 text-blue-700'
  if (user.mutual_aid_member) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-500'
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-blue-100 text-blue-700'
    case 'grass_root_auditor': return 'bg-green-100 text-green-700'
    case 'union_committee_auditor': return 'bg-purple-100 text-purple-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export const UserManagement = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<{
    email: string
    password: string
    name: string
    phone: string
    role: 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor'
    is_retired: boolean
  }>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'employee',
    is_retired: false,
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showBatchSettingsModal, setShowBatchSettingsModal] = useState(false)
  const [batchSettings, setBatchSettings] = useState<{
    role: 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor' | ''
    union_member: boolean | null
    mutual_aid_member: boolean | null
    is_retired: boolean | null
    modules: string[]
  }>({
    role: '',
    union_member: null,
    mutual_aid_member: null,
    is_retired: null,
    modules: [],
  })
  const [batchStep, setBatchStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [batchUsers, setBatchUsers] = useState<Array<{ email: string; name: string; phone: string; role: 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor'; rowIndex: number; errors: string[] }>>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [importResults, setImportResults] = useState<Array<{
    email: string
    name: string
    password: string
    success: boolean
    error?: string
  }> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [modules, setModules] = useState<Module[]>([])
  const [userModules, setUserModules] = useState<string[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)

  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchRole, setSearchRole] = useState<string>('')
  const [searchUnionMember, setSearchUnionMember] = useState<string>('')
  const [searchMutualAidMember, setSearchMutualAidMember] = useState<string>('')
  const [searchIsRetired, setSearchIsRetired] = useState<string>('')

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'warning' | 'success' | 'error' | 'info'
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params: { search?: string; role?: string; union_member?: boolean; mutual_aid_member?: boolean; is_retired?: boolean } = {}
      if (searchKeyword.trim()) params.search = searchKeyword.trim()
      if (searchRole) params.role = searchRole
      if (searchUnionMember !== '') params.union_member = searchUnionMember === 'true'
      if (searchMutualAidMember !== '') params.mutual_aid_member = searchMutualAidMember === 'true'
      if (searchIsRetired !== '') params.is_retired = searchIsRetired === 'true'

      const response = await api.users.getUsers(Object.keys(params).length > 0 ? params : undefined)
      if (response.success) {
        setUsers(response.data)
      }
    } catch {
      showError('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()

    const fetchModules = async () => {
      try {
        const response = await api.modules.getModules()
        if (response.success) {
          setModules(response.data)
        }
      } catch {
        showError('获取模块列表失败')
      }
    }
    fetchModules()
  }, [showError])

  const handleOpenModal = async (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        email: user.email,
        password: '',
        name: user.name,
        phone: user.phone,
        role: user.role,
        is_retired: user.is_retired,
      })

      setModulesLoading(true)
      try {
        const response = await api.modules.getUserModules(user.id)
        if (response.success) {
          setUserModules(response.data)
        }
      } catch {
        showError('获取用户模块权限失败')
      } finally {
        setModulesLoading(false)
      }
    } else {
      setEditingUser(null)
      setFormData({
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'employee',
        is_retired: false,
      })
      setUserModules([])
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    try {
      if (editingUser) {
        const response = await api.users.updateUser(editingUser.id, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          is_retired: formData.is_retired,
        })
        if (response.success) {
          setUsers(users.map((u) => u.id === editingUser.id ? response.data : u))
          showSuccess('用户更新成功')
        } else {
          showError(response.error || '更新用户失败')
        }

        await api.modules.updateUserModules(editingUser.id, userModules)
      } else {
        const response = await api.users.createUser(formData)
        if (response.success) {
          setUsers([response.data, ...users])
          showSuccess('用户创建成功')
        } else {
          showError(response.error || '创建用户失败')
        }
      }
      setShowModal(false)
      setEditingUser(null)
    } catch {
      showError('操作失败，请稍后重试')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (userId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: '确认删除',
      message: '确定要删除该用户吗？',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await api.users.deleteUser(userId)
          if (response.success) {
            setUsers(users.filter((u) => u.id !== userId))
            showSuccess('用户删除成功')
          } else {
            showError(response.error || '删除用户失败')
          }
        } catch {
          showError('删除用户失败')
        }
      },
    })
  }

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true
    const regex = /^1[3-9]\d{9}$/
    return regex.test(phone)
  }

  const validateUserRow = (row: { email: string; name: string; phone: string }): string[] => {
    const errors: string[] = []
    if (!row.email.trim()) {
      errors.push('邮箱不能为空')
    } else if (!validateEmail(row.email.trim())) {
      errors.push('邮箱格式不正确')
    }
    if (!row.name.trim()) {
      errors.push('姓名不能为空')
    }
    if (row.phone && !validatePhone(row.phone.trim())) {
      errors.push('手机号格式不正确')
    }
    return errors
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      showWarning('请上传Excel文件（.xlsx、.xls）或CSV文件（.csv）')
      return
    }

    setUploadedFile(file)
    parseExcelFile(file)
  }

  const parseExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) {
          showWarning('Excel文件中没有数据')
          return
        }

        const headers = jsonData[0] as string[]
        let emailIndex = -1
        let nameIndex = -1
        let phoneIndex = -1

        for (let i = 0; i < headers.length; i++) {
          const header = (headers[i] || '').toString().trim().toLowerCase()
          if (header.includes('邮箱') || header.includes('email')) {
            emailIndex = i
          } else if (header.includes('姓名') || header.includes('name') || header.includes('用户名')) {
            nameIndex = i
          } else if (header.includes('手机') || header.includes('phone') || header.includes('电话') || header.includes('手机号')) {
            phoneIndex = i
          }
        }

        if (emailIndex === -1 || nameIndex === -1) {
          showWarning('请确保Excel文件包含"邮箱"和"姓名"列')
          return
        }

        const users: Array<{ email: string; name: string; phone: string; role: 'employee' | 'admin'; rowIndex: number; errors: string[] }> = []
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as string[]
          if (!row || row.length === 0 || (!row[emailIndex] && !row[nameIndex])) {
            continue
          }

          const email = (row[emailIndex] || '').toString().trim()
          const name = (row[nameIndex] || '').toString().trim()
          const phone = phoneIndex >= 0 ? (row[phoneIndex] || '').toString().trim() : ''

          const errors = validateUserRow({ email, name, phone })

          users.push({
            email,
            name,
            phone,
            role: 'employee',
            rowIndex: i + 1,
            errors
          })
        }

        if (users.length === 0) {
          showWarning('Excel文件中没有有效数据')
          return
        }

        setBatchUsers(users)
        setBatchStep('preview')
      } catch (error) {
        showError('解析Excel文件失败，请确保文件格式正确')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleBatchUserChange = (index: number, field: 'email' | 'name' | 'phone' | 'role', value: string) => {
    const newUsers = [...batchUsers]
    newUsers[index] = { ...newUsers[index], [field]: value }
    if (field === 'email' || field === 'name' || field === 'phone') {
      newUsers[index].errors = validateUserRow({
        email: field === 'email' ? value : newUsers[index].email,
        name: field === 'name' ? value : newUsers[index].name,
        phone: field === 'phone' ? value : newUsers[index].phone
      })
    }
    setBatchUsers(newUsers)
  }

  const handleRemoveBatchRow = (index: number) => {
    setBatchUsers(batchUsers.filter((_, i) => i !== index))
  }

  const handleBatchSubmit = async () => {
    const validUsers = batchUsers.filter((u) => u.errors.length === 0 && u.email.trim() && u.name.trim())
    const invalidCount = batchUsers.length - validUsers.length
    
    if (validUsers.length === 0) {
      showWarning('没有有效用户可导入，请检查数据')
      return
    }

    if (invalidCount > 0) {
      setConfirmDialog({
        isOpen: true,
        title: '确认导入',
        message: `${invalidCount}条数据存在错误，将跳过这些数据继续导入${validUsers.length}条有效数据？`,
        type: 'warning',
        onConfirm: () => doBatchSubmit(validUsers),
      })
      return
    }

    doBatchSubmit(validUsers)
  }

  const doBatchSubmit = async (validUsers: Array<{ email: string; name: string; phone: string; role: 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor' }>) => {
    setBatchLoading(true)

    try {
      const response = await api.users.batchCreateUsers(validUsers.map(u => ({
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role
      })))
      if (response.success) {
        const results = batchUsers.map((user) => {
          if (user.errors.length > 0 || !user.email.trim() || !user.name.trim()) {
            return { email: user.email, name: user.name, password: '', success: false, error: '数据验证失败' }
          }
          const created = response.data.find((u: { email: string; password: string }) => u.email === user.email)
          return created
            ? { email: user.email, name: user.name, password: created.password, success: true }
            : { email: user.email, name: user.name, password: '', success: false, error: '创建失败' }
        })
        setImportResults(results)
        const fetchUsers = async () => {
          const res = await api.users.getUsers()
          if (res.success) {
            setUsers(res.data)
          }
        }
        fetchUsers()
        setBatchStep('result')
        showSuccess(`成功导入${validUsers.length}个用户`)
      } else {
        const results = batchUsers.map((user) => ({
          email: user.email,
          name: user.name,
          password: '',
          success: false,
          error: response.error || '未知错误'
        }))
        setImportResults(results)
        setBatchStep('result')
        showError(response.error || '批量导入失败')
      }
    } catch {
      const results = batchUsers.map((user) => ({
        email: user.email,
        name: user.name,
        password: '',
        success: false,
        error: '请求失败'
      }))
      setImportResults(results)
      setBatchStep('result')
      showError('批量导入失败')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleResetBatch = () => {
    setBatchStep('upload')
    setUploadedFile(null)
    setBatchUsers([])
    setImportResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownloadResults = () => {
    if (!importResults) return
    const headers = ['姓名', '邮箱', '密码']
    const rows = importResults
      .filter((r) => r.success)
      .map((r) => [r.name, r.email, r.password])
    
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `批量导入用户密码_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleDownloadTemplate = () => {
    const headers = ['邮箱', '姓名', '手机号']
    const sampleData = [
      ['zhangsan@example.com', '张三', '13800138001'],
      ['lisi@example.com', '李四', '13900139002'],
      ['wangwu@example.com', '王五', '13700137003'],
    ]
    
    const worksheetData = [headers, ...sampleData]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户数据')
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `批量导入用户模板.xlsx`
    link.click()
  }

  const handleOpenBatchSettings = () => {
    setBatchSettings({
      role: '',
      union_member: null,
      mutual_aid_member: null,
      is_retired: null,
      modules: [],
    })
    setShowBatchSettingsModal(true)
  }

  const handleBatchSettingsSubmit = async () => {
    const updateData: { role?: string; union_member?: boolean; mutual_aid_member?: boolean; is_retired?: boolean } = {}
    
    if (batchSettings.role) {
      updateData.role = batchSettings.role
    }
    if (batchSettings.union_member !== null) {
      updateData.union_member = batchSettings.union_member
    }
    if (batchSettings.mutual_aid_member !== null) {
      updateData.mutual_aid_member = batchSettings.mutual_aid_member
    }
    if (batchSettings.is_retired !== null) {
      updateData.is_retired = batchSettings.is_retired
    }

    const hasUserUpdate = Object.keys(updateData).length > 0
    const hasModuleUpdate = batchSettings.modules.length > 0

    if (!hasUserUpdate && !hasModuleUpdate) {
      showWarning('请至少选择一个要设置的选项')
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: '批量设置确认',
      message: `确定要批量设置 ${selectedUserIds.length} 个用户吗？`,
      type: 'info',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          if (hasUserUpdate) {
            await api.users.batchUpdateUsers(selectedUserIds, updateData)
          }

          if (hasModuleUpdate) {
            await api.modules.batchUpdateUserModules(selectedUserIds, batchSettings.modules)
          }

          const fetchUsers = async () => {
            const res = await api.users.getUsers()
            if (res.success) {
              setUsers(res.data)
            }
          }
          fetchUsers()
          setShowBatchSettingsModal(false)
          setSelectedUserIds([])
          showSuccess('批量设置成功')
        } catch {
          showError('批量设置失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleBatchDelete = async () => {
    setConfirmDialog({
      isOpen: true,
      title: '批量删除确认',
      message: `确定要删除选中的 ${selectedUserIds.length} 个用户吗？`,
      type: 'error',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          const response = await api.users.batchDeleteUsers(selectedUserIds)
          if (response.success) {
            setUsers(users.filter((u) => !selectedUserIds.includes(u.id)))
            setSelectedUserIds([])
            showSuccess('批量删除成功')
          } else {
            showError(response.error || '批量删除失败')
          }
        } catch {
          showError('批量删除失败')
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const columns = [
    { key: 'name', label: '姓名' },
    { key: 'email', label: '邮箱' },
    { key: 'phone', label: '手机号' },
    {
      key: 'role',
      label: '角色',
      render: (role: string) => (
        <span className={`px-2 py-0.5 text-xs rounded-full ${getRoleColor(role)}`}>
          {getRoleLabel(role)}
        </span>
      ),
    },
    {
      key: 'membership',
      label: '会员类型',
      render: (_: string, row: User) => (
        <span className={`px-2 py-0.5 text-xs rounded-full ${getMembershipColor(row)}`}>
          {getMembershipLabels(row)}
        </span>
      ),
    },
    {
      key: 'is_retired',
      label: '是否退休',
      render: (is_retired: boolean) => (
        <span className={`px-2 py-0.5 text-xs rounded-full ${is_retired ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
          {is_retired ? '是' : '否'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: '创建时间',
      render: (date: string) => {
        const d = new Date(date)
        return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN')
      },
    },
  ]

  const handleModuleToggle = (moduleCode: string) => {
    setUserModules(prev => {
      if (prev.includes(moduleCode)) {
        return prev.filter(m => m !== moduleCode)
      }
      return [...prev, moduleCode]
    })
  }

  const handleBatchModuleToggle = (moduleCode: string) => {
    setBatchSettings(prev => {
      const currentModules = prev.modules || []
      if (currentModules.includes(moduleCode)) {
        return { ...prev, modules: currentModules.filter(m => m !== moduleCode) }
      }
      return { ...prev, modules: [...currentModules, moduleCode] }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users size={28} className="text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">用户管理</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Upload size={18} className="mr-2" />
            批量导入
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} className="mr-2" />
            添加用户
          </button>
          <div className="w-px h-6 bg-gray-300" />
          <span className="text-sm text-gray-600">
            已选择 <strong>{selectedUserIds.length}</strong> 个用户
          </span>
          {selectedUserIds.length > 0 && (
            <button
              onClick={() => setSelectedUserIds([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              取消选择
            </button>
          )}
          <button
            onClick={handleOpenBatchSettings}
            disabled={selectedUserIds.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Settings size={18} className="mr-2" />
            批量设置
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={selectedUserIds.length === 0}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} className="mr-2" />
            批量删除
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              placeholder="搜索姓名、邮箱或手机号"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部角色</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={searchUnionMember}
            onChange={(e) => setSearchUnionMember(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部会员</option>
            <option value="true">工会会员</option>
            <option value="false">非工会会员</option>
          </select>
          <select
            value={searchMutualAidMember}
            onChange={(e) => setSearchMutualAidMember(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部互助会会员</option>
            <option value="true">爱心互助会会员</option>
            <option value="false">非互助会会员</option>
          </select>
          <select
            value={searchIsRetired}
            onChange={(e) => setSearchIsRetired(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部状态</option>
            <option value="true">已退休</option>
            <option value="false">在职</option>
          </select>
          <button
            onClick={fetchUsers}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Search size={18} className="mr-2" />
            搜索
          </button>
          <button
            onClick={() => {
              setSearchKeyword('')
              setSearchRole('')
              setSearchUnionMember('')
              setSearchMutualAidMember('')
              setSearchIsRetired('')
              fetchUsers()
            }}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <RotateCcw size={18} className="mr-2" />
            重置
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={users}
            actions={(row) => (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenModal(row)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="编辑"
                >
                  <Edit size={18} />
                </button>
                {row.role !== 'admin' && (
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            )}
            selectable
            selectedIds={selectedUserIds}
            onSelectChange={setSelectedUserIds}
          />
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingUser(null)
        }}
        title={editingUser ? '编辑用户' : '添加用户'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingUser}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="请输入邮箱"
              required
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入密码"
                required
              />
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入手机号"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色 *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">是否退休</label>
            <select
              value={formData.is_retired ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_retired: e.target.value === 'true' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="false">否</option>
              <option value="true">是</option>
            </select>
          </div>

          {editingUser && formData.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模块权限</label>
              {modulesLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {modules.map((module) => (
                    <label
                      key={module.id}
                      className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                        userModules.includes(module.code)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={userModules.includes(module.code)}
                        onChange={() => handleModuleToggle(module.code)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{module.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {actionLoading ? '处理中...' : (editingUser ? '保存修改' : '创建用户')}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false)
          handleResetBatch()
        }}
        title="批量导入用户"
        size="lg"
      >
        <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
          <div className={`flex items-center space-x-2 ${batchStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${batchStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</span>
            <span className="text-sm font-medium">上传文件</span>
          </div>
          {batchStep !== 'upload' && <ChevronRight size={16} className="text-gray-400" />}
          <div className={`flex items-center space-x-2 ${batchStep === 'preview' ? 'text-blue-600' : batchStep === 'upload' ? 'text-gray-400' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${batchStep === 'preview' ? 'bg-blue-600 text-white' : batchStep === 'upload' ? 'bg-gray-200' : 'bg-gray-200'}`}>2</span>
            <span className="text-sm font-medium">预览数据</span>
          </div>
          {batchStep === 'result' && <ChevronRight size={16} className="text-gray-400" />}
          <div className={`flex items-center space-x-2 ${batchStep === 'result' ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${batchStep === 'result' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</span>
            <span className="text-sm font-medium">导入结果</span>
          </div>
        </div>

        {batchStep === 'upload' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              请上传Excel文件（.xlsx、.xls）或CSV文件（.csv），文件需包含以下列：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>邮箱</strong> - 必填，用户登录账号</li>
                <li><strong>姓名</strong> - 必填，用户姓名</li>
                <li><strong>手机号</strong> - 选填，用户联系电话</li>
              </ul>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 cursor-pointer transition-colors" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-1">点击或拖拽上传文件</p>
              <p className="text-sm text-gray-400">支持 .xlsx、.xls、.csv 格式</p>
            </div>
            <div className="text-center">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Download size={16} className="mr-2" />
                下载模板
              </button>
            </div>
          </div>
        )}

        {batchStep === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                已解析 <span className="font-medium text-gray-700">{batchUsers.length}</span> 条数据
                {batchUsers.some(u => u.errors.length > 0) && (
                  <span className="ml-2 text-red-500">
                    （{batchUsers.filter(u => u.errors.length > 0).length} 条有错误）
                  </span>
                )}
              </div>
              <button
                onClick={() => setBatchStep('upload')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                重新上传
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {batchUsers.map((user, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${
                    user.errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-600 w-8">#{index + 1}</span>
                  <input
                    type="email"
                    value={user.email}
                    onChange={(e) => handleBatchUserChange(index, 'email', e.target.value)}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      user.errors.some(e => e.includes('邮箱')) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="邮箱 *"
                  />
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) => handleBatchUserChange(index, 'name', e.target.value)}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      user.errors.some(e => e.includes('姓名')) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="姓名 *"
                  />
                  <input
                    type="tel"
                    value={user.phone}
                    onChange={(e) => handleBatchUserChange(index, 'phone', e.target.value)}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      user.errors.some(e => e.includes('手机')) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="手机号"
                  />
                  <select
                    value={user.role}
                    onChange={(e) => handleBatchUserChange(index, 'role', e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveBatchRow(index)}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                    title="删除"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
            {batchUsers.some(u => u.errors.length > 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                <AlertCircle size={16} className="inline mr-1" />
                红色标记的字段存在错误，请修正后再导入
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setBatchStep('upload')}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                返回
              </button>
              <button
                onClick={handleBatchSubmit}
                disabled={batchLoading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
              >
                <Upload size={16} className="mr-2" />
                {batchLoading ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        )}

        {batchStep === 'result' && importResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">导入结果</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  成功: {importResults.filter((r) => r.success).length} / {importResults.length}
                </span>
                {importResults.some((r) => r.success) && (
                  <button
                    onClick={handleDownloadResults}
                    className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download size={16} className="mr-1" />
                    下载密码
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {importResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle size={18} className="text-green-600" />
                    ) : (
                      <AlertCircle size={18} className="text-red-600" />
                    )}
                    <span className="text-sm">
                      {result.name} ({result.email})
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {result.success && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">密码:</span>
                        <span className="text-sm font-mono px-2 py-0.5 bg-white rounded text-green-700">
                          {result.password}
                        </span>
                      </div>
                    )}
                    {!result.success && result.error && (
                      <span className="text-sm text-red-600">{result.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={handleResetBatch}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                继续导入
              </button>
              <button
                onClick={() => {
                  setShowBatchModal(false)
                  handleResetBatch()
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showBatchSettingsModal}
        onClose={() => {
          setShowBatchSettingsModal(false)
        }}
        title="批量设置"
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleBatchSettingsSubmit(); }} className="space-y-4">
          <div className="text-sm text-gray-500 mb-4">
            将对选中的 <strong>{selectedUserIds.length}</strong> 个用户进行批量设置
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <select
              value={batchSettings.role}
              onChange={(e) => setBatchSettings({ ...batchSettings, role: e.target.value as 'employee' | 'admin' | 'grass_root_auditor' | 'union_committee_auditor' | '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">不修改角色</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工会会员</label>
            <select
              value={batchSettings.union_member === null ? '' : batchSettings.union_member ? 'true' : 'false'}
              onChange={(e) => {
                const value = e.target.value
                setBatchSettings({ ...batchSettings, union_member: value === '' ? null : value === 'true' })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">不修改</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">爱心互助会会员</label>
            <select
              value={batchSettings.mutual_aid_member === null ? '' : batchSettings.mutual_aid_member ? 'true' : 'false'}
              onChange={(e) => {
                const value = e.target.value
                setBatchSettings({ ...batchSettings, mutual_aid_member: value === '' ? null : value === 'true' })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">不修改</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">是否退休</label>
            <select
              value={batchSettings.is_retired === null ? '' : batchSettings.is_retired ? 'true' : 'false'}
              onChange={(e) => {
                const value = e.target.value
                setBatchSettings({ ...batchSettings, is_retired: value === '' ? null : value === 'true' })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">不修改</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模块权限</label>
            <div className="grid grid-cols-2 gap-2">
              {modules.map((module) => (
                <label
                  key={module.id}
                  className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                    (batchSettings.modules || []).includes(module.code)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(batchSettings.modules || []).includes(module.code)}
                    onChange={() => handleBatchModuleToggle(module.code)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{module.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowBatchSettingsModal(false)}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {actionLoading ? '处理中...' : '确认设置'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  )
}