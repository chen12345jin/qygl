import React, { useState, useEffect, useMemo } from 'react'
import { Shield, Edit, Trash2, Save, X, Lock, Check, ChevronDown, ChevronRight, Plus, Filter, RefreshCcw } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import TableManager from '../../components/TableManager'
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
  const [editingId, setEditingId] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState(['core', 'system', 'data'])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    name: '',
    code: ''
  })

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    const result = await getRoles()
    if (result.success) {
      setRoles(Array.isArray(result.data) ? result.data : [])
    }
  }

  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      if (filters.name && !role.name.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.code && !role.code.toLowerCase().includes(filters.code.toLowerCase())) return false
      return true
    })
  }, [roles, filters])

  const getFilterCount = () => {
    let count = 0
    if (filters.name) count++
    if (filters.code) count++
    return count
  }
  const filterCount = getFilterCount()

  const resetFilters = () => {
    setFilters({
      name: '',
      code: ''
    })
    toast.success('已重置筛选')
  }

  const handleAdd = async (data) => {
    const result = await addRole({
      name: data.name,
      code: data.code,
      description: data.description || '',
      permissions: data.permissions || []
    })
    if (result.success) {
      await loadRoles()
      return true
    }
    return false
  }

  const handleEdit = async (id, data) => {
    const result = await updateRole(id, {
      name: data.name,
      code: data.code,
      description: data.description || '',
      permissions: data.permissions || []
    })
    if (result.success) {
      await loadRoles()
      setEditingId(null)
      return true
    }
    return false
  }

  const handleDelete = async (id) => {
    // 获取当前要删除的角色
    const roleToDelete = roles.find(role => role.id === id)
    if (!roleToDelete) {
      toast.error('未找到要删除的角色')
      return false
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
      return false
    }
    
    // 没有用户关联，执行删除
    const result = await deleteRole(id)

    if (result.success) {
      await loadRoles()
      return true
    } else {
      // 显示具体的错误信息
      toast.error(result.error || '删除角色失败，请重试。')
      return false
    }
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

  const toggleExpandCategory = (categoryKey) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey)
        ? prev.filter(c => c !== categoryKey)
        : [...prev, categoryKey]
    )
  }

  const columns = useMemo(() => [
    { 
      key: 'name', 
      label: '角色名称', 
      required: true,
      render: (value) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
            <Shield size={16} />
          </div>
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      )
    },
    { 
      key: 'code', 
      label: '权限编码', 
      required: true,
      render: (value) => <span className="font-mono text-gray-500">{value}</span>
    },
    { 
      key: 'description', 
      label: '描述', 
      type: 'textarea',
      render: (value) => <span className="text-gray-500">{value || '-'}</span>
    },
    {
      key: 'permission_count',
      label: '权限数量',
      type: 'custom',
      render: (_, item) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          {getPermissionCount(item.permissions)}
        </span>
      ),
      // Not a form field
      customField: null,
      disabled: true,
      hideInForm: true
    },
    {
      key: 'permissions',
      label: '权限配置',
      type: 'custom',
      render: (value) => (
        <div className="flex flex-wrap gap-1 max-w-md">
          {getPermissionLabels(value || []).slice(0, 5).map(label => (
            <span key={label} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {label}
            </span>
          ))}
          {getPermissionLabels(value || []).length > 5 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              +{getPermissionLabels(value || []).length - 5}
            </span>
          )}
        </div>
      ),
      customField: ({ value, onChange }) => {
        const permissions = value || []
        
        // 切换单个权限
        const togglePermission = (permKey) => {
          onChange(
            permissions.includes(permKey)
              ? permissions.filter(p => p !== permKey)
              : [...permissions, permKey]
          )
        }

        // 切换分类下所有权限
        const toggleCategoryPermissions = (categoryKey) => {
          const category = PERMISSION_CONFIG[categoryKey]
          const categoryPermKeys = category.permissions.map(p => p.key)
          const allSelected = categoryPermKeys.every(k => permissions.includes(k))
          
          onChange(
            allSelected
              ? permissions.filter(p => !categoryPermKeys.includes(p))
              : [...new Set([...permissions, ...categoryPermKeys])]
          )
        }

        // 全选所有权限
        const selectAllPermissions = () => {
          onChange(getAllPermissionKeys())
        }

        // 清空所有权限
        const clearAllPermissions = () => {
          onChange([])
        }

        return (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 flex items-center">
                <Lock size={18} className="mr-2 text-purple-500" />
                权限列表
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (已选 {permissions.length} / {getAllPermissionKeys().length} 项)
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
                const selectedCount = categoryPermKeys.filter(k => permissions.includes(k)).length
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
                            const isChecked = permissions.includes(perm.key)
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
        )
      }
    }
  ], [expandedCategories])

  return (
    <div className="space-y-6">
      <PageHeaderBanner title="角色管理" subTitle="配置系统角色及对应的功能权限" />
      <div className="unified-table-wrapper">
        <TableManager
          title="角色列表"
          data={filteredRoles}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          editingId={editingId}
          onEditingChange={setEditingId}
          tableClassName="unified-data-table"
          tableContainerClassName="unified-table-scroll"
          pagination={{
            page: 1,
            pageSize: 10,
            total: filteredRoles.length,
            onChange: () => {} 
          }}
          addTheme="from-blue-600 to-purple-600"
          addMode="modal"
          addHeader="新增角色"
          editHeader="编辑角色"
          headerActionsLeft={(
            <div className="flex flex-wrap items-center gap-2 mr-2">
              <button
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold relative"
                onClick={() => setFilterOpen(v => !v)}
                title="筛选"
              >
                <Filter size={16} />
                <span>筛选</span>
                {filterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white">
                    {filterCount}
                  </span>
                )}
              </button>
              <button
                className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold ${!(filters.name || filters.code) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={resetFilters}
                disabled={!(filters.name || filters.code)}
                title="重置筛选"
              >
                <RefreshCcw size={16} />
                <span>重置</span>
              </button>
            </div>
          )}
          // We don't want to show permission_count in the form, it's a computed column
          // TableManager will hide it if it doesn't have customField and type='custom' but has render?
          // No, TableManager renders all columns in form unless disabled?
          // I added disabled: true to permission_count. 
          // And permission_count type is 'custom' but customField is null.
          // In TableManager renderForm:
          // if (column.type === 'custom' && column.customField) -> render customField
          // else render FormField
          // So if customField is null, it renders FormField?
          // Yes. And FormField disabled=true.
          // But I don't want it in the form at all.
          // I should add `hiddenInForm: true` to TableManager logic?
          // Or just use a simpler trick: use `hiddenColumns` in form?
          // TableManager doesn't support hiddenColumns in form yet.
          // But wait, permission_count has `type: 'custom'` and `customField: null`.
          // TableManager code:
          // if (column.type === 'custom' && column.customField) { ... }
          // // 否则使用默认的 FormField
          // return <FormField ... />
          // So it will render a FormField.
          // I want to hide it.
          // I can update TableManager to support `hideInForm`.
        >
          {filterOpen && (
            <div className="card p-6 mb-4">
              <div className="flex items-center justify-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Filter size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-gray-800">筛选条件</div>
                    <div className="text-xs text-gray-500">选择维度以过滤列表</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
                  <input
                    id="filter-name"
                    type="text"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                    placeholder="输入角色名称..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="filter-code" className="block text-sm font-medium text-gray-700 mb-1">权限编码</label>
                  <input
                    id="filter-code"
                    type="text"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                    placeholder="输入权限编码..."
                    value={filters.code}
                    onChange={(e) => setFilters({ ...filters, code: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </TableManager>
      </div>
    </div>
  )
}

export default RoleManagement
