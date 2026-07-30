import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, KeyRound, Lock, ArrowLeft, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'

type Step = 'email' | 'reset' | 'success'

export const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  // 倒计时（秒），期间不可重复发送
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  // 启动倒计时
  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email) {
      setError('请输入邮箱')
      return
    }

    setLoading(true)
    try {
      const response = await api.auth.forgotPassword(email)
      if (response.success) {
        setStep('reset')
        startCountdown()
        // 开发模式：后端会返回 dev_code 字段，用于展示验证码
        if (response.dev_code) {
          setInfo(`验证码已发送（开发模式）：${response.dev_code}`)
        } else {
          setInfo('验证码已发送至邮箱，请在10分钟内使用')
        }
      } else {
        setError(response.error)
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown > 0) return
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const response = await api.auth.forgotPassword(email)
      if (response.success) {
        startCountdown()
        if (response.dev_code) {
          setInfo(`验证码已重新发送（开发模式）：${response.dev_code}`)
        } else {
          setInfo('验证码已重新发送至邮箱')
        }
      } else {
        setError(response.error)
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code) {
      setError('请输入验证码')
      return
    }
    if (!newPassword) {
      setError('请输入新密码')
      return
    }
    if (newPassword.length < 6) {
      setError('密码长度至少6位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const response = await api.auth.resetPassword(email, code, newPassword)
      if (response.success) {
        setStep('success')
      } else {
        setError(response.error)
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">工会职工档案系统</h1>
          <p className="text-gray-500 mt-2">找回密码</p>
        </div>

        {/* 步骤一：输入邮箱 */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                注册邮箱
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入注册邮箱"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? '发送中...' : '发送验证码'}
            </button>
          </form>
        )}

        {/* 步骤二：输入验证码和新密码 */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                验证码
              </label>
              <div className="relative">
                <KeyRound
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入6位验证码"
                  required
                />
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:hover:bg-transparent"
                >
                  {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密码
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="至少6位"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认新密码
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请再次输入新密码"
                  required
                />
              </div>
            </div>

            {info && (
              <div className="text-green-600 text-sm text-center bg-green-50 py-2 px-3 rounded-lg">
                {info}
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? '处理中...' : '重置密码'}
            </button>
          </form>
        )}

        {/* 步骤三：重置成功 */}
        {step === 'success' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <RefreshCw size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">密码重置成功</h2>
            <p className="text-gray-500 text-sm">请使用新密码登录账户</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回登录
            </button>
          </div>
        )}

        {/* 返回登录链接 */}
        {step !== 'success' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
            >
              <ArrowLeft size={14} className="mr-1" />
              返回登录
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
