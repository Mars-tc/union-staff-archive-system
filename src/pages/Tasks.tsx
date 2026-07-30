import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, CheckCircle, Clock, Eye, UserPlus, HandHeart, Heart } from 'lucide-react'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../components/StatCard'
import { DifficultyAudit } from '../components/DifficultyAudit'
import { useToast } from '../context/ToastContext'

interface Task {
  id: number
  type: 'membership' | 'mutual_aid' | 'difficulty'
  typeName: string
  name: string
  email: string
  phone: string
  extraInfo: string
  status?: 'approved' | 'rejected' | 'pending'
  createdAt: string
  updatedAt?: string
  stepInfo: string
}

interface Stats {
  todo: {
    total: number
    membership: number
    mutualAid: number
    difficulty: number
  }
  done: {
    total: number
    membership: number
    mutualAid: number
    difficulty: number
  }
}

export const Tasks = () => {
  const { showError } = useToast()
  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo')
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDifficultyAudit, setShowDifficultyAudit] = useState(false)
  const [difficultyApplicationId, setDifficultyApplicationId] = useState(0)
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, statsRes] = await Promise.all([
        activeTab === 'todo' ? api.tasks.getTodo() : api.tasks.getDone(),
        api.tasks.getStats(),
      ])
      console.log('Tasks response:', tasksRes)
      console.log('Stats response:', statsRes)
      if (tasksRes.success) {
        setTasks(tasksRes.data || [])
      } else {
        showError('获取任务列表失败')
        setTasks([])
      }
      if (statsRes.success) {
        setStats(statsRes.data)
      }
    } catch (error) {
      showError('获取任务失败')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'membership':
        return <UserPlus size={18} className="text-blue-500" />
      case 'mutual_aid':
        return <HandHeart size={18} className="text-red-500" />
      case 'difficulty':
        return <Heart size={18} className="text-purple-500" />
      default:
        return <ClipboardList size={18} className="text-gray-500" />
    }
  }

  const getStatusConfig = (status?: string) => {
    if (!status) return { text: '', className: '' }
    if (status === 'approved') return { text: '已通过', className: 'bg-green-100 text-green-700' }
    if (status === 'rejected') return { text: '已拒绝', className: 'bg-red-100 text-red-700' }
    return { text: '待审核', className: 'bg-yellow-100 text-yellow-700' }
  }

  const handleView = (task: Task) => {
    switch (task.type) {
      case 'membership':
        navigate('/membership/audit')
        break
      case 'mutual_aid':
        navigate('/mutual-aid/audit')
        break
      case 'difficulty':
        setDifficultyApplicationId(task.id)
        setShowDifficultyAudit(true)
        break
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <ClipboardList size={28} className="text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-800">任务管理</h2>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="待办总数"
            value={stats.todo.total}
            icon={Clock}
            color="orange"
          />
          <StatCard
            title="已办总数"
            value={stats.done.total}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="待办入会申请"
            value={stats.todo.membership}
            icon={UserPlus}
            color="blue"
          />
          <StatCard
            title="待办困难帮扶"
            value={stats.todo.difficulty}
            icon={Heart}
            color="purple"
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('todo')}
            className={`flex-1 flex items-center justify-center px-4 py-4 text-sm font-medium transition-colors ${
              activeTab === 'todo'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock size={18} className="mr-2" />
            待办 ({stats?.todo.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('done')}
            className={`flex-1 flex items-center justify-center px-4 py-4 text-sm font-medium transition-colors ${
              activeTab === 'done'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CheckCircle size={18} className="mr-2" />
            已办 ({stats?.done.total || 0})
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                {activeTab === 'todo' ? (
                  <>
                    <CheckCircle size={48} className="text-green-300 mb-3" />
                    <p className="text-gray-500">暂无待办任务</p>
                  </>
                ) : (
                  <>
                    <ClipboardList size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-500">暂无已办任务</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={`${task.type}-${task.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getTypeIcon(task.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-800">{task.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {task.typeName}
                      </span>
                      {task.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusConfig(task.status).className}`}>
                          {getStatusConfig(task.status).text}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{task.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.extraInfo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5" />
                      处理环节：{task.stepInfo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {activeTab === 'todo' ? '申请时间' : '处理时间'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activeTab === 'todo'
                        ? new Date(task.createdAt).toLocaleString('zh-CN')
                        : task.updatedAt
                        ? new Date(task.updatedAt).toLocaleString('zh-CN')
                        : new Date(task.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleView(task)}
                    className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Eye size={14} className="mr-1" />
                    查看
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DifficultyAudit
        isOpen={showDifficultyAudit}
        onClose={() => setShowDifficultyAudit(false)}
        applicationId={difficultyApplicationId}
        onAuditComplete={fetchData}
      />
    </div>
  )
}