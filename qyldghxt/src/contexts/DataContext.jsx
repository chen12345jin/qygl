import React, { createContext, useContext, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../utils/api'
import { useSocket } from './SocketContext'

const DataContext = createContext()

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

export const DataProvider = ({ children }) => {
  const [loading, setLoading] = useState(false)
  const { emitDataUpdate } = useSocket()

  // 通用API调用方法
  const handleApiCall = async (operation, showToast = true) => {
    setLoading(true)
    try {
      const result = await operation()
      if (showToast && result !== null && result !== undefined) {
        toast.success('操作成功')
      }
      return { success: true, data: result }
    } catch (error) {
      // 更清晰的错误信息处理
      let message = '操作失败'
      
      if (error.response) {
        // HTTP错误响应
        if (error.response.status === 401) {
          message = '认证失败，请重新登录'
          // 自动跳转到登录页面
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          const disable = typeof window !== 'undefined' && window.SERVER_CONFIG && window.SERVER_CONFIG.DISABLE_LOGIN === true
          if (!disable && typeof window !== 'undefined') {
            window.location.hash = '#/login'
          }
        } else if (error.response.status === 404) {
          message = '请求的资源不存在'
        } else if (error.response.data?.error) {
          const d = error.response.data
          message = d.error + (d.details ? `：${d.details}` : '')
        } else {
          message = `服务器错误: ${error.response.status}`
        }
      } else if (error.request) {
        // 网络错误
        message = '网络连接失败，请检查网络连接'
      } else {
        // 其他错误
        message = error.message || '操作失败'
      }
      
      if (showToast) {
        toast.error(message)
      }
      return { success: false, error: message, data: [] }
    } finally {
      setLoading(false)
    }
  }

  const ensureDeleteOk = (response) => {
    const d = response && response.data
    if (!d) return true
    const ok = (d.success === true) || (d.code === 200) || (d.status === 'ok')
    if (!ok) throw new Error(d.msg || d.error || '删除失败')
    return true
  }

  // 部门管理
  const getDepartments = async () => {
    return handleApiCall(async () => {
      const response = await api.get('/departments')
      return response.data
    }, false)
  }

  const getDingTalkDepartments = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/dingtalk/departments', { params })
      return response.data
    }, false)
  }

  const syncDepartmentsFromDingTalk = async (data = {}) => {
    return handleApiCall(async () => {
      const response = await api.post('/departments/sync-dingtalk', data)
      return response.data
    })
  }

  const addDepartment = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/departments', data)
      return response.data
    })
  }

  const updateDepartment = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/departments/${id}`, data)
      return data
    })
  }

  const deleteDepartment = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/departments/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 员工管理
  const getEmployees = async () => {
    return handleApiCall(async () => {
      const response = await api.get('/employees')
      return response.data
    }, false)
  }

  const getDingTalkEmployees = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/dingtalk/employees', { params })
      return response.data
    }, false)
  }

  const syncEmployeesFromDingTalk = async (data = {}) => {
    return handleApiCall(async () => {
      const response = await api.post('/employees/sync-dingtalk', data)
      return response.data
    })
  }

  const addEmployee = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/employees', data)
      return response.data
    })
  }

  const updateEmployee = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/employees/${id}`, data)
      return data
    })
  }

  const deleteEmployee = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/employees/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 用户管理
  const getUsers = async () => {
    return handleApiCall(async () => {
      const response = await api.get('/users')
      return response.data || []
    }, false)
  }

  const addUser = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/users', data)
      return response.data
    })
  }

  const updateUser = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/users/${id}`, data)
      return data
    })
  }

  const deleteUser = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/users/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 部门目标分解
  const getDepartmentTargets = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/department-targets', { params })
      return response.data
    }, false)
  }

  const addDepartmentTarget = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/department-targets', data)
      return response.data
    })
  }

  const updateDepartmentTarget = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/department-targets/${id}`, data)
      return data
    })
  }

  const deleteDepartmentTarget = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/department-targets/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 年度工作落地规划
  const getAnnualWorkPlans = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/annual-work-plans', { params })
      return response.data
    }, false)
  }

  const addAnnualWorkPlan = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/annual-work-plans', data)
      try { emitDataUpdate('annualWorkPlans', { year: data?.year, action: 'add' }) } catch {}
      return response.data
    })
  }

  const updateAnnualWorkPlan = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/annual-work-plans/${id}`, data)
      try { emitDataUpdate('annualWorkPlans', { year: data?.year, action: 'update' }) } catch {}
      return data
    })
  }

  const deleteAnnualWorkPlan = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/annual-work-plans/${id}`)
      ensureDeleteOk(response)
      try { emitDataUpdate('annualWorkPlans', { action: 'delete' }) } catch {}
      return true
    })
  }

  // 年度规划数据 (兼容性方法)
  const getAnnualPlans = async (params = {}) => {
    return getAnnualWorkPlans(params)
  }

  const addAnnualPlan = async (data) => {
    return addAnnualWorkPlan(data)
  }

  const updateAnnualPlan = async (id, data) => {
    return updateAnnualWorkPlan(id, data)
  }

  const deleteAnnualPlan = async (id) => {
    return deleteAnnualWorkPlan(id)
  }

  // 大事件提炼
  const getMajorEvents = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/major-events', { params })
      return response.data
    }, false)
  }

  const addMajorEvent = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/major-events', data)
      return response.data
    })
  }

  const updateMajorEvent = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/major-events/${id}`, data)
      return data
    })
  }

  const deleteMajorEvent = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/major-events/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 月度推进计划
  const getMonthlyProgress = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/monthly-progress', { params })
      return response.data
    }, false)
  }

  const addMonthlyProgress = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/monthly-progress', data)
      return response.data
    })
  }

  const updateMonthlyProgress = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/monthly-progress/${id}`, data)
      return data
    })
  }

  const deleteMonthlyProgress = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/monthly-progress/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 5W2H行动计划
  const getActionPlans = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/action-plans', { params })
      return response.data
    }, false)
  }

  const addActionPlan = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/action-plans', data)
      try { emitDataUpdate('actionPlans', { year: data?.year, action: 'add' }) } catch {}
      return response.data
    })
  }

  const updateActionPlan = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/action-plans/${id}`, data)
      try { emitDataUpdate('actionPlans', { year: data?.year, action: 'update' }) } catch {}
      return data
    })
  }

  const deleteActionPlan = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/action-plans/${id}`)
      ensureDeleteOk(response)
      try { emitDataUpdate('actionPlans', { action: 'delete' }) } catch {}
      return true
    })
  }

  // 模板设置
  const getTemplates = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/templates', { params })
      return response.data
    }, false)
  }

  const addTemplate = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/templates', data)
      return response.data
    })
  }

  const updateTemplate = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/templates/${id}`, data)
      return data
    })
  }

  const deleteTemplate = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/templates/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 目标类型
  const getTargetTypes = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/target-types', { params })
      return response.data
    }, false)
  }

  const addTargetType = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/target-types', data)
      return response.data
    })
  }

  const updateTargetType = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/target-types/${id}`, data)
      return data
    })
  }

  const deleteTargetType = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/target-types/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 系统设置
  const getSystemSettings = async (params = {}) => {
    return handleApiCall(async () => {
      const response = await api.get('/system-settings', { params })
      return response.data
    }, false)
  }

  const addSystemSetting = async (data, showToast = true) => {
    return handleApiCall(async () => {
      const response = await api.post('/system-settings', data)
      return response.data
    }, showToast)
  }

  const updateSystemSetting = async (id, data, showToast = true) => {
    return handleApiCall(async () => {
      await api.put(`/system-settings/${id}`, data)
      return data
    }, showToast)
  }

  const deleteSystemSetting = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/system-settings/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 系统公告 / 通知
  const getNotifications = async () => {
    return handleApiCall(async () => {
      const response = await api.get('/notifications')
      return response.data
    }, false)
  }

  const addNotification = async (data) => {
    return handleApiCall(async () => {
      const response = await api.post('/notifications', data)
      return response.data
    })
  }

  const updateNotification = async (id, data) => {
    return handleApiCall(async () => {
      await api.put(`/notifications/${id}`, data)
      return data
    })
  }

  const deleteNotification = async (id) => {
    return handleApiCall(async () => {
      const response = await api.delete(`/notifications/${id}`)
      ensureDeleteOk(response)
      return true
    })
  }

  // 文件上传
  const uploadFile = async (file) => {
    return handleApiCall(async () => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    })
  }

  // 公司信息
  const getCompanyInfo = async () => {
    return handleApiCall(async () => {
      const response = await api.get('/company-info')
      return response.data
    }, false)
  }

  const updateCompanyInfo = async (data) => {
    return handleApiCall(async () => {
      const response = await api.put('/company-info', data)
      return response.data
    })
  }

  const getIntegrationStatus = async () => {
    return handleApiCall(async () => {
      const response = await api.get('/integration/status')
      return response.data
    }, false)
  }

  const checkBackendHealth = async () => {
    return handleApiCall(async () => {
      const response = await api.get('/health')
      return response.data
    }, false)
  }

  const value = {
    loading,
    getDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getDingTalkDepartments,
    syncDepartmentsFromDingTalk,
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getDingTalkEmployees,
    syncEmployeesFromDingTalk,
    getUsers,
    addUser,
    updateUser,
    deleteUser,
    getDepartmentTargets,
    addDepartmentTarget,
    updateDepartmentTarget,
    deleteDepartmentTarget,
    getAnnualWorkPlans,
    addAnnualWorkPlan,
    updateAnnualWorkPlan,
    deleteAnnualWorkPlan,
    getAnnualPlans,
    addAnnualPlan,
    updateAnnualPlan,
    deleteAnnualPlan,
    getMajorEvents,
    addMajorEvent,
    updateMajorEvent,
    deleteMajorEvent,
    getMonthlyProgress,
    addMonthlyProgress,
    updateMonthlyProgress,
    deleteMonthlyProgress,
    getActionPlans,
    addActionPlan,
    updateActionPlan,
    deleteActionPlan,
    getTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTargetTypes,
    addTargetType,
    updateTargetType,
    deleteTargetType,
    getSystemSettings,
    addSystemSetting,
    updateSystemSetting,
    deleteSystemSetting,
    getNotifications,
    addNotification,
    updateNotification,
    deleteNotification,
    uploadFile,
    getCompanyInfo,
    updateCompanyInfo
    ,
    getIntegrationStatus,
    checkBackendHealth
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export default DataProvider
