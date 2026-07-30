import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/Toast'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { Home } from './pages/Home'
import { MembershipApply } from './pages/MembershipApply'
import { Profile } from './pages/Profile'
import { MembershipAudit } from './pages/MembershipAudit'
import { FeeAuthorization } from './pages/FeeAuthorization'
import { FeeAudit } from './pages/FeeAudit'
import { DifficultyApply } from './pages/DifficultyApply'
import { DifficultyRecords } from './pages/DifficultyRecords'
import { DifficultyAudit } from './pages/DifficultyAudit'
import { MutualAidApply } from './pages/MutualAidApply'
import { MutualAidAudit } from './pages/MutualAidAudit'
import { MutualAidDifficultyApply } from './pages/MutualAidDifficultyApply'
import { MutualAidDifficultyAudit } from './pages/MutualAidDifficultyAudit'
import { Statistics } from './pages/Statistics'
import { UserManagement } from './pages/UserManagement'
import { Tasks } from './pages/Tasks'
import { Logs } from './pages/Logs'
import { useAuthStore } from './store/auth'
import { api } from './lib/api'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, login } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await api.auth.getMe()
        if (response.success) {
          login(response.data, localStorage.getItem('token') || '')
        }
      } catch {
        localStorage.removeItem('token')
      } finally {
        setLoading(false)
      }
    }

    if (localStorage.getItem('token')) {
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [login])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

const ModuleRoute = ({ children, module }: { children: React.ReactNode; module?: string }) => {
  const { user } = useAuthStore()
  const userModules = user?.modules || []
  
  if (user?.role === 'admin') {
    return <>{children}</>
  }
  
  if (!module) {
    return <>{children}</>
  }
  
  return userModules.includes(module) ? <>{children}</> : <Navigate to="/" />
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Home />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/membership/apply" element={
            <ProtectedRoute>
              <Layout>
                <MembershipApply />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute>
              <ModuleRoute module="tasks">
                <Layout>
                  <Tasks />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/membership/audit" element={
            <ProtectedRoute>
              <ModuleRoute module="membership_audit">
                <Layout>
                  <MembershipAudit />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/fee/authorization" element={
            <ProtectedRoute>
              <Layout>
                <FeeAuthorization />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/fee/audit" element={
            <ProtectedRoute>
              <ModuleRoute module="fee_audit">
                <Layout>
                  <FeeAudit />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/difficulty/apply" element={
            <ProtectedRoute>
              <Layout>
                <DifficultyApply />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/difficulty/records" element={
            <ProtectedRoute>
              <Layout>
                <DifficultyRecords />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/difficulty/audit" element={
            <ProtectedRoute>
              <ModuleRoute module="difficulty_audit">
                <Layout>
                  <DifficultyAudit />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/mutual-aid/apply" element={
            <ProtectedRoute>
              <Layout>
                <MutualAidApply />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/mutual-aid/audit" element={
            <ProtectedRoute>
              <ModuleRoute module="mutual_aid_audit">
                <Layout>
                  <MutualAidAudit />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/mutual-aid-difficulty/apply" element={
            <ProtectedRoute>
              <Layout>
                <MutualAidDifficultyApply />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/mutual-aid-difficulty/audit" element={
            <ProtectedRoute>
              <ModuleRoute module="mutual_aid_difficulty_audit">
                <Layout>
                  <MutualAidDifficultyAudit />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/statistics" element={
            <ProtectedRoute>
              <ModuleRoute module="statistics">
                <Layout>
                  <Statistics />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <ModuleRoute module="user_management">
                <Layout>
                  <UserManagement />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/admin/system/logs" element={
            <ProtectedRoute>
              <ModuleRoute module="system_logs">
                <Layout>
                  <Logs />
                </Layout>
              </ModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App