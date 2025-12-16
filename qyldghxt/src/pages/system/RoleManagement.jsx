import React, { useState, useEffect } from 'react'
import { formatDateTime } from '../../utils/locale.js'
import { Plus, Edit, Trash2, Save, X, Shield, Lock, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import DeleteConfirmDialog from '../../components/DeleteConfirmDialog'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import toast from 'react-hot-toast'

// 权限名称映射 - 用于将路由权限名称映射到权限配置key
const PERMISSION_NAME_MAP = {
  '数据查看': ['dashboard', 'department_targets', 'annual_planning', 'annual_planning_chart', 'annual_work_plan', 'major_events', 'monthly_progress', 'action_plans', 'data_analysis', 'notifications', 'profile'],
  '系统管理': ['company_info', 'department_management', 'employee_management', 'org_structure', 'role_management', 'system_logs', 'template_settings', 'system_settings', 'notification_management', 'dingtalk_config'],
  '用户管理': ['user_management']
}

// 权限配置 - 按分类组织（完整的系统页面权限）
const PERMISSION_CONFIG = {
  core: {
    label: '核心功能',
    color: 'blue',
    permissions: [
      { key: 'dashboard', label: '首页概览' },
      { key: 'department_targets', label: '部门目标分解' },
      { key: 'annual_planning', label: '年度规划表' },
      { key: 'annual_planning_chart', label: '年度规划图表' },
      { key: 'annual_work_plan', label: '年度工作规划' },
      { key: 'major_events', label: '大事件提炼' },
      { key: 'monthly_progress', label: '月度推进计划' },
      { key: 'action_plans', label: '5W2H行动计划' },
      { key: 'data_analysis', label: '数据分析' },
      { key: 'notifications', label: '通知管理' },
      { key: 'profile', label: '个人资料' }
    ]
  },
  system: {
    label: '系统管理',
    color: 'purple',
    permissions: [
      { key: 'admin', label: '管理员权限（所有功能）' },
      { key: 'company_info', label: '公司信息' },
      { key: 'department_management', label: '部门管理' },
      { key: 'employee_management', label: '员工管理' },
      { key: 'org_structure', label: '组织架构' },
      { key: 'role_management', label: '角色管理' },
      { key: 'user_management', label: '用户管理' },
      { key: 'system_logs', label: '系统日志' },
      { key: 'template_settings', label: '模板设置' },
      { key: 'system_settings', label: '系统设置' },
      { key: 'notification_management', label: '通知管理' },
      { key: 'dingtalk_config', label: '钉钉配置' }
    ]
  },
  data: {
    label: '数据权限',
    color: 'green',
    permissions: [
      { key: 'data_export', label: '数据导出' },
      { key: 'data_import', label: '数据导入' },
      { key: 'view_reports', label: '查看报表' },
      { key: 'print_data', label: '打印功能' }
    ]
  }
}

// 获取所有权限的key列表
const getAllPermissionKeys = () => {
  const keys = []
  Object.values(PERMISSION_CONFIG).forEach(category => {
    category.permissions.forEach(p => keys.push(p.key))
  })
  return keys
}

const RoleManagement = () => {
  const { getRoles, addRole, updateRole, deleteRole, getUsers } = useData()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, itemId: null, itemName: '' })
  const [expandedCategories, setExpandedCategories] = useState(['core', 'system', 'data'])
  const [formErrors, setFormErrors] = useState({})
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    permissions: []
  })

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const result = await getRoles()
      if (result.success) {
        setRoles(Array.isArray(result.data) ? result.data : [])
      }
    } catch (error) {
      console.error('加载角色失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 表单验证
  const validateForm = () => {
    const errors = {}
    if (!formData.name || formData.name.trim() === '') {
      errors.name = '必填'
    }
    if (!formData.code || formData.code.trim() === '') {
      errors.code = '必填'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    if (editingId) {
      const result = await updateRole(editingId, formData)
      if (result.success) {
        await loadRoles()
        toast.success('角色更新成功')
        resetForm()
      }
    } else {
      const result = await addRole(formData)
      if (result.success) {
        await loadRoles()
        toast.success('新增角色成功')
        resetForm()
      }
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '', permissions: [] })
    setFormErrors({})
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (role) => {
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
      permissions: role.permissions || []
    })
    setEditingId(role.id)
    setIsEditing(true)
  }

  const handleDelete = async () => {
    try {
      // 获取当前要删除的角色
      const roleToDelete = roles.find(role => role.id === deleteDialog.itemId)
      if (!roleToDelete) {
        toast.error('未找到要删除的角色')
        return
      }

      // 检查是否有用户关联该角色
      const usersResult = await getUsers()
      const users = usersResult?.data || usersResult || []
      
      // 检查是否有用户关联该角色
      const relatedUsers = users.filter(user => {
        const userRole = user.role || ''
        const roleName = roleToDelete.name || ''
        return userRole === roleName
      })

      if (relatedUsers.length > 0) {
        // 有用户关联，阻止删除
        toast.error(`角色 "${roleToDelete.name}" 已被 ${relatedUsers.length} 个用户使用，无法删除。请先修改这些用户的角色。`)
        return
      }
      
      // 没有用户关联，执行删除
      toast.loading('正在删除角色...')
      const result = await deleteRole(deleteDialog.itemId)
      toast.dismiss()

      if (result.success) {
        toast.success(`角色 "${roleToDelete.name}" 删除成功`)
        await loadRoles()
        setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
      } else {
        // 显示具体的错误信息
        toast.error(result.error || '删除角色失败，请重试。')
        console.error('删除角色失败:', result.error)
      }
    } catch (error) {
      toast.dismiss()
      console.error('删除角色失败:', error)
      toast.error('删除角色失败，请重试。')
    }
  }

  // 切换单个权限
  const togglePermission = (permKey) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey]
    }))
  }

  // 切换分类下所有权限
  const toggleCategoryPermissions = (categoryKey) => {
    const category = PERMISSION_CONFIG[categoryKey]
    const categoryPermKeys = category.permissions.map(p => p.key)
    const allSelected = categoryPermKeys.every(k => formData.permissions.includes(k))
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermKeys.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermKeys])]
    }))
  }

  // 展开/折叠分类
  const toggleExpandCategory = (categoryKey) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(c => c !== categoryKey)
        : [...prev, categoryKey]
    )
  }

  // 全选所有权限
  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: getAllPermissionKeys()
    }))
  }

  // 清空所有权限
  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }))
  }

  // 获取权限数量显示
  const getPermissionCount = (permissions = []) => {
    const total = getAllPermissionKeys().length
    return `${permissions.length}/${total}`
  }

  // 获取权限标签显示（最多显示几个）
  const getPermissionLabels = (permissions = []) => {
    if (!permissions.length) return []
    
    const allPerms = []
    Object.values(PERMISSION_CONFIG).forEach(cat => {
      cat.permissions.forEach(p => {
        if (permissions.includes(p.key)) {
          allPerms.push(p.label)
        }
      })
    })
    return allPerms
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeaderBanner 
        title="角色管理" 
        subTitle="配置系统角色及对应的功能权限"
        right={(
          <button
            onClick={() => { resetForm(); setIsEditing(true) }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>新增角色</span>
          </button>
        )}
      />

      {/* 角色列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-purple-600">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">角色名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">权限编码</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">描述</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">权限数量</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">包含权限</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                          <Shield size={16} />
                        </div>
                        <span className="font-medium text-gray-900">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {role.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {role.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {getPermissionCount(role.permissions)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {getPermissionLabels(role.permissions).slice(0, 5).map(label => (
                          <span key={label} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {label}
                          </span>
                        ))}
                        {getPermissionLabels(role.permissions).length > 5 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            +{getPermissionLabels(role.permissions).length - 5}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleEdit(role)}
                          className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-110 shadow-md"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteDialog({ isOpen: true, itemId: role.id, itemName: role.name })}
                          className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-110 shadow-md"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    暂无角色数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden my-8">
            <div className="p-5 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-lg font-bold">
                {editingId ? '编辑角色' : '新增角色'}
              </h2>
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
              {/* 基本信息 */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <Shield size={18} className="mr-2 text-blue-500" />
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-field-container">
                    <label className="form-field-label">
                      角色名称<span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="form-field-input-wrapper">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({...formData, name: e.target.value})
                          if (formErrors.name && e.target.value.trim()) {
                            setFormErrors(prev => ({ ...prev, name: undefined }))
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="如：系统管理员"
                      />
                    </div>
                    {formErrors.name && <span className="text-red-500 text-xs mt-1 block">{formErrors.name}</span>}
                  </div>
                  <div className="form-field-container">
                    <label className="form-field-label">
                      权限编码<span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="form-field-input-wrapper">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => {
                          setFormData({...formData, code: e.target.value})
                          if (formErrors.code && e.target.value.trim()) {
                            setFormErrors(prev => ({ ...prev, code: undefined }))
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="如：admin"
                      />
                    </div>
                    {formErrors.code && <span className="text-red-500 text-xs mt-1 block">{formErrors.code}</span>}
                  </div>
                  <div className="form-field-container md:col-span-2">
                    <label className="form-field-label">
                      描述
                    </label>
                    <div className="form-field-input-wrapper">
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
                        placeholder="角色职责描述..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 权限配置 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-800 flex items-center">
                    <Lock size={18} className="mr-2 text-purple-500" />
                    权限配置
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      (已选 {formData.permissions.length} / {getAllPermissionKeys().length} 项)
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      清空
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(PERMISSION_CONFIG).map(([categoryKey, category]) => {
                    const categoryPermKeys = category.permissions.map(p => p.key)
                    const selectedCount = categoryPermKeys.filter(k => formData.permissions.includes(k)).length
                    const allSelected = selectedCount === categoryPermKeys.length
                    const someSelected = selectedCount > 0 && selectedCount < categoryPermKeys.length
                    const isExpanded = expandedCategories.includes(categoryKey)

                    const colorMap = {
                      blue: { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-100', text: 'text-blue-700', checkbox: 'text-blue-600' },
                      purple: { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100', text: 'text-purple-700', checkbox: 'text-purple-600' },
                      green: { bg: 'bg-green-50', border: 'border-green-200', header: 'bg-green-100', text: 'text-green-700', checkbox: 'text-green-600' }
                    }
                    const colors = colorMap[category.color] || colorMap.blue

                    return (
                      <div key={categoryKey} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                        {/* 分类头部 */}
                        <div 
                          className={`${colors.header} px-4 py-3 flex items-center justify-between cursor-pointer`}
                          onClick={() => toggleExpandCategory(categoryKey)}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown size={18} className={colors.text} /> : <ChevronRight size={18} className={colors.text} />}
                            <span className={`font-semibold ${colors.text}`}>{category.label}</span>
                            <span className={`text-xs ${colors.text} opacity-70`}>
                              ({selectedCount}/{categoryPermKeys.length})
                            </span>
                          </div>
                          <label 
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={el => { if (el) el.indeterminate = someSelected }}
                              onChange={() => toggleCategoryPermissions(categoryKey)}
                              className={`w-4 h-4 rounded border-gray-300 ${colors.checkbox} focus:ring-2 focus:ring-offset-0`}
                            />
                            <span className={`text-sm ${colors.text}`}>全选</span>
                          </label>
                        </div>

                        {/* 权限列表 */}
                        {isExpanded && (
                          <div className={`${colors.bg} px-4 py-3`}>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                              {category.permissions.map(perm => {
                                const isChecked = formData.permissions.includes(perm.key)
                                return (
                                  <label
                                    key={perm.key}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                      isChecked 
                                        ? 'bg-white shadow-sm border border-gray-200' 
                                        : 'hover:bg-white/50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(perm.key)}
                                      className={`w-4 h-4 rounded border-gray-300 ${colors.checkbox} focus:ring-2 focus:ring-offset-0`}
                                    />
                                    <span className={`text-sm ${isChecked ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                                      {perm.label}
                                    </span>
                                    {isChecked && <Check size={14} className={colors.checkbox} />}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Save size={18} />
                  <span>{editingId ? '保存修改' : '立即创建'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={handleDelete}
        title="删除角色"
        message={`确定要删除角色 "${deleteDialog.itemName}" 吗？此操作无法撤销，且可能影响关联用户。`}
      />
    </div>
  )
}

export default RoleManagement
