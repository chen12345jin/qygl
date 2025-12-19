import React, { useState, useEffect, useMemo } from 'react'
import { formatDateTime } from '../../utils/locale.js'
import { Shield, Eye, EyeOff, Filter, RefreshCcw } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import TableManager from '../../components/TableManager'
import toast from 'react-hot-toast'
import { getLeafDepartments, getBusinessDepartments, getDescendantDepartmentNames } from '../../utils/orgSync'

const UserManagement = () => {
  const { getUsers, addUser, updateUser, deleteUser, getDepartments, getRoles } = useData()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  const [editingId, setEditingId] = useState(null)
  
  // Custom state for password visibility in the form
  const [showPassword, setShowPassword] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState({
    username: '',
    role: '',
    department: '',
    status: ''
  })
  const [filterOpen, setFilterOpen] = useState(false)
  
  // Get filter count for badge
  const filterCount = Object.values(filters).filter(Boolean).length
  
  // Reset filters function
  const resetFilters = () => {
    setFilters({
      username: '',
      role: '',
      department: '',
      status: ''
    })
    setFilterOpen(false)
    toast.success('已重置筛选')
  }

  // Reset showPassword when form opens/closes
  useEffect(() => {
    if (!editingId) setShowPassword(false)
  }, [editingId])

  const loadData = async () => {
    const [usersRes, deptsRes, rolesRes] = await Promise.all([
      getUsers(),
      getDepartments(),
      getRoles()
    ])
    
    if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
    if (deptsRes.success) setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : [])
    if (rolesRes.success) setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAdd = async (data) => {
    // Password validation for Add
    if (!data.password || !data.password.trim()) {
      toast.error('密码不能为空')
      return false
    }

    const userData = {
      username: data.username,
      password: data.password,
      role: data.role,
      department: data.department,
      status: data.status,
      lastLogin: '从未登录'
    }

    const result = await addUser(userData)
    if (result.success) {
      await loadData()
      return true
    }
    return false
  }

  const handleEdit = async (id, data) => {
    const originalUser = users.find(u => u.id === id)
    const userData = {
      username: data.username,
      role: data.role,
      department: data.department,
      status: data.status,
      lastLogin: originalUser?.lastLogin || '从未登录'
    }
    
    // Only update password if provided
    if (data.password && data.password.trim()) {
      userData.password = data.password
    }

    const result = await updateUser(id, userData)
    if (result.success) {
      await loadData()
      setEditingId(null)
      return true
    }
    return false
  }

  const handleDelete = async (id) => {
    const result = await deleteUser(id)
    if (result.success) {
      await loadData()
      return true
    }
    return false
  }

  const getStatusBadge = (status) => {
    const isSuccess = status === '启用' || status === 'active'
    return isSuccess
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  }

  const getStatusText = (status) => {
    if (status === 'active') return '启用'
    if (status === 'inactive') return '禁用'
    return status
  }

  const getRoleBadge = (role) => {
    const colors = {
      '管理员': 'bg-purple-100 text-purple-800',
      '普通用户': 'bg-blue-100 text-blue-800',
      '审核员': 'bg-orange-100 text-orange-800',
      '操作员': 'bg-gray-100 text-gray-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (s) => {
    if (!s) return '从未登录'
    try {
      return formatDateTime(s)
    } catch (_) {
      return s
    }
  }
  
  // Filter users based on search criteria
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) return false
      if (filters.role && user.role !== filters.role) return false
      if (filters.department) {
        const names = getDescendantDepartmentNames(departments, filters.department)
        if (names.length > 0 && !names.includes(user.department)) return false
      }
      if (filters.status && user.status !== filters.status) return false
      return true
    })
  }, [users, filters, departments])

  const columns = useMemo(() => [
    { 
      key: 'username', 
      label: '用户名', 
      required: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Shield size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">{value}</span>
        </div>
      )
    },
    { 
      key: 'password', 
      label: '密码', 
      type: 'custom',
      // Only required when adding
      required: !editingId,
      customField: ({ value, onChange, error }) => (
        <div className="form-field-input-wrapper">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 pr-10 focus:outline-none ${error ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
              placeholder={editingId ? '留空保持不变' : '请输入密码'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      ),
      // Hide from table view
      render: () => null,
      headerClassName: 'hidden',
      cellClassName: 'hidden' // This assumes TableManager supports hiding columns in list view via hidden logic or we filter it out. 
      // Actually TableManager displays all columns. I need to make sure password column is NOT displayed in the table list.
      // TableManager doesn't have explicit "hideInTable" prop but I can handle it.
      // Wait, TableManager iterates columns to render table headers.
      // If I want to hide it from table, I should probably filter it out in the "displayColumns" logic inside TableManager or just not include it in columns passed to TableManager?
      // But TableManager uses the SAME columns for Form and Table.
      // I need to check TableManager implementation again.
    },
    { 
      key: 'role', 
      label: '角色', 
      type: 'select',
      required: true,
      options: roles.map(r => ({ value: r.name, label: r.name })),
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(value)}`}>
          {value}
        </span>
      ),
      hint: '角色权限在"角色管理"中配置'
    },
    { 
      key: 'department', 
      label: '部门', 
      type: 'select',
      options: getLeafDepartments(departments).map(dept => ({ value: dept.name, label: dept.name })),
      render: (value) => {
        // If value is ID, find name
        const dept = departments.find(d => d.id === value || d.name === value)
        return <span className="text-sm text-gray-600">{dept ? dept.name : value || '-'}</span>
      }
    },
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      required: true,
      options: [
        { value: '启用', label: '启用' },
        { value: '禁用', label: '禁用' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(value)}`}>
          {getStatusText(value)}
        </span>
      )
    },
    { 
      key: 'lastLogin', 
      label: '最后登录时间', 
      disabled: true, // Not editable
      render: (value) => <span className="text-sm font-semibold text-gray-800">{formatDate(value)}</span>
    }
  ], [roles, departments, editingId, showPassword, users])

  // Filter columns for table display (exclude password)
  // But TableManager takes `columns` prop for both.
  // I'll modify TableManager to support `hideInTable` prop or just rely on the new Column Selector feature to hide it by default?
  // No, password should NEVER be shown in table.
  // I will check TableManager again.
  
  return (
    <div className="space-y-6">
      <PageHeaderBanner title="用户管理" subTitle="管理系统用户账号" />
      <div className="unified-table-wrapper">
        {filterOpen && (
          <div className="card p-6 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="filter-username" className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  id="filter-username"
                  type="text"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  placeholder="输入用户名..."
                  value={filters.username}
                  onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="filter-role" className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  id="filter-role"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                >
                  <option value="">全部角色</option>
                  {roles.map(role => (
                    <option key={role.name} value={role.name}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-department" className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <select
                  id="filter-department"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                  <option value="">全部部门</option>
                  {getBusinessDepartments(departments).map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  id="filter-status"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">全部状态</option>
                  <option value="启用">启用</option>
                  <option value="禁用">禁用</option>
                </select>
              </div>
            </div>
          </div>
        )}
        <TableManager
          title="用户列表"
          data={filteredUsers}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          editingId={editingId}
          onEditingChange={setEditingId}
          tableClassName="unified-data-table"
          tableContainerClassName="unified-table-scroll"
          hiddenColumns={['password']}
          pagination={{
            page: 1,
            pageSize: 10,
            total: filteredUsers.length,
            onChange: () => {}
          }}
          prefill={{ status: '启用' }}
          headerActionsLeft={
            <div className="flex space-x-2">
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
                className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold ${!filterCount ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={resetFilters}
                disabled={!filterCount}
                title="重置筛选"
              >
                <RefreshCcw size={16} />
                <span>重置</span>
              </button>
            </div>
          }
        />
      </div>
    </div>
  )
}

export default UserManagement
