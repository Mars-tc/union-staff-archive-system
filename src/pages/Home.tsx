import { useEffect, useState } from 'react'
import { UserPlus, CreditCard, Heart, FileText, TrendingUp, AlertCircle, Gift } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'

interface Application {
  id: number
  name: string
  email: string
  status: string
  created_at: string
}

export const Home = () => {
  const { user } = useAuthStore()
  const { showError } = useToast()
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingApplications: 0,
    pendingDifficulty: 0,
    pendingMutualAidDifficulty: 0,
    totalAuthorizations: 0,
  })
  const [pendingApplications, setPendingApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membershipRes, difficultyRes, mutualAidDifficultyRes] = await Promise.all([
          api.membership.getApplications('pending'),
          api.difficulty.getApplications('pending'),
          api.mutualAidDifficulty.getApplications('pending'),
        ])

        const totalMembers = await api.users.getUsers()

        setStats({
          totalMembers: totalMembers.success ? totalMembers.data.length : 0,
          pendingApplications: membershipRes.success ? membershipRes.data.length : 0,
          pendingDifficulty: difficultyRes.success ? difficultyRes.data.length : 0,
          pendingMutualAidDifficulty: mutualAidDifficultyRes.success ? mutualAidDifficultyRes.data.length : 0,
          totalAuthorizations: 0,
        })

        if (membershipRes.success && user?.role === 'admin') {
          setPendingApplications(membershipRes.data.slice(0, 5))
        }
      } catch {
        showError('获取统计数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.role])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">欢迎回来，{user?.name}</h1>
        <p className="text-gray-500 mt-1">今天是 {new Date().toLocaleDateString('zh-CN')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="总用户数"
          value={stats.totalMembers}
          icon={UserPlus}
          color="blue"
        />
        <StatCard
          title="待审核入会申请"
          value={stats.pendingApplications}
          icon={FileText}
          color="orange"
        />
        <StatCard
          title="待审批困难帮扶"
          value={stats.pendingDifficulty}
          icon={Heart}
          color="purple"
        />
        <StatCard
          title="待审批爱心帮扶"
          value={stats.pendingMutualAidDifficulty}
          icon={Gift}
          color="red"
        />
        <StatCard
          title="会费授权数"
          value={stats.totalAuthorizations}
          icon={CreditCard}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">快捷操作</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              to="/membership/apply"
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <UserPlus size={32} className="text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">入会申请</span>
            </Link>
            <Link
              to="/fee/authorization"
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CreditCard size={32} className="text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">会费授权</span>
            </Link>
            <Link
              to="/difficulty/apply"
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Heart size={32} className="text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">困难帮扶</span>
            </Link>
            <Link
              to="/mutual-aid-difficulty/apply"
              className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Gift size={32} className="text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">爱心帮扶</span>
            </Link>
            <Link
              to="/difficulty/records"
              className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <FileText size={32} className="text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">困难档案</span>
            </Link>
            <Link
              to="/statistics"
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <TrendingUp size={32} className="text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">查询统计</span>
            </Link>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">待审核入会申请</h2>
              <Link to="/membership/audit" className="text-sm text-blue-600 hover:text-blue-800">
                查看全部
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : pendingApplications.length > 0 ? (
              <div className="space-y-3">
                {pendingApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{app.name}</p>
                      <p className="text-sm text-gray-500">{app.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      待审核
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle size={48} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">暂无待审核申请</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
