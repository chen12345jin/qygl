import React, { useState, useEffect } from 'react'
import TableManager from '../components/TableManager'
import { useData } from '../contexts/DataContext'
import { AlertTriangle, Filter, RefreshCcw, Download } from 'lucide-react'
import { exportToExcel } from '../utils/export'

const MajorEvents = () => {
  const { getMajorEvents, addMajorEvent, updateMajorEvent, deleteMajorEvent, getDepartments } = useData()
  const [events, setEvents] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    event_type: '',
    importance: '',
    status: ''
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    loadEvents()
    loadDepartments()
  }, [filters])

  const loadEvents = async () => {
    const result = await getMajorEvents(filters)
    if (result.success) {
      setEvents(result.data || [])
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
    const selectedDept = departments.find(dept => dept.name === data.responsible_department)
    
    // 如果没有选择部门，显示错误
    if (!selectedDept) {
      alert('请选择负责部门')
      return false
    }
    
    const eventData = {
      ...data,
      year: filters.year,
      department_id: selectedDept.id,
      // 清理前端特有字段
      responsible_department: undefined
    }
    const result = await addMajorEvent(eventData)
    if (result.success) {
      loadEvents()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    // 找到选中的部门信息
    const selectedDept = departments.find(dept => dept.name === data.responsible_department)
    
    // 如果没有选择部门，显示错误
    if (!selectedDept) {
      alert('请选择负责部门')
      return false
    }
    
    const eventData = {
      ...data,
      department_id: selectedDept.id,
      // 清理前端特有字段
      responsible_department: undefined
    }
    const result = await updateMajorEvent(id, eventData)
    if (result.success) {
      loadEvents()
      setEditingId(null)
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteMajorEvent(id)
    if (result.success) {
      loadEvents()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.event_name = `${newData.event_name}_副本`
    newData.year = filters.year
    handleAdd(newData)
  }

  const handleExportToExcel = () => {
    try {
      const exportData = events.map(e => ({
        year: e.year,
        event_name: e.event_name,
        event_type: e.event_type,
        importance: e.importance,
        planned_date: e.planned_date,
        actual_date: e.actual_date,
        responsible_department: e.responsible_department,
        responsible_person: e.responsible_person,
        status: e.status,
        budget: e.budget,
        actual_cost: e.actual_cost,
        description: e.description
      }))
      exportToExcel(exportData, `大事件提炼_${filters.year}年`, '大事件', 'majorEvents')
    } catch (error) {
      console.error('导出Excel失败:', error)
      alert('导出失败，请稍后重试')
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
    { key: 'event_name', label: '事件名称', required: true },
    { 
      key: 'event_type', 
      label: '事件类型', 
      type: 'select',
      options: [
        { value: 'strategic', label: '战略性事件' },
        { value: 'operational', label: '运营性事件' },
        { value: 'risk', label: '风险性事件' },
        { value: 'opportunity', label: '机会性事件' }
      ],
      required: true
    },
    { 
      key: 'importance', 
      label: '重要性', 
      type: 'select',
      options: [
        { value: 'critical', label: '非常重要' },
        { value: 'high', label: '重要' },
        { value: 'medium', label: '一般' },
        { value: 'low', label: '较低' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'critical' ? 'bg-red-100 text-red-800' :
          value === 'high' ? 'bg-orange-100 text-orange-800' :
          value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value === 'critical' ? '非常重要' :
           value === 'high' ? '重要' :
           value === 'medium' ? '一般' : '较低'}
        </span>
      )
    },
    { key: 'planned_date', label: '计划日期', type: 'date' },
    { key: 'actual_date', label: '实际日期', type: 'date' },
    { 
      key: 'responsible_department', 
      label: '负责部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.name, label: dept.name })),
      required: true
    },
    { key: 'responsible_person', label: '负责人' },
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      options: [
        { value: 'planning', label: '规划中' },
        { value: 'preparing', label: '准备中' },
        { value: 'executing', label: '执行中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' }
      ],
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'executing' ? 'bg-blue-100 text-blue-800' :
          value === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value === 'completed' ? '已完成' :
           value === 'executing' ? '执行中' :
           value === 'preparing' ? '准备中' :
           value === 'cancelled' ? '已取消' : '规划中'}
        </span>
      )
    },
    { key: 'budget', label: '预算（万元）', type: 'number' },
    { key: 'actual_cost', label: '实际成本（万元）', type: 'number' },
    { key: 'description', label: '事件描述', type: 'textarea' },
    { key: 'key_points', label: '关键要点', type: 'textarea' },
    { key: 'success_criteria', label: '成功标准', type: 'textarea' },
    { key: 'risks', label: '风险因素', type: 'textarea' },
    { key: 'lessons_learned', label: '经验教训', type: 'textarea' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <AlertTriangle className="mr-2" />
          大事件提炼
        </h1>
        <p className="text-gray-600">识别、记录和管理企业年度重大事件，形成经验积累</p>
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
                <label className="block text-xs text-gray-600 mb-1">事件类型</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                  value={filters.event_type}
                  onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
                >
                  <option value="">全部类型</option>
                  <option value="strategic">战略性事件</option>
                  <option value="operational">运营性事件</option>
                  <option value="risk">风险性事件</option>
                  <option value="opportunity">机会性事件</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">重要性</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                  value={filters.importance}
                  onChange={(e) => setFilters({ ...filters, importance: e.target.value })}
                >
                  <option value="">全部重要性</option>
                  <option value="critical">非常重要</option>
                  <option value="high">重要</option>
                  <option value="medium">一般</option>
                  <option value="low">较低</option>
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
                  <option value="planning">规划中</option>
                  <option value="preparing">准备中</option>
                  <option value="executing">执行中</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
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
                onClick={() => { loadEvents(); setIsFilterOpen(false) }}
              >
                应用筛选
              </button>
              <button 
                className="h-9 px-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-100 transition-all text-sm"
                onClick={() => setFilters({ year: new Date().getFullYear(), event_type: '', importance: '', status: '' })}
              >
                <RefreshCcw size={14} className="inline mr-1" />重置
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 事件分类说明 */}
      <div className="bg-amber-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-amber-800 mb-2">大事件分类说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <strong className="text-amber-700">战略性事件</strong>
            <p className="text-gray-700">影响企业长远发展的重大决策</p>
          </div>
          <div>
            <strong className="text-amber-700">运营性事件</strong>
            <p className="text-gray-700">日常运营中的重要里程碑</p>
          </div>
          <div>
            <strong className="text-amber-700">风险性事件</strong>
            <p className="text-gray-700">可能带来负面影响的事件</p>
          </div>
          <div>
            <strong className="text-amber-700">机会性事件</strong>
            <p className="text-gray-700">可以把握的发展机遇</p>
          </div>
        </div>
      </div>

      <TableManager
        title={`${filters.year}年度大事件记录`}
        data={events}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
        editingId={editingId}
        onEditingChange={setEditingId}
        showActions={true}
      />
    </div>
  )
}

export default MajorEvents
