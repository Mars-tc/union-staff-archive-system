import { useEffect, useState } from 'react'
import { BarChart3, Search, Download, PieChart, BarChart2, Heart, Gift } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { useToast } from '../context/ToastContext'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

interface Application {
  id: number
  name: string
  disease_name: string
  category: string
  difficulty_category: string
  amount: number
  actual_amount: number | null
  status: string
  audit_step: string
  created_at: string
}

const difficultyCategoryLabels: Record<string, string> = {
  disability: '伤残致困',
  accident: '意外致困',
  disease: '因病致困',
  education: '子女助学',
  special: '特殊困难',
}

const difficultyCategoryColors: Record<string, string> = {
  disability: '#EF4444',
  accident: '#F97316',
  disease: '#8B5CF6',
  education: '#3B82F6',
  special: '#10B981',
}

type TabType = 'difficulty' | 'mutual_aid_difficulty'

export const Statistics = () => {
  const { showError } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('difficulty')
  
  const [applications, setApplications] = useState<Application[]>([])
  const [mutualAidApplications, setMutualAidApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchName, setSearchName] = useState('')
  const [diseaseFilter, setDiseaseFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true)
      try {
        const [difficultyResponse, mutualAidResponse] = await Promise.all([
          api.difficulty.getApplications(),
          api.mutualAidDifficulty.getApplications(),
        ])
        if (difficultyResponse.success) {
          setApplications(difficultyResponse.data)
        }
        if (mutualAidResponse.success) {
          setMutualAidApplications(mutualAidResponse.data)
        }
      } catch {
        showError('获取数据失败')
      } finally {
        setLoading(false)
      }
    }
    fetchApplications()
  }, [])

  const currentApplications = activeTab === 'difficulty' ? applications : mutualAidApplications

  const filteredApplications = currentApplications.filter((app) => {
    const matchesName = searchName ? app.name.toLowerCase().includes(searchName.toLowerCase()) : true
    const matchesDisease = diseaseFilter ? app.disease_name === diseaseFilter : true
    const matchesDate = dateFilter ? app.created_at.startsWith(dateFilter) : true
    const matchesCategory = categoryFilter ? app.difficulty_category === categoryFilter : true
    return matchesName && matchesDisease && matchesDate && matchesCategory
  })

  const categoryStats = filteredApplications.reduce((acc, app) => {
    const categoryLabel = difficultyCategoryLabels[app.difficulty_category] || '其他'
    acc[categoryLabel] = (acc[categoryLabel] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const monthlyStats = filteredApplications.reduce((acc, app) => {
    const month = app.created_at.substring(0, 7)
    acc[month] = (acc[month] || 0) + Number(app.actual_amount || app.amount || 0)
    return acc
  }, {} as Record<string, number>)

  const approvedTotal = filteredApplications
    .filter((app) => app.status === 'approved')
    .reduce((sum, app) => sum + Number(app.actual_amount || app.amount || 0), 0)

  const pendingTotal = filteredApplications
    .filter((app) => app.status === 'pending')
    .length

  const rejectedTotal = filteredApplications
    .filter((app) => app.status === 'rejected')
    .length

  const pieChartData = {
    labels: Object.keys(categoryStats),
    datasets: [{
      data: Object.values(categoryStats),
      backgroundColor: Object.keys(categoryStats).map(key => {
        const categoryKey = Object.keys(difficultyCategoryLabels).find(k => difficultyCategoryLabels[k] === key)
        return categoryKey ? difficultyCategoryColors[categoryKey] : '#6B7280'
      }),
      borderWidth: 0,
    }],
  }

  const barChartData = {
    labels: Object.keys(monthlyStats).sort(),
    datasets: [{
      label: '帮扶金额',
      data: Object.values(monthlyStats),
      backgroundColor: activeTab === 'difficulty' ? '#3B82F6' : '#EF4444',
      borderRadius: 6,
    }],
  }

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const },
    },
  }

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => `¥${value}` },
      },
    },
  }

  const uniqueDiseases = [...new Set(currentApplications.map((app) => app.disease_name).filter(Boolean))]

  const getStatusText = (status: string, auditStep: string) => {
    if (status === 'approved') return { text: '已审批', className: 'bg-green-100 text-green-700' }
    if (status === 'rejected') return { text: '已拒绝', className: 'bg-red-100 text-red-700' }
    if (auditStep === 'union_committee') return { text: '待委员会审核', className: 'bg-blue-100 text-blue-700' }
    return { text: '待审批', className: 'bg-yellow-100 text-yellow-700' }
  }

  const columns = [
    { key: 'name', label: '申请人' },
    { key: 'disease_name', label: '病种' },
    {
      key: 'difficulty_category',
      label: '类别',
      render: (category: string) => {
        const label = difficultyCategoryLabels[category] || '其他'
        const color = difficultyCategoryColors[category] || '#6B7280'
        return (
          <span
            className="px-2 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {label}
          </span>
        )
      },
    },
    {
      key: 'amount',
      label: '金额',
      render: (amount: number, row: Application) => {
        const displayAmount = row.status === 'approved' && row.actual_amount !== null ? row.actual_amount : amount
        return `¥${Number(displayAmount || 0).toFixed(2)}`
      },
    },
    {
      key: 'status',
      label: '状态',
      render: (_: string, row: Application) => {
        const config = getStatusText(row.status, row.audit_step)
        return (
          <span className={`px-2 py-0.5 text-xs rounded-full ${config.className}`}>
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

  const handleExport = () => {
    const headers = ['申请人', '病种', '类别', '金额', '状态', '申请时间']
    const rows = filteredApplications.map((app) => {
      const displayAmount = app.status === 'approved' && app.actual_amount !== null ? app.actual_amount : app.amount
      const statusText = app.status === 'approved' ? '已审批' : app.status === 'rejected' ? '已拒绝' : app.audit_step === 'union_committee' ? '待委员会审核' : '待审批'
      return [
        app.name,
        app.disease_name || '',
        difficultyCategoryLabels[app.difficulty_category] || '',
        `¥${Number(displayAmount || 0).toFixed(2)}`,
        statusText,
        new Date(app.created_at).toLocaleString('zh-CN'),
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const prefix = activeTab === 'difficulty' ? '困难帮扶统计' : '爱心帮扶统计'
    link.download = `${prefix}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`
    link.click()
  }

  const title = activeTab === 'difficulty' ? '困难帮扶统计' : '爱心帮扶统计'
  const bgColor = activeTab === 'difficulty' ? 'bg-blue-100' : 'bg-red-100'
  const textColor = activeTab === 'difficulty' ? 'text-blue-600' : 'text-red-600'
  const accentColor = activeTab === 'difficulty' ? 'text-blue-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <BarChart3 size={28} className={`${accentColor} mr-3`} />
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download size={18} className="mr-2" />
          导出报表
        </button>
      </div>

      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('difficulty')
            setSearchName('')
            setDiseaseFilter('')
            setDateFilter('')
            setCategoryFilter('')
          }}
          className={`flex items-center px-4 py-2 -mb-px border-b-2 font-medium transition-colors ${
            activeTab === 'difficulty'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Heart size={16} className="mr-2" />
          困难帮扶
        </button>
        <button
          onClick={() => {
            setActiveTab('mutual_aid_difficulty')
            setSearchName('')
            setDiseaseFilter('')
            setDateFilter('')
            setCategoryFilter('')
          }}
          className={`flex items-center px-4 py-2 -mb-px border-b-2 font-medium transition-colors ${
            activeTab === 'mutual_aid_difficulty'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Gift size={16} className="mr-2" />
          爱心帮扶
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mr-3`}>
              {activeTab === 'difficulty' ? (
                <Heart size={20} className="text-blue-600" />
              ) : (
                <Gift size={20} className="text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">申请总数</p>
              <p className="text-xl font-semibold text-gray-800">{filteredApplications.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              {activeTab === 'difficulty' ? (
                <Heart size={20} className="text-green-600" />
              ) : (
                <Gift size={20} className="text-green-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">已审批数</p>
              <p className="text-xl font-semibold text-green-600">
                {filteredApplications.filter((a) => a.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              {activeTab === 'difficulty' ? (
                <Heart size={20} className="text-yellow-600" />
              ) : (
                <Gift size={20} className="text-yellow-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">待审批数</p>
              <p className="text-xl font-semibold text-yellow-600">{pendingTotal}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              {activeTab === 'difficulty' ? (
                <Heart size={20} className="text-purple-600" />
              ) : (
                <Gift size={20} className="text-purple-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">累计补助金额</p>
              <p className="text-xl font-semibold text-purple-600">¥{approvedTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">筛选条件</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申请人姓名</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">病种</label>
            <select
              value={diseaseFilter}
              onChange={(e) => setDiseaseFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部病种</option>
              {uniqueDiseases.map((disease) => (
                <option key={disease} value={disease}>{disease}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">困难类别</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部类别</option>
              {Object.entries(difficultyCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申请月份</label>
            <input
              type="month"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <PieChart size={20} className="text-gray-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">困难类别分布</h3>
          </div>
          <div className="h-64">
            {Object.keys(categoryStats).length > 0 ? (
              <Pie data={pieChartData} options={pieOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                暂无数据
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <BarChart2 size={20} className="text-gray-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">月度帮扶金额</h3>
          </div>
          <div className="h-64">
            {Object.keys(monthlyStats).length > 0 ? (
              <Bar data={barChartData} options={barOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                暂无数据
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">申请记录列表</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <DataTable columns={columns} data={filteredApplications} />
        )}
      </div>
    </div>
  )
}
