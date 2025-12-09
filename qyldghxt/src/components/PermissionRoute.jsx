import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PermissionRoute({ permission, children }) {
  const { isAuthenticated, checkPermission } = useAuth()
  const disable = typeof window !== 'undefined' && window.SERVER_CONFIG && window.SERVER_CONFIG.DISABLE_LOGIN === true
  if (disable) return children
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const ok = !permission || checkPermission(permission)
  if (!ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="text-lg font-semibold text-red-600 mb-2">无访问权限</div>
          <div className="text-gray-600 mb-4">请联系管理员为你的账号授权</div>
          <a href="/dashboard" className="inline-flex items-center px-4 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700">返回首页</a>
        </div>
      </div>
    )
  }
  return children
}
