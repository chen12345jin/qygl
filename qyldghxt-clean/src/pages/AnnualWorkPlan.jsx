import React, { useState, useEffect } from 'react'
import TableManager from '../components/TableManager'
import { useData } from '../contexts/DataContext'
import { Calendar, Filter } from 'lucide-react'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/export'

const AnnualWorkPlan = () => {
  const { getAnnualWorkPlans, addAnnualWorkPlan, updateAnnualWorkPlan, deleteAnnualWorkPlan, getDepartments } = useData()
  const [plans, setPlans] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    department: '',
    category: '',
    status: '',
    month: ''
  })

  useEffect(() => {
    loadPlans()
    loadDepartments()
  }, [filters])

  const loadPlans = async () => {
    const result = await getAnnualWorkPlans(filters)
    if (result.success) {
      setPlans(result.data || [])
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const handleAdd = async (data) => {
    // 找到选中的部门信息
    const selectedDept = departments.find(dept => dept.name === data.department)
    
    const planData = {
      ...data,
      year: filters.year,
      department_id: selectedDept ? selectedDept.id : null,
      department_name: data.department,
      // 确保所有必需字段都有默认值
      month: data.month || null,
      description: data.expected_outcome || '',
      target_value: data.budget ? parseFloat(data.budget) : null,
      target_level: 'A',
      progress: 0,
      sheet_type: 'planning',
      // 清理前端特有字段
      department: undefined,
      expected_outcome: undefined,
      remarks: undefined
    }
    
    const result = await addAnnualWorkPlan(planData)
    if (result.success) {
      loadPlans()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    // 找到选中的部门信息
    const selectedDept = departments.find(dept => dept.name === data.department)
    
    const planData = {
      ...data,
      department_id: selectedDept ? selectedDept.id : null,
      department_name: data.department,
      // 确保所有必需字段都有默认值
      month: data.month || null,
      description: data.expected_outcome || '',
      target_value: data.budget ? parseFloat(data.budget) : null,
      target_level: data.target_level || 'A',
      progress: data.progress || 0,
      sheet_type: data.sheet_type || 'planning',
      // 清理前端特有字段
      department: undefined,
      expected_outcome: undefined,
      remarks: undefined
    }
    
    const result = await updateAnnualWorkPlan(id, planData)
    if (result.success) {
      loadPlans()
      setEditingId(null)
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteAnnualWorkPlan(id)
    if (result.success) {
      loadPlans()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.plan_name = `${newData.plan_name}_副本`
    newData.year = filters.year
    handleAdd(newData)
  }

  const handleExportToExcel = () => {
    try {
      const exportData = plans.map(p => ({
        year: p.year,
        department: p.department_name || p.department,
        plan_name: p.plan_name,
        month: p.month,
        category: p.category,
        priority: p.priority,
        start_date: p.start_date,
        end_date: p.end_date,
        budget: p.budget,
        status: p.status,
        responsible_person: p.responsible_person
      }))
      exportToExcel(exportData, `年度工作规划_${filters.year}年`, '年度工作规划', 'annualWorkPlans')
    } catch (error) {
      console.error('导出Excel失败:', error)
      alert('导出失败，请稍后重试')
    }
  }

  const handleImportFromExcel = async (file) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)
      for (const row of rows) {
        const payload = {
          year: Number(row['年度'] || filters.year),
          department: row['部门'] || '',
          plan_name: row['计划名称'] || '',
          month: row['月份'] ? Number(row['月份']) : null,
          category: row['类别'] || '',
          priority: row['优先级'] || '',
          start_date: row['开始日期'] || '',
          end_date: row['结束日期'] || '',
          budget: row['预算（万元）'] ? Number(row['预算（万元）']) : null,
          status: row['状态'] || '',
          responsible_person: row['负责人'] || ''
        }
        await addAnnualWorkPlan(payload)
      }
      await loadPlans()
      alert('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      alert('导入失败，请检查文件格式')
    }
  }

  const columns = [
    { 
      key: 'year', 
      label: '年份', 
      type: 'select',
      options: [
        { value: 2024, label: '2024年' },
        { value: 2025, label: '2025年' },
        { value: 2026, label: '2026年' }
      ],
      required: true
    },
    { key: 'plan_name', label: '计划名称', required: true },
    { 
      key: 'month', 
      label: '月份', 
      type: 'select',
      options: [
        { value: 1, label: '1月' },
        { value: 2, label: '2月' },
        { value: 3, label: '3月' },
        { value: 4, label: '4月' },
        { value: 5, label: '5月' },
        { value: 6, label: '6月' },
        { value: 7, label: '7月' },
        { value: 8, label: '8月' },
        { value: 9, label: '9月' },
        { value: 10, label: '10月' },
        { value: 11, label: '11月' },
        { value: 12, label: '12月' }
      ]
    },
    { 
      key: 'department', 
      label: '负责部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.name, label: dept.name })),
      required: true
    },
    { 
      key: 'category', 
      label: '类别', 
      type: 'select',
      options: [
        { value: 'strategic', label: '战略性工作' },
        { value: 'operational', label: '运营性工作' },
        { value: 'project', label: '项目性工作' },
        { value: 'improvement', label: '改进性工作' }
      ],
      required: true
    },
    { 
      key: 'priority', 
      label: '优先级', 
      type: 'select',
      options: [
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'high' ? 'bg-red-100 text-red-800' :
          value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value === 'high' ? '高' : value === 'medium' ? '中' : '低'}
        </span>
      )
    },
    { key: 'start_date', label: '开始日期', type: 'date' },
    { key: 'end_date', label: '结束日期', type: 'date' },
    { key: 'budget', label: '预算（万元）', type: 'number' },
    { key: 'responsible_person', label: '负责人' },
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      options: [
        { value: 'planning', label: '规划中' },
        { value: 'in_progress', label: '进行中' },
        { value: 'completed', label: '已完成' },
        { value: 'suspended', label: '已暂停' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          value === 'suspended' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value === 'completed' ? '已完成' :
           value === 'in_progress' ? '进行中' :
           value === 'suspended' ? '已暂停' : '规划中'}
        </span>
      )
    },
    { key: 'expected_outcome', label: '预期成果', type: 'textarea' },
    { key: 'remarks', label: '备注', type: 'textarea' }
  ]

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="mr-2" />
          年度工作落地规划
        </h1>
        <p className="text-gray-600">制定和管理企业年度工作计划的具体落地实施方案</p>
      </div>

      {/* 筛选器 - 移动到右上角 */}
      <div className="bg-white rounded-lg shadow p-3 absolute top-4 right-4 z-10">
        <div className="flex items-center space-x-2">
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            className="form-select text-sm px-2 py-1"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="form-select text-sm px-2 py-1"
          >
            <option value="">全部部门</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="form-select text-sm px-2 py-1"
          >
            <option value="">全部类别</option>
            <option value="strategic">战略</option>
            <option value="operational">运营</option>
            <option value="project">项目</option>
            <option value="improvement">改进</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="form-select text-sm px-2 py-1"
          >
            <option value="">全部状态</option>
            <option value="planning">规划中</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="suspended">已暂停</option>
          </select>
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="form-select text-sm px-2 py-1"
          >
            <option value="">全部月份</option>
            <option value="1">1月</option>
            <option value="2">2月</option>
            <option value="3">3月</option>
            <option value="4">4月</option>
            <option value="5">5月</option>
            <option value="6">6月</option>
            <option value="7">7月</option>
            <option value="8">8月</option>
            <option value="9">9月</option>
            <option value="10">10月</option>
            <option value="11">11月</option>
            <option value="12">12月</option>
          </select>
          <button 
            className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
            onClick={() => setFilters({
              year: new Date().getFullYear(),
              department: '',
              category: '',
              status: '',
              month: ''
            })}
          >
            重置
          </button>
          <button 
            className="bg-green-600 text-white px-2 py-1 rounded text-sm"
            onClick={handleExportToExcel}
          >
            导出Excel
          </button>
          <label className="bg-purple-600 text-white px-2 py-1 rounded text-sm cursor-pointer">
            导入Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
          </label>
        </div>
      </div>

      <TableManager
        title={`${filters.year}年度工作计划`}
        data={plans}
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

export default AnnualWorkPlan
