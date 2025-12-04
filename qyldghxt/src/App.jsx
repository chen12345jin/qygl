// 应用主组件
// 包含路由和全局布局
import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PermissionRoute from './components/PermissionRoute'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { SocketProvider } from './contexts/SocketContext'
import { FormValidationProvider } from './contexts/FormValidationContext'

// 使用 React.lazy 进行代码分割，提升初始加载性能
import Dashboard from './pages/Dashboard'
const DepartmentTargets = React.lazy(() => import('./pages/DepartmentTargets'))
const AnnualPlanning = React.lazy(() => import('./pages/AnnualPlanning'))
const AnnualPlanningChart = React.lazy(() => import('./pages/AnnualPlanningChart'))
const AnnualWorkPlan = React.lazy(() => import('./pages/AnnualWorkPlan'))
const MajorEvents = React.lazy(() => import('./pages/MajorEvents'))
const MonthlyProgress = React.lazy(() => import('./pages/MonthlyProgress'))
import ActionPlans from './pages/ActionPlans'
const DataAnalysis = React.lazy(() => import('./pages/DataAnalysis'))
const CompanyInfo = React.lazy(() => import('./pages/system/CompanyInfo'))
const DepartmentManagement = React.lazy(() => import('./pages/system/DepartmentManagement'))
const EmployeeManagement = React.lazy(() => import('./pages/system/EmployeeManagement'))
const UserManagement = React.lazy(() => import('./pages/system/UserManagement'))
import SystemSettings from './pages/system/SystemSettings'
const TemplateSettings = React.lazy(() => import('./pages/system/TemplateSettings'))
const Notifications = React.lazy(() => import('./pages/system/Notifications'))
const Profile = React.lazy(() => import('./pages/system/Profile'))
const OrgStructure = React.lazy(() => import('./pages/system/OrgStructure'))
const ServerConfig = React.lazy(() => import('./pages/ServerConfig'))

// 加载组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '', stack: '' }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('UI Error:', error, info)
    this.setState({ message: String(error?.message || ''), stack: String(info?.componentStack || '') })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-xl">
            <div className="text-lg font-semibold text-red-600 mb-2">页面加载失败</div>
            <div className="text-gray-600 mb-4">请返回首页或刷新后重试</div>
            <div className="text-left text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
              <div className="mb-1"><span className="font-medium">路径：</span>{typeof window !== 'undefined' ? window.location.pathname : ''}</div>
              {this.state.message && (
                <div className="mb-1"><span className="font-medium">错误：</span>{this.state.message}</div>
              )}
              {this.state.stack && (
                <div className="mt-2">
                  <div className="font-medium mb-1">组件栈：</div>
                  <pre className="text-xs whitespace-pre-wrap text-gray-500">{this.state.stack}</pre>
                </div>
              )}
            </div>
            <a href="/dashboard" className="inline-flex items-center px-4 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700">返回首页</a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <DataProvider>
          <FormValidationProvider>
            <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/server-config" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ServerConfig />
                </Suspense>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<PermissionRoute permission="数据查看"><Dashboard /></PermissionRoute>} />
              <Route path="department-targets" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><DepartmentTargets /></PermissionRoute>
                </Suspense>
              } />
              <Route path="annual-planning" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><AnnualPlanning /></PermissionRoute>
                </Suspense>
              } />
              <Route path="annual-planning-chart" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><AnnualPlanningChart /></PermissionRoute>
                </Suspense>
              } />
              <Route path="annual-work-plan" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><AnnualWorkPlan /></PermissionRoute>
                </Suspense>
              } />
              <Route path="major-events" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><MajorEvents /></PermissionRoute>
                </Suspense>
              } />
              <Route path="major-events/:year" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><MajorEvents /></PermissionRoute>
                </Suspense>
              } />
              <Route path="monthly-progress" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><MonthlyProgress /></PermissionRoute>
                </Suspense>
              } />
              <Route path="action-plans" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><ActionPlans /></PermissionRoute>
                </Suspense>
              } />
              <Route path="data-analysis" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><DataAnalysis /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/company-info" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="系统管理"><CompanyInfo /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/departments" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="系统管理"><DepartmentManagement /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/employees" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="系统管理"><EmployeeManagement /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/users" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="用户管理"><UserManagement /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/settings" element={<PermissionRoute permission="系统管理"><SystemSettings /></PermissionRoute>} />
              <Route path="system/templates" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="系统管理"><TemplateSettings /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/org-structure" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="系统管理"><OrgStructure /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/notifications" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><Notifications /></PermissionRoute>
                </Suspense>
              } />
              <Route path="system/profile" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionRoute permission="数据查看"><Profile /></PermissionRoute>
                </Suspense>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster 
              position="top-right" 
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
            </ErrorBoundary>
          </FormValidationProvider>
        </DataProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
