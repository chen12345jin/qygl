// 应用主组件
// 包含路由和全局布局
import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { SocketProvider } from './contexts/SocketContext'
import { FormValidationProvider } from './contexts/FormValidationContext'

// 使用React.lazy进行代码分割，提升初始加载性能
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const DepartmentTargets = React.lazy(() => import('./pages/DepartmentTargets'))
const AnnualPlanning = React.lazy(() => import('./pages/AnnualPlanning'))
const AnnualPlanningChart = React.lazy(() => import('./pages/AnnualPlanningChart'))
const AnnualWorkPlan = React.lazy(() => import('./pages/AnnualWorkPlan'))
const MajorEvents = React.lazy(() => import('./pages/MajorEvents'))
const MonthlyProgress = React.lazy(() => import('./pages/MonthlyProgress'))
const ActionPlans = React.lazy(() => import('./pages/ActionPlans'))
const DataAnalysis = React.lazy(() => import('./pages/DataAnalysis'))
const CompanyInfo = React.lazy(() => import('./pages/system/CompanyInfo'))
const DepartmentManagement = React.lazy(() => import('./pages/system/DepartmentManagement'))
const EmployeeManagement = React.lazy(() => import('./pages/system/EmployeeManagement'))
const UserManagement = React.lazy(() => import('./pages/system/UserManagement'))
const SystemSettings = React.lazy(() => import('./pages/system/SystemSettings'))
const TemplateSettings = React.lazy(() => import('./pages/system/TemplateSettings'))
const Notifications = React.lazy(() => import('./pages/system/Notifications'))
const Profile = React.lazy(() => import('./pages/system/Profile'))

// 加载组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <DataProvider>
          <FormValidationProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="department-targets" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <DepartmentTargets />
                </Suspense>
              } />
              <Route path="annual-planning" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AnnualPlanning />
                </Suspense>
              } />
              <Route path="annual-planning-chart" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AnnualPlanningChart />
                </Suspense>
              } />
              <Route path="annual-work-plan" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AnnualWorkPlan />
                </Suspense>
              } />
              <Route path="major-events" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <MajorEvents />
                </Suspense>
              } />
              <Route path="monthly-progress" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <MonthlyProgress />
                </Suspense>
              } />
              <Route path="action-plans" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ActionPlans />
                </Suspense>
              } />
              <Route path="data-analysis" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <DataAnalysis />
                </Suspense>
              } />
              <Route path="system/company-info" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CompanyInfo />
                </Suspense>
              } />
              <Route path="system/departments" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <DepartmentManagement />
                </Suspense>
              } />
              <Route path="system/employees" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <EmployeeManagement />
                </Suspense>
              } />
              <Route path="system/users" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <UserManagement />
                </Suspense>
              } />
              <Route path="system/settings" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <SystemSettings />
                </Suspense>
              } />
              <Route path="system/templates" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <TemplateSettings />
                </Suspense>
              } />
              <Route path="system/notifications" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Notifications />
                </Suspense>
              } />
              <Route path="system/profile" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Profile />
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
          </FormValidationProvider>
        </DataProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
