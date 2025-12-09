import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Shield, Eye, EyeOff } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import DeleteConfirmDialog from '../../components/DeleteConfirmDialog'
import PageHeaderBanner from '../../components/PageHeaderBanner'

const UserManagement = () => {
  const { getUsers, addUser, updateUser, deleteUser } = useData()
  const [users, setUsers] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, itemId: null, itemName: '' })
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '',
    status: '启用'
  })

  const formatDate = (s) => {
    if (!s) return '从未登录'
    try {
      const d = new Date(s)
      if (isNaN(d.getTime())) return s
      return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch (_) {
      return s
    }
  }

  // 加载用户数据
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const result = await getUsers()
      if (result.success) {
        setUsers(result.data || [])
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
      setUsers([])
    }
  }

  const roles = ['管理员', '普通用户', '审核员', '操作员']
  const statusOptions = ['启用', '禁用']

  const handleSubmit = async (e) => {
    e.preventDefault()
    const userData = {
      ...formData,
      lastLogin: editingId ? users.find(u => u.id === editingId)?.lastLogin : '从未登录'
    }
    
    if (editingId) {
      const result = await updateUser(editingId, userData)
      if (result.success) {
        await loadUsers()
        resetForm()
        return true
      } else {
        return false
      }
    } else {
      const result = await addUser(userData)
      if (result.success) {
        await loadUsers()
        resetForm()
        return true
      } else {
        return false
      }
    }
  }

  const resetForm = () => {
    setFormData({ username: '', password: '', role: '', status: '启用' })
    setIsEditing(false)
    setEditingId(null)
    setShowPassword(false)
  }

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      password: user.password,
      role: user.role,
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
      setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
      return true
    } else {
      return false
    }
  }

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
  }

  const getStatusBadge = (status) => {
    return status === '启用' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
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

  return (
    <div className="space-y-6 p-6">
      <PageHeaderBanner title="用户权限" subTitle="用户权限的年度工作落地规划" right={(
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>新增用户</span>
        </button>
      )} />

      {isEditing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
              <div className="font-semibold text-lg">{editingId ? '编辑用户' : '新增用户'}</div>
              <button onClick={resetForm} className="text-white/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-10"
                    required
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
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  角色 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">请选择角色</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  状态 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
              <div className="flex justify-end space-x-3 mt-6">
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">最后登录时间</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                      {user.status}
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">权限说明：</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <div><strong>管理员：</strong>拥有所有权限，可以管理用户、修改系统设置</div>
            <div><strong>审核员：</strong>可以审核和批准计划、查看所有数据</div>
            <div><strong>操作员：</strong>可以添加和编辑计划数据</div>
            <div><strong>普通用户：</strong>只能查看分配给自己的数据</div>
          </div>
        </div>

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        itemName={deleteDialog.itemName}
        itemType="用户"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        />
    </div>
  )
}

export default UserManagement
