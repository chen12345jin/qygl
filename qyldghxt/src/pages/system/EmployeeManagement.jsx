import React, { useState, useEffect, useMemo } from 'react'
import TableManager from '../../components/TableManager'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { Filter, RefreshCcw, RefreshCw } from 'lucide-react'
import { getLeafDepartments, getBusinessDepartments, getDescendantDepartmentNames } from '../../utils/orgSync'
import OrgDepartmentSelect from '../../components/OrgDepartmentSelect'

const EmployeeManagement = () => {
  const { getEmployees, addEmployee, updateEmployee, deleteEmployee, getDepartments, getDingTalkEmployees, syncEmployeesFromDingTalk, getIntegrationStatus, getSystemSettings } = useData()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const { user, checkPermission } = useAuth()
  const isAdmin = (user?.role === 'admin') || checkPermission('admin')
  const [dingtalkEnabled, setDingtalkEnabled] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    name: '',
    department: '',
    status: ''
  })
  const [syncing, setSyncing] = useState(false)

  // 当数据变化导致当前页码超过最大页码时，自动跳转到最后一页
  useEffect(() => {
    const maxPage = Math.ceil(employees.length / pageSize) || 1
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [employees.length, pageSize])

  useEffect(() => {
    setPage(1)
  }, [filters])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEmployees = async () => {
    const result = await getEmployees()
    if (result.success) {
      setEmployees(result.data || [])
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments({ type: 'DEPT' })
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (filters.name && !e.name.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.department) {
        const names = getDescendantDepartmentNames(departments, filters.department)
        if (names.length > 0 && !names.includes(e.department)) return false
      }
      if (filters.status && e.status !== filters.status) return false
      return true
    })
  }, [employees, filters, departments])

  const getFilterCount = () => {
    let count = 0
    if (filters.name) count++
    if (filters.department) count++
    if (filters.status) count++
    return count
  }
  const filterCount = getFilterCount()

  const resetFilters = () => {
    setFilters({
      name: '',
      department: '',
      status: ''
    })
    setPage(1)
    toast.success('已重置筛选')
  }

  const syncFromDingTalk = async () => {
    try {
      setSyncing(true)
      const result = await syncEmployeesFromDingTalk({ all: true })
      if (result.success) {
        await loadEmployees()
        toast.success(`已全量同步${result.data?.count ?? 0}名员工到数据库`)
      } else {
        toast.error(result.error || '同步钉钉员工失败')
      }
    } catch (e) {
      toast.error('同步钉钉员工失败')
    } finally {
      setSyncing(false)
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
      type: 'custom',
      required: true,
      customField: ({ value, onChange, formData, setFormData }) => (
        <OrgDepartmentSelect
          value={formData.department || ''}
          onChange={(v) => {
            const next = { ...formData, department: v }
            setFormData(next)
            if (onChange) onChange(v)
          }}
          placeholder="请选择部门"
          leafOnly
        />
      )
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

      <div className="unified-table-wrapper">
        <TableManager
          title="员工列表"
          data={filteredEmployees}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          editingId={editingId}
          onEditingChange={setEditingId}
          tableClassName="unified-data-table"
          tableContainerClassName="unified-table-scroll"
          pagination={{
            page,
            pageSize,
            total: filteredEmployees.length,
            onChange: ({ page: p, pageSize: s }) => {
              setPage(p)
              setPageSize(s)
            }
          }}
          showActions={isAdmin}
          headerActionsLeft={isAdmin ? (
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
                className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold ${!(filters.name || filters.department || filters.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={resetFilters}
                disabled={!(filters.name || filters.department || filters.status)}
                title="重置筛选"
              >
                <RefreshCcw size={16} />
                <span>重置</span>
              </button>
              <button
                onClick={syncFromDingTalk}
                disabled={syncing || !dingtalkEnabled}
                className={`px-3 py-2 ${(syncing || !dingtalkEnabled) ? 'bg-gray-300' : 'bg-gradient-to-r from-emerald-500 to-teal-600'} text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold`}
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? '同步中...' : (dingtalkEnabled ? '同步钉钉员工' : '未配置钉钉')}</span>
              </button>
            </div>
          ) : null}
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
                  <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                  <input
                    id="filter-name"
                    type="text"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                    placeholder="输入姓名..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  />
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
                    <option value="active">在职</option>
                    <option value="inactive">离职</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </TableManager>
      </div>
    </div>
  )
}

export default EmployeeManagement
