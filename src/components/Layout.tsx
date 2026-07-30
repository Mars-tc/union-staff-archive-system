import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  UserPlus,
  CreditCard,
  Heart,
  FileText,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  HandHeart,
  ClipboardList,
  User,
  Gift,
} from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { api } from '../lib/api'

interface LayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  path: string
  icon: React.ElementType
  label: string
  module?: string
}

interface TodoStats {
  total: number
  membership: number
  mutualAid: number
  difficulty: number
  mutualAidDifficulty: number
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todoStats, setTodoStats] = useState<TodoStats>({ total: 0, membership: 0, mutualAid: 0, difficulty: 0, mutualAidDifficulty: 0 })

  useEffect(() => {
    if (!isAuthenticated) return
    const shouldShowAdminMenu = user?.role === 'admin' || ['grass_root_auditor', 'union_committee_auditor'].includes(user?.role || '')
    if (!shouldShowAdminMenu) return

    const fetchStats = async () => {
      try {
        const response = await api.tasks.getStats()
        if (response.success && response.data?.todo) {
          setTodoStats(response.data.todo)
        }
      } catch (error) {
        console.error('获取待办统计失败:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getBadgeCount = (path: string): number => {
    switch (path) {
      case '/tasks':
        return todoStats.total
      case '/membership/audit':
        return todoStats.membership
      case '/mutual-aid/audit':
        return todoStats.mutualAid
      case '/difficulty/audit':
        return todoStats.difficulty
      case '/mutual-aid-difficulty/audit':
        return todoStats.mutualAidDifficulty
      default:
        return 0
    }
  }

  const navItems: MenuItem[] = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/profile', icon: User, label: '个人信息' },
    { path: '/membership/apply', icon: UserPlus, label: '入会申请' },
    { path: '/mutual-aid/apply', icon: HandHeart, label: '爱心互助会' },
    { path: '/difficulty/apply', icon: Heart, label: '困难帮扶' },
    { path: '/mutual-aid-difficulty/apply', icon: Gift, label: '爱心帮扶' },
    { path: '/statistics', icon: BarChart3, label: '查询统计', module: 'statistics' },
  ]

  const difficultyRecordsItem: MenuItem = { path: '/difficulty/records', icon: FileText, label: '困难档案' }

  const feeAuthItem: MenuItem = { path: '/fee/authorization', icon: CreditCard, label: '会费授权' }

  const adminItems: MenuItem[] = [
    { path: '/tasks', icon: ClipboardList, label: '任务管理', module: 'tasks' },
    { path: '/membership/audit', icon: FileText, label: '入会审核', module: 'membership_audit' },
    { path: '/fee/audit', icon: CreditCard, label: '会费审核', module: 'fee_audit' },
    { path: '/mutual-aid/audit', icon: HandHeart, label: '互助会审核', module: 'mutual_aid_audit' },
    { path: '/difficulty/audit', icon: Heart, label: '困难帮扶审批', module: 'difficulty_audit' },
    { path: '/mutual-aid-difficulty/audit', icon: Gift, label: '爱心帮扶审批', module: 'mutual_aid_difficulty_audit' },
    { path: '/admin/users', icon: Users, label: '用户管理', module: 'user_management' },
    { path: '/admin/system/logs', icon: FileText, label: '系统日志', module: 'system_logs' },
  ]

  const userModules = user?.modules || []
  const isAdmin = user?.role === 'admin'
  const isUnionMember = user?.union_member

  const hasModuleAccess = (module?: string): boolean => {
    if (!module) return true
    if (isAdmin) return true
    return userModules.includes(module)
  }

  const filteredNavItems = navItems.filter(item => hasModuleAccess(item.module))
  if (isUnionMember) {
    filteredNavItems.splice(3, 0, feeAuthItem)
    filteredNavItems.splice(5, 0, difficultyRecordsItem)
  }
  const filteredAdminItems = adminItems.filter(item => hasModuleAccess(item.module))

  if (!isAuthenticated) {
    return <div className="min-h-screen">{children}</div>
  }

  const shouldShowAdminMenu = isAdmin || ['grass_root_auditor', 'union_committee_auditor'].includes(user?.role || '')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="fixed top-0 left-0 right-0 bg-blue-700 text-white shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                className="md:hidden p-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link to="/" className="text-xl font-bold ml-2">
                工会职工档案系统
              </Link>
            </div>
            <div className="flex items-center">
              <span className="mr-4">{user?.name}</span>
              <button onClick={handleLogout} className="flex items-center px-3 py-2 text-sm">
                <LogOut size={16} className="mr-1" />
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 pt-16">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 fixed md:fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 transition-transform z-40 overflow-y-auto scrollbar-auto-hide`}
        >
          <div className="p-4 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : ''
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} className="mr-3" />
                {item.label}
              </Link>
            ))}
            {shouldShowAdminMenu && filteredAdminItems.length > 0 && (
              <>
                <div className="border-t border-gray-200 my-2" />
                {filteredAdminItems.map((item) => {
                  const badgeCount = getBadgeCount(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 ${
                        location.pathname === item.path
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : ''
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div className="flex items-center">
                        <item.icon size={20} className="mr-3" />
                        {item.label}
                      </div>
                      {badgeCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[20px] h-5">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 md:p-6 md:ml-64 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-auto-hide">
          {children}
        </main>
      </div>
    </div>
  )
}