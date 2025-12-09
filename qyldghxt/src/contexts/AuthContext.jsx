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
    // 检查本地存储中的用户信息
    const checkAuth = () => {
      const disable = typeof window !== 'undefined' && window.SERVER_CONFIG && window.SERVER_CONFIG.DISABLE_LOGIN === true
      if (disable) {
        setUser({ username: 'guest', permissions: ['admin'] })
        setIsAuthenticated(true)
        setLoading(false)
        return
      }
      try {
        const savedUser = sessionStorage.getItem('currentUser')
        if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
          const userData = JSON.parse(savedUser)
          if (userData && typeof userData === 'object' && userData.username) {
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
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('currentUser', JSON.stringify(user));
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
      setUser(null)
      setIsAuthenticated(false)
      return { success: true }
    } catch (error) {
      console.error('Logout failed:', error)
      return { success: false, error: error.message }
    }
  }

  const updateUser = (userData) => {
    try {
      if (!userData || typeof userData !== 'object') {
        throw new Error('无效的用户数据')
      }

      const updatedUser = { 
        ...user, 
        ...userData, 
        lastActive: new Date().toISOString() 
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
    return user.permissions.includes(permission) || user.permissions.includes('admin')
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
