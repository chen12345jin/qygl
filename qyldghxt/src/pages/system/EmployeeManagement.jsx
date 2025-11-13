import React, { useState, useEffect } from 'react'
import TableManager from '../../components/TableManager'
import { useData } from '../../contexts/DataContext'

const EmployeeManagement = () => {
  const { getEmployees, addEmployee, updateEmployee, deleteEmployee, getDepartments } = useData()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadEmployees()
    loadDepartments()
  }, [])

  const loadEmployees = async () => {
    const result = await getEmployees()
    if (result.success) {
      setEmployees(result.data || [])
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const handleAdd = async (data) => {
    const result = await addEmployee(data)
    if (result.success) {
      loadEmployees()
      return true
    } else {
      return false
    }
  }

  const handleEdit = async (id, data) => {
    const result = await updateEmployee(id, data)
    if (result.success) {
      loadEmployees()
      setEditingId(null)
      return true
    } else {
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteEmployee(id)
    if (result.success) {
      loadEmployees()
      return true
    } else {
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.name = `${newData.name}_副本`
    handleAdd(newData)
  }

  const columns = [
    { key: 'name', label: '姓名', required: true },
    { key: 'employee_id', label: '工号', required: true },
    { 
      key: 'department', 
      label: '部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.name, label: dept.name })),
      required: true
    },
    { key: 'position', label: '职位' },
    { key: 'phone', label: '电话' },
    { key: 'email', label: '邮箱' },
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      options: [
        { value: 'active', label: '在职' },
        { value: 'inactive', label: '离职' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value === 'active' ? '在职' : '离职'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">员工管理</h1>
        <p className="text-gray-600">管理企业员工信息和职位分配</p>
      </div>

      <TableManager
        title="员工列表"
        data={employees}
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

export default EmployeeManagement
