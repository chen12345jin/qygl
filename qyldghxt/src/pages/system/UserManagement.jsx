import React, { useState, useEffect } from 'react'
import { formatDateTime } from '../../utils/locale.js'
import { Plus, Edit, Trash2, Save, X, Shield, Eye, EyeOff } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import DeleteConfirmDialog from '../../components/DeleteConfirmDialog'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { toast } from 'react-hot-toast'

import Pagination from '../../components/Pagination'

const UserManagement = () => {
  const { getUsers, addUser, updateUser, deleteUser, getDepartments, getRoles } = useData()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, itemId: null, itemName: '' })
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '',
    department: '',
    status: '启用'
  })
  const [formErrors, setFormErrors] = useState({})

  const formatDate = (s) => {
    if (!s) return '从未登录'
    try {
      return formatDateTime(s)
    } catch (_) {
      return s
    }
  }

  // 加载用户数据、部门数据和角色数据
  useEffect(() => {
    loadUsers()
    loadDepartments()
    loadRoles()
  }, [])

  // 当数据变化导致当前页码超过最大页码时，自动跳转到最后一页
  useEffect(() => {
    const maxPage = Math.ceil(users.length / pageSize) || 1
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [users.length, pageSize])

  const loadUsers = async () => {
    try {
      const result = await getUsers()
      if (result.success) {
        setUsers(Array.isArray(result.data) ? result.data : [])
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
      setUsers([])
    }
  }

  const loadDepartments = async () => {
    try {
      const result = await getDepartments()
      if (result.success) {
        setDepartments(Array.isArray(result.data) ? result.data : [])
      }
    } catch (error) {
      console.error('加载部门数据失败:', error)
      setDepartments([])
    }
  }

  const loadRoles = async () => {
    try {
      const result = await getRoles()
      if (result.success) {
        setRoles(Array.isArray(result.data) ? result.data : [])
      }
    } catch (error) {
      console.error('加载角色数据失败:', error)
      setRoles([])
    }
  }

  const statusOptions = ['启用', '禁用']

  // 表单验证
  const validateForm = () => {
    const errors = {}
    if (!formData.username || formData.username.trim() === '') {
      errors.username = '必填'
    }
    if (!editingId) {
      if (!formData.password || formData.password.trim() === '') {
        errors.password = '必填'
      }
    }
    if (!formData.role || formData.role.trim() === '') {
      errors.role = '必填'
    }
    if (!formData.status || formData.status.trim() === '') {
      errors.status = '必填'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    const userData = {
      username: formData.username,
      role: formData.role,
      department: formData.department,
      status: formData.status,
      lastLogin: editingId ? users.find(u => u.id === editingId)?.lastLogin : '从未登录'
    }
    if (!editingId || (formData.password && formData.password.trim())) {
      userData.password = formData.password
    }
    
    if (editingId) {
      const result = await updateUser(editingId, userData)
      if (result.success) {
        await loadUsers()
        toast.success('用户更新成功')
        resetForm()
        return true
      } else {
        return false
      }
    } else {
      const result = await addUser(userData)
      if (result.success) {
        await loadUsers()
        toast.success('新增用户成功')
        resetForm()
        return true
      } else {
        return false
      }
    }
  }

  const resetForm = () => {
    setFormData({ username: '', password: '', role: '', department: '', status: '启用' })
    setFormErrors({})
    setIsEditing(false)
    setEditingId(null)
    setShowPassword(false)
  }

  const handleEdit = (user) => {
    let departmentValue = ''
    if (user.department) {
      const dept = departments.find(d => d.id === user.department || d.id === parseInt(user.department))
      departmentValue = dept ? dept.name : user.department
    }
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      department: departmentValue,
      status: user.status
    })
    setIsEditing(true)
    setEditingId(user.id)
  }

  const handleDelete = (user) => {
    setDeleteDialog({
      isOpen: true,
      itemId: user.id,
      itemName: user.username
    })
  }

  const confirmDelete = async () => {
    const result = await deleteUser(deleteDialog.itemId)
    if (result.success) {
      await loadUsers()
      toast.success('用户删除成功')
      setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
      return true
    } else {
      toast.error('用户删除失败')
      return false
    }
  }

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
  }

  const getStatusBadge = (status) => {
    // 兼容英文状态 active/inactive 和中文状态 启用/禁用
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

  // 获取部门名称
  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId || d.id === parseInt(deptId))
    return dept?.name || deptId || '-'
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeaderBanner title="用户管理" subTitle="管理系统用户账号" right={(
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>新增用户</span>
        </button>
      )} />

      {isEditing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="p-5 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
              <div className="font-semibold text-lg">{editingId ? '编辑用户' : '新增用户'}</div>
              <button onClick={resetForm} className="text-white/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-field-container">
                  <label className="form-field-label">
                    用户名<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="form-field-input-wrapper">
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({...formData, username: e.target.value})
                        if (formErrors.username && e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, username: undefined }))
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {formErrors.username && <span className="text-red-500 text-xs mt-1 block">{formErrors.username}</span>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">
                    密码<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="form-field-input-wrapper">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({...formData, password: e.target.value})
                          if (formErrors.password && e.target.value.trim()) {
                            setFormErrors(prev => ({ ...prev, password: undefined }))
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
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
                  {formErrors.password && <span className="text-red-500 text-xs mt-1 block">{formErrors.password}</span>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">
                    角色<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="form-field-input-wrapper">
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        setFormData({...formData, role: e.target.value})
                        if (formErrors.role && e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, role: undefined }))
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">请选择角色</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  {formErrors.role && <span className="text-red-500 text-xs mt-1 block">{formErrors.role}</span>}
                  <p className="text-xs text-gray-500 mt-1">角色权限在"角色管理"中配置</p>
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">
                    部门
                  </label>
                  <div className="form-field-input-wrapper">
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">请选择部门</option>
                      {departments.filter(d => !d.name.includes('公司')).map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">
                    状态<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="form-field-input-wrapper">
                    <select
                      value={formData.status}
                      onChange={(e) => {
                        setFormData({...formData, status: e.target.value})
                        if (formErrors.status && e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, status: undefined }))
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  {formErrors.status && <span className="text-red-500 text-xs mt-1 block">{formErrors.status}</span>}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg flex items-center space-x-2">
                  <Save size={18} />
                  <span>{editingId ? '更新' : '保存'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-purple-600">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">用户名</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">角色</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">部门</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">最后登录时间</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const start = (page - 1) * pageSize
                const end = start + pageSize
                const list = users.slice(start, end)
                return list.map((user) => (
                <tr key={user.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Shield size={16} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{getDepartmentName(user.department)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                      {getStatusText(user.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{formatDate(user.lastLogin)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-110 shadow-md"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-110 shadow-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              })()}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={users.length}
            onChange={({ page: p, pageSize: s }) => { setPage(p); setPageSize(s) }}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">提示：</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <div>• 用户的功能权限由所属角色决定，请在<strong>「角色管理」</strong>中配置角色权限</div>
            <div>• 用户选择角色后，将自动继承该角色的所有权限</div>
          </div>
        </div>

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        itemName={deleteDialog.itemName}
        itemType="用户"
        onConfirm={confirmDelete}
        onClose={cancelDelete}
        />
    </div>
  )
}

export default UserManagement
