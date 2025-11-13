import React, { useState, useEffect } from 'react'
import TableManager from '../components/TableManager'
import { useData } from '../contexts/DataContext'
import { TrendingUp, Filter, RefreshCcw, Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/export'

const MonthlyProgress = () => {
  const { getMonthlyProgress, addMonthlyProgress, updateMonthlyProgress, deleteMonthlyProgress, getDepartments } = useData()
  const [progress, setProgress] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    department: '',
    status: ''
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    loadProgress()
    loadDepartments()
  }, [filters])

  const loadProgress = async () => {
    const result = await getMonthlyProgress(filters)
    if (result.success) {
      setProgress(result.data || [])
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const handleAdd = async (data) => {
    const progressData = {
      ...data,
      year: filters.year
    }
    const result = await addMonthlyProgress(progressData)
    if (result.success) {
      loadProgress()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    const result = await updateMonthlyProgress(id, data)
    if (result.success) {
      loadProgress()
      setEditingId(null)
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteMonthlyProgress(id)
    if (result.success) {
      loadProgress()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.task_name = `${newData.task_name}_副本`
    newData.year = filters.year
    handleAdd(newData)
  }

  const handleExportToExcel = () => {
    try {
      const exportData = progress.map(p => ({
        year: p.year,
        month: p.month,
        department: p.department,
        task_name: p.task_name,
        target_value: p.target_value,
        actual_value: p.actual_value,
        completion_rate: p.completion_rate,
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
        responsible_person: p.responsible_person
      }))
      exportToExcel(exportData, `月度推进计划_${filters.year}年`, '月度推进', 'monthlyProgress')
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
          month: row['月份'] ? Number(row['月份']) : null,
          department: row['部门'] || '',
          task_name: row['任务名称'] || '',
          target_value: row['目标'] ? Number(row['目标']) : null,
          actual_value: row['实际'] ? Number(row['实际']) : null,
          progress: row['进度'] ? Number(row['进度']) : null,
          status: row['状态'] || '',
          responsible_person: row['负责人'] || ''
        }
        await addMonthlyProgress(payload)
      }
      await loadProgress()
      alert('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      alert('导入失败，请检查文件格式')
    }
  }

  const columns = [
    { 
      key: 'year', 
      label: '年度', 
      type: 'select',
      options: [
        { value: 2024, label: '2024年' },
        { value: 2025, label: '2025年' },
        { value: 2026, label: '2026年' }
      ],
      required: true
    },
    { 
      key: 'month', 
      label: '月份', 
      type: 'select',
      options: Array.from({ length: 12 }, (_, i) => ({ 
        value: i + 1, 
        label: `${i + 1}月` 
      })),
      required: true
    },
    { key: 'task_name', label: '任务名称', required: true },
    { 
      key: 'department', 
      label: '负责部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.name, label: dept.name })),
      required: true
    },
    { key: 'responsible_person', label: '负责人', required: true },
    { key: 'target_value', label: '目标值', type: 'number' },
    { key: 'actual_value', label: '实际值', type: 'number' },
    { 
      key: 'completion_rate', 
      label: '完成率', 
      render: (value, item) => {
        const rate = item.actual_value && item.target_value 
          ? (item.actual_value / item.target_value * 100).toFixed(1)
          : 0
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${
            rate >= 100 ? 'bg-green-100 text-green-800' :
            rate >= 80 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {rate}%
          </span>
        )
      }
    },
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      options: [
        { value: 'on_track', label: '按计划进行' },
        { value: 'delayed', label: '延期' },
        { value: 'ahead', label: '提前完成' },
        { value: 'at_risk', label: '有风险' }
      ],
      required: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'ahead' ? 'bg-green-100 text-green-800' :
          value === 'on_track' ? 'bg-blue-100 text-blue-800' :
          value === 'delayed' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {value === 'ahead' ? '提前完成' :
           value === 'on_track' ? '按计划进行' :
           value === 'delayed' ? '延期' : '有风险'}
        </span>
      )
    },
    { key: 'start_date', label: '开始日期', type: 'date' },
    { key: 'end_date', label: '结束日期', type: 'date' },
    { key: 'key_activities', label: '关键活动', type: 'textarea' },
    { key: 'achievements', label: '主要成果', type: 'textarea' },
    { key: 'challenges', label: '遇到的挑战', type: 'textarea' },
    { key: 'next_month_plan', label: '下月计划', type: 'textarea' },
    { key: 'support_needed', label: '需要支持', type: 'textarea' }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <TrendingUp size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">月度推进计划</h1>
            <p className="text-blue-100">跟踪和管理各项工作的月度执行进展情况</p>
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
                <label className="block text-xs text-gray-600 mb-1">月份</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                >
                  <option value="">全部月份</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
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
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">全部状态</option>
                  <option value="on_track">按计划进行</option>
                  <option value="delayed">延期</option>
                  <option value="ahead">提前完成</option>
                  <option value="at_risk">有风险</option>
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
                onClick={() => { loadProgress(); setIsFilterOpen(false) }}
              >
                应用筛选
              </button>
              <button 
                className="h-9 px-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-all text-sm"
                onClick={() => setFilters({ year: new Date().getFullYear(), month: '', department: '', status: '' })}
              >
                <RefreshCcw size={14} className="inline mr-1" />重置
              </button>
            </div>
          </div>
        )}
      </div>

      <TableManager
        title={`${filters.year}年度月度推进计划表`}
        data={progress}
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

export default MonthlyProgress
