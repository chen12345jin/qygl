import React, { useState, useEffect } from 'react'
import TableManager from '../components/TableManager'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog'
import { useData } from '../contexts/DataContext'
import { 
  CheckSquare, 
  Filter, 
  Target, 
  Calendar, 
  Users, 
  MapPin, 
  Settings, 
  DollarSign,
  BarChart3,
  TrendingUp,
  FileText,
  Building,
  ShoppingBag,
  Cloud,
  RefreshCcw,
  Download,
  Upload
} from 'lucide-react'
import { exportToExcel } from '../utils/export'
import * as XLSX from 'xlsx'

const ActionPlans = () => {
  const { getActionPlans, addActionPlan, updateActionPlan, deleteActionPlan, getDepartments } = useData()
  const [plans, setPlans] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    department: '',
    status: '',
    priority: ''
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    loadPlans()
    loadDepartments()
  }, [filters])

  const loadPlans = async () => {
    const result = await getActionPlans(filters)
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
    const planData = {
      ...data,
      year: filters.year
    }
    const result = await addActionPlan(planData)
    if (result.success) {
      loadPlans()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    const result = await updateActionPlan(id, data)
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
    const result = await deleteActionPlan(id)
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
    newData.what = `${newData.what}_副本`
    newData.year = filters.year
    handleAdd(newData)
  }

  const handleExportToExcel = () => {
    try {
      const exportData = plans.map(p => ({
        year: p.year,
        department: p.department,
        what: p.what,
        why: p.why,
        who: p.who,
        when: p.when,
        where: p.where,
        how: p.how,
        how_much: p.how_much,
        priority: p.priority,
        status: p.status,
        progress: p.progress
      }))
      exportToExcel(exportData, `5W2H行动计划_${filters.year}年`, '行动计划', 'actionPlans')
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
          what: row['做什么'] || row['What（做什么）'] || '',
          why: row['为什么'] || row['Why（为什么做）'] || '',
          who: row['谁来做'] || row['Who（谁来做）'] || '',
          when: row['什么时候'] || row['When（什么时候做）'] || '',
          where: row['在哪里'] || row['Where（在哪里做）'] || '',
          how: row['怎么做'] || row['How（如何做）'] || '',
          how_much: row['多少钱'] || row['How Much（多少成本）'] || null,
          priority: row['优先级'] || '',
          status: row['状态'] || '',
          progress: row['进度（%）'] ? Number(row['进度（%）']) : 0
        }
        await addActionPlan(payload)
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
    { key: 'what', label: 'What（做什么）', required: true, type: 'textarea', hint: '明确要做的具体事项' },
    { key: 'why', label: 'Why（为什么做）', required: true, type: 'textarea', hint: '说明目的与预期价值' },
    { key: 'who', label: 'Who（谁来做）', required: true, hint: '填写负责人或团队' },
    { key: 'when', label: 'When（什么时候做）', type: 'date', required: true, hint: '选择时间节点或截止日期' },
    { key: 'where', label: 'Where（在哪里做）', hint: '发生地点或执行场所' },
    { key: 'how', label: 'How（如何做）', type: 'textarea', hint: '关键步骤与方法' },
    { key: 'how_much', label: 'How Much（多少成本）', type: 'number', hint: '预算或资源投入' },
    { 
      key: 'department', 
      label: '负责部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.name, label: dept.name })),
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
      required: true,
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
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      options: [
        { value: 'not_started', label: '未开始' },
        { value: 'in_progress', label: '进行中' },
        { value: 'completed', label: '已完成' },
        { value: 'delayed', label: '延期' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          value === 'delayed' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value === 'completed' ? '已完成' :
           value === 'in_progress' ? '进行中' :
           value === 'delayed' ? '延期' : '未开始'}
        </span>
      )
    },
    { key: 'progress', label: '进度（%）', type: 'number' },
    { key: 'expected_result', label: '预期结果', type: 'textarea' },
    { key: 'actual_result', label: '实际结果', type: 'textarea' },
    { key: 'remarks', label: '备注', type: 'textarea' }
  ]

  return (
    <div className="space-y-8">
      {/* 页面标题区域 - 现代化设计 */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative z-10 p-8">
          <div className="flex items-center space-x-6">
            <div className="bg-gradient-to-br from-white/20 to-white/10 p-4 rounded-2xl shadow-xl">
              <CheckSquare size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                5W2H行动计划
              </h1>
              <p className="text-blue-100 text-lg">运用5W2H方法制定具体的行动计划，确保目标达成</p>
            </div>
          </div>
        </div>
      </div>

      {/* 顶部右侧筛选与导出 */}
      <div className="relative">
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button 
            className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center text-sm gap-2"
            onClick={() => setIsFilterOpen(prev => !prev)}
          >
            <Filter size={16} />
            <span>筛选</span>
          </button>
          <button 
            className="h-10 px-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg flex items-center justify-center text-sm gap-2"
            onClick={handleExportToExcel}
          >
            <Download size={16} />
            <span>导出Excel</span>
          </button>
          <label className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center text-sm gap-2 cursor-pointer">
            <Upload size={16} />
            <span>导入Excel</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
          </label>
        </div>
        {isFilterOpen && (
          <div className="absolute top-16 right-4 w-96 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">年度</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">部门</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                  <option value="">全部部门</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">状态</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">全部状态</option>
                  <option value="not_started">未开始</option>
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="delayed">延期</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">优先级</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all duration-200 text-sm"
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <option value="">全部优先级</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button 
                className="h-9 px-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-all text-sm"
                onClick={() => setIsFilterOpen(false)}
              >
                关闭
              </button>
              <button 
                className="h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all text-sm"
                onClick={() => { loadPlans(); setIsFilterOpen(false) }}
              >
                应用筛选
              </button>
              <button 
                className="h-9 px-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-all text-sm"
                onClick={() => setFilters({ year: new Date().getFullYear(), department: '', status: '', priority: '' })}
              >
                <RefreshCcw size={14} className="inline mr-1" />重置
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5W2H方法说明 - 现代化设计 */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-3xl shadow-2xl p-8 border border-white/50">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
            <Target size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">5W2H分析法说明</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText size={16} className="text-blue-600" />
              </div>
              <strong className="text-blue-700">What（做什么）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确要做的具体事情</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Target size={16} className="text-green-600" />
              </div>
              <strong className="text-green-700">Why（为什么做）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确做这件事的目的和意义</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users size={16} className="text-purple-600" />
              </div>
              <strong className="text-purple-700">Who（谁来做）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确负责人和参与者</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-red-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Calendar size={16} className="text-red-600" />
              </div>
              <strong className="text-red-700">When（什么时候做）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确时间节点和期限</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-orange-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <MapPin size={16} className="text-orange-600" />
              </div>
              <strong className="text-orange-700">Where（在哪里做）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确地点和场所</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-indigo-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Settings size={16} className="text-indigo-600" />
              </div>
              <strong className="text-indigo-700">How（如何做）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确实施方法和步骤</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-teal-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <DollarSign size={16} className="text-teal-600" />
              </div>
              <strong className="text-teal-700">How Much（多少成本）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确所需资源和成本</p>
          </div>
        </div>
      </div>

      <TableManager
        title={`${filters.year}年度5W2H行动计划表`}
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

export default ActionPlans
