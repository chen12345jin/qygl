import React, { useState, useEffect, useMemo } from 'react'
import TableManager from '../../components/TableManager'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { RefreshCw, Filter, RefreshCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import TreeSelect from '../../components/TreeSelect'
import { mergeEmployeesAsNodes } from '../../utils/orgSync'

const DepartmentManagement = () => {
  const { getDepartments, addDepartment, updateDepartment, deleteDepartment, syncDepartmentsFromDingTalk, getIntegrationStatus, getSystemSettings, getOrganizationTree, getEmployees } = useData()
  const [departments, setDepartments] = useState([])
  const [orgTree, setOrgTree] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [dingtalkEnabled, setDingtalkEnabled] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    name: '',
    status: ''
  })

  // 当数据变化导致当前页码超过最大页码时，自动跳转到最后一页
  useEffect(() => {
    const maxPage = Math.ceil(departments.length / pageSize) || 1
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [departments.length, pageSize])

  useEffect(() => {
    loadDepartments()
    loadOrgTree()
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

  const loadDepartments = async () => {
    // 只获取 type='DEPT' 的部门，并过滤掉公司（名称包含"公司"的）
    const result = await getDepartments({ type: 'DEPT' })
    if (result.success) {
      // 前端再过滤一次，确保不显示公司（公司不是部门）
      const deptOnly = (result.data || []).filter(d => !d.name.includes('公司'))
      setDepartments(deptOnly)
    }
  }

  const filteredDepartments = useMemo(() => {
    return departments.filter(d => {
      if (filters.name && !d.name.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.status && d.status !== filters.status) return false
      return true
    })
  }, [departments, filters])

  const getFilterCount = () => {
    let count = 0
    if (filters.name) count++
    if (filters.status) count++
    return count
  }
  const filterCount = getFilterCount()

  const resetFilters = () => {
    setFilters({
      name: '',
      status: ''
    })
    toast.success('已重置筛选')
  }

  const loadOrgTree = async () => {
    // 加载完整组织架构树，并包含员工节点（显示但不可选）
    try {
      const [treeRes, empRes] = await Promise.all([getOrganizationTree(), getEmployees()])
      const tree = treeRes.success ? (treeRes.data || []) : []
      const employees = empRes.success ? (empRes.data || []) : []
      
      const treeWithEmployees = mergeEmployeesAsNodes(tree, employees)
      setOrgTree(treeWithEmployees)
    } catch (e) {
      // 静默失败，避免影响用户体验
      setOrgTree([])
    }
  }

  const handleAdd = async (data) => {
    // 确保新建的部门 type 为 'DEPT'
    const departmentData = { ...data, type: 'DEPT' }
    const result = await addDepartment(departmentData)
    if (result.success) {
      loadDepartments()
      loadOrgTree() // 刷新组织树
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    // 确保编辑时保持 type 为 'DEPT'
    const departmentData = { ...data, type: 'DEPT' }
    const result = await updateDepartment(id, departmentData)
    if (result.success) {
      loadDepartments()
      loadOrgTree() // 刷新组织树
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
      loadOrgTree() // 刷新组织树，确保TreeSelect中删除的部门不再显示
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

  // 性能优化：使用 useMemo 缓存递归计算的 excludeIds
  const excludeIdsForEdit = useMemo(() => {
    if (!editingId) return []
    
    const getAllDescendantIds = (node) => {
      const ids = [node.id]
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          ids.push(...getAllDescendantIds(child))
        })
      }
      return ids
    }
    
    const findNodeInTree = (nodes, id) => {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children && node.children.length > 0) {
          const found = findNodeInTree(node.children, id)
          if (found) return found
        }
      }
      return null
    }
    
    const excludeIds = [editingId]
    const currentNode = findNodeInTree(orgTree, editingId)
    if (currentNode) {
      excludeIds.push(...getAllDescendantIds(currentNode))
    }
    return excludeIds
  }, [editingId, orgTree])

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
    { 
      key: 'parent_name', 
      label: '所属上级',
      render: (value) => (
        <span className="text-gray-700">{value || <span className="text-gray-400">无</span>}</span>
      )
    },
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
    { 
      key: 'parent_id', 
      label: '上级节点ID', 
      type: 'custom',
      // 在表格中显示 parent_name（虽然和 parent_name 列重复，但避免空列）
      render: (value, item) => item.parent_name || '无',
      customField: ({ value, onChange, formData, setFormData }) => (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            上级节点
            <span className="text-gray-500 text-xs font-normal ml-2">（可选）</span>
          </label>
          <TreeSelect
            value={value || null}
            onChange={(id) => {
              setFormData({ ...formData, parent_id: id || null })
              if (onChange) onChange(id || null)
            }}
            options={orgTree}
            placeholder="请选择上级节点（可选择公司或部门）"
            excludeIds={excludeIdsForEdit}
          />
          <p className="mt-1 text-xs text-gray-500">
            {editingId ? '注意：不能选择当前部门或其子部门作为上级，避免循环引用' : '可选择公司或部门作为上级节点'}
          </p>
        </div>
      )
    },
    { key: 'description', label: '描述', type: 'textarea' }
  ]

  return (
    <div className="space-y-6">
      <PageHeaderBanner title="部门管理" subTitle="部门管理的年度工作落地规划" />

      <div className="unified-table-wrapper">
        <TableManager
          title="部门列表"
          data={filteredDepartments}
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
            total: filteredDepartments.length,
            onChange: ({ page: p, pageSize: s }) => {
              setPage(p)
              setPageSize(s)
            }
          }}
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
                className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold ${!(filters.name || filters.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={resetFilters}
                disabled={!(filters.name || filters.status)}
                title="重置筛选"
              >
                <RefreshCcw size={16} />
                <span>重置</span>
              </button>
              <button
                onClick={handleSyncDingTalk}
                disabled={syncing || !dingtalkEnabled}
                className={`px-3 py-2 ${(syncing || !dingtalkEnabled) ? 'bg-gray-300' : 'bg-gradient-to-r from-green-500 to-emerald-600'} text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold`}
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? '同步中...' : (dingtalkEnabled ? '同步钉钉部门' : '未配置钉钉')}</span>
              </button>
            </div>
          )}
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
                  <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 mb-1">部门名称</label>
                  <input
                    id="filter-name"
                    type="text"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                    placeholder="输入部门名称..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  />
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
                    <option value="active">启用</option>
                    <option value="inactive">禁用</option>
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

export default DepartmentManagement
