import React, { useState, useEffect } from 'react'
import TableManager from '../../components/TableManager'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'

const EmployeeManagement = () => {
  const { getEmployees, addEmployee, updateEmployee, deleteEmployee, getDepartments, getDingTalkEmployees, syncEmployeesFromDingTalk, getIntegrationStatus, getSystemSettings } = useData()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const { user, checkPermission } = useAuth()
  const isAdmin = (user?.role === 'admin') || checkPermission('admin')
  const [dingtalkEnabled, setDingtalkEnabled] = useState(true)

  useEffect(() => {
    loadEmployees()
    loadDepartments()
    ;(async () => {
      const r = await getIntegrationStatus()
      if (r.success) {
        let enabled = Boolean(r.data?.dingtalkConfigured)
        if (!enabled) {
          const s = await getSystemSettings()
          if (s.success && Array.isArray(s.data)) {
            const rec = s.data.find(it => it.key === 'integration')
            const v = rec?.value || {}
            const hasKeys = Boolean(String(v.dingtalkAppKey || '').trim()) && Boolean(String(v.dingtalkAppSecret || '').trim())
            enabled = Boolean(v.dingtalkEnabled) && hasKeys
          }
        }
        setDingtalkEnabled(enabled)
      }
    })()
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

  const syncFromDingTalk = async () => {
    try {
      const result = await syncEmployeesFromDingTalk({ all: true })
      if (result.success) {
        await loadEmployees()
        toast.success(`已全量同步${result.data?.count ?? 0}名员工到数据库`)
      } else {
        toast.error(result.error || '同步钉钉员工失败')
      }
    } catch (e) {
      toast.error('同步钉钉员工失败')
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
      <PageHeaderBanner title="员工管理" subTitle="员工管理的年度工作落地规划" />

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
        showActions={isAdmin}
        headerActionsLeft={isAdmin ? (
          <button
            onClick={syncFromDingTalk}
            disabled={!dingtalkEnabled}
            className={`px-3 py-2 ${!dingtalkEnabled ? 'bg-gray-300' : 'bg-gradient-to-r from-emerald-500 to-teal-600'} text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold mr-3`}
          >
            <span>{dingtalkEnabled ? '同步钉钉员工' : '未配置钉钉'}</span>
          </button>
        ) : null}
      />
    </div>
  )
}

export default EmployeeManagement
