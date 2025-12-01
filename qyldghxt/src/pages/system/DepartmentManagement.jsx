import React, { useState, useEffect } from 'react'
import TableManager from '../../components/TableManager'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

const DepartmentManagement = () => {
  const { getDepartments, addDepartment, updateDepartment, deleteDepartment, syncDepartmentsFromDingTalk, getIntegrationStatus } = useData()
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [dingtalkEnabled, setDingtalkEnabled] = useState(true)

  useEffect(() => {
    loadDepartments()
    ;(async () => {
      const r = await getIntegrationStatus()
      if (r.success) {
        setDingtalkEnabled(Boolean(r.data?.dingtalkConfigured))
      }
    })()
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

  const handleSyncDingTalk = async () => {
    if (syncing) return
    setSyncing(true)
    const result = await syncDepartmentsFromDingTalk({ root_dept_id: 1 })
    if (result.success) {
      toast.success(`已同步${result.data?.count ?? 0}个部门`)
      await loadDepartments()
    } else {
      toast.error(result.error || '同步失败')
    }
    setSyncing(false)
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
      <PageHeaderBanner title="部门管理" subTitle="部门管理的年度工作落地规划" />

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
        headerActionsLeft={(
          <button
            onClick={handleSyncDingTalk}
            disabled={syncing || !dingtalkEnabled}
            className={`px-3 py-2 ${(syncing || !dingtalkEnabled) ? 'bg-gray-300' : 'bg-gradient-to-r from-green-500 to-emerald-600'} text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold`}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? '同步中...' : (dingtalkEnabled ? '同步钉钉部门' : '未配置钉钉')}</span>
          </button>
        )}
      />
    </div>
  )
}

export default DepartmentManagement
