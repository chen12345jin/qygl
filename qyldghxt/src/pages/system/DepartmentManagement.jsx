import React, { useState, useEffect } from 'react'
import TableManager from '../../components/TableManager'
import { useData } from '../../contexts/DataContext'

const DepartmentManagement = () => {
  const { getDepartments, addDepartment, updateDepartment, deleteDepartment } = useData()
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const handleAdd = async (data) => {
    const result = await addDepartment(data)
    if (result.success) {
      loadDepartments()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    const result = await updateDepartment(id, data)
    if (result.success) {
      loadDepartments()
      setEditingId(null)
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteDepartment(id)
    if (result.success) {
      loadDepartments()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.name = `${newData.name}_副本`
    // 避免部门编码重复导致创建失败，复制时生成新编码
    if (newData.code) {
      const stamp = Date.now().toString().slice(-4)
      newData.code = `${newData.code}_${stamp}`
    }
    handleAdd(newData)
  }

  const columns = [
    { key: 'name', label: '部门名称', required: true },
    { key: 'code', label: '部门编码', required: true },
    { key: 'manager', label: '部门负责人' },
    { key: 'phone', label: '联系电话' },
    { key: 'email', label: '邮箱' },
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      options: [
        { value: 'active', label: '启用' },
        { value: 'inactive', label: '禁用' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value === 'active' ? '启用' : '禁用'}
        </span>
      )
    },
    { key: 'description', label: '描述', type: 'textarea' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">部门管理</h1>
        <p className="text-gray-600">管理企业组织架构和部门信息</p>
      </div>

      <TableManager
        title="部门列表"
        data={departments}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
        editingId={editingId}
        onEditingChange={setEditingId}
      />
    </div>
  )
}

export default DepartmentManagement
