import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const disable = typeof window !== 'undefined' && window.SERVER_CONFIG && window.SERVER_CONFIG.DISABLE_LOGIN === true
      if (disable) {
        setUser({ username: 'guest', permissions: [] })
        setIsAuthenticated(true)
        setLoading(false)
        return
      }
      try {
        const sTok = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : ''
        const lTok = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : ''
        const token = sTok || lTok || ''
        if (!token || token === 'undefined' || token === 'null') {
          sessionStorage.removeItem('currentUser')
          sessionStorage.removeItem('token')
          localStorage.removeItem('token')
          setUser(null)
          setIsAuthenticated(false)
          return
        }
        const savedUser = sessionStorage.getItem('currentUser')
        if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
          const userData = JSON.parse(savedUser)
          if (userData && typeof userData === 'object' && userData.username) {
            if (!userData.id && userData.username === 'admin') {
              userData.id = -1
            }
            setUser(userData)
            setIsAuthenticated(true)
          } else {
            // 清理无效数据
            sessionStorage.removeItem('currentUser')
            setUser(null)
            setIsAuthenticated(false)
          }
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // 清理损坏的数据
        localStorage.removeItem('currentUser')
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('用户名和密码不能为空')
      }

      // 调用后端API进行登录验证
      const { data } = await api.post('/login', { username, password });
      
      if (!data) {
        throw new Error('服务器返回空响应，请检查网络连接或服务器状态');
      }

      // 保存用户信息和token到本地存储
      const { token, user } = data;
      const rememberPasswordSetting = localStorage.getItem('REMEMBER_PASSWORD') === 'true';
      
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      
      // 如果勾选了记住密码，将token保存到localStorage
      if (rememberPasswordSetting) {
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      
      setUser(user);
      setIsAuthenticated(true);

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  const logout = () => {
    try {
      sessionStorage.removeItem('currentUser')
      sessionStorage.removeItem('token')
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      setUser(null)
      setIsAuthenticated(false)
      return { success: true }
    } catch (error) {
      console.error('Logout failed:', error)
      return { success: false, error: error.message }
    }
  }

  const updateUser = async (userData) => {
    try {
      if (!userData || typeof userData !== 'object') {
        throw new Error('无效的用户数据')
      }

      if (!user || !user.id) {
        throw new Error('用户未登录或ID丢失')
      }

      const updatedUser = { 
        ...user, 
        ...userData, 
        lastActive: new Date().toISOString() 
      }
      
      // 特殊处理：当id为-1时（管理员用户），只更新本地存储，不调用后端API
      if (user.id !== -1) {
        // Call backend API to update user
        await api.put(`/users/${user.id}`, userData);
      }

      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser))
      setUser(updatedUser)
      return { success: true, user: updatedUser }
    } catch (error) {
      console.error('Update user failed:', error)
      return { success: false, error: error.message }
    }
  }

  const checkPermission = (permission) => {
    if (!user || !user.permissions || !Array.isArray(user.permissions)) {
      return false
    }
    
    // 权限名称映射 - 与RoleManagement.jsx保持一致
    const PERMISSION_NAME_MAP = {
      '数据查看': ['dashboard', 'department_targets', 'annual_planning', 'annual_planning_chart', 'annual_work_plan', 'major_events', 'monthly_progress', 'action_plans', 'data_analysis', 'notifications', 'profile'],
      '系统管理': ['company_info', 'department_management', 'employee_management', 'org_structure', 'role_management', 'system_logs', 'template_settings', 'system_settings', 'notification_management', 'dingtalk_config'],
      '用户管理': ['user_management']
    }
    
    // 如果是管理员权限，直接返回true
    if (user.permissions.includes('admin')) {
      return true
    }
    
    // 如果是具体权限key，直接检查
    if (user.permissions.includes(permission)) {
      return true
    }
    
    // 如果是权限名称，检查是否包含对应的任何一个具体权限
    const mappedPermissions = PERMISSION_NAME_MAP[permission]
    if (mappedPermissions) {
      return mappedPermissions.some(perm => user.permissions.includes(perm))
    }
    
    return false
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkPermission
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
