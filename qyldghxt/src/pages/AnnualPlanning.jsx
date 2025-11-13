import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { Plus, Edit, Trash2, Save, X, Download, Printer, Calculator, FileText, Layers, Calendar, Target, List, Package, Clock, User, MessageSquare, AlertTriangle, Tag, Star, AlignLeft, TrendingUp, BookOpen, CheckSquare, Flag, Users, BarChart3 } from 'lucide-react'
import { exportToExcel, exportToPDF } from '../utils/export'
import PrintPreview from '../components/PrintPreview'
import TableManager from '../components/TableManager'
import toast from 'react-hot-toast'

const AnnualPlanning = () => {
  const { getAnnualPlans, addAnnualPlan, updateAnnualPlan, deleteAnnualPlan } = useData()
  const [plans, setPlans] = useState([])
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [editingCell, setEditingCell] = useState({ row: null, col: null, sheet: null })
  const [currentSheet, setCurrentSheet] = useState('planning')
  
  // 年度工作规划数据
  const [planningData, setPlanningData] = useState({
    year: new Date().getFullYear(),
    title: '年度工作规划',
    data: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      theme: ['规划导航月', '招聘月', '人才引备战月', '产品月', '产品月', '年中总结月', 
              '学习月', '备战月', '抢战月', '丰收月', '冲刺月', '总结月'][i],
      goals: '',
      tasks: '',
      resources: '',
      timeline: '',
      responsible: '',
      notes: ''
    }))
  })

  // 大事件提炼数据
  const [eventsData, setEventsData] = useState({
    year: new Date().getFullYear(),
    title: '年度大事件提炼',
    events: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      event_name: '',
      event_type: '',
      importance: '高',
      description: '',
      impact: '',
      lessons: ''
    }))
  })

  // 月度推进计划
  const [monthlyPlans, setMonthlyPlans] = useState({
    year: new Date().getFullYear(),
    title: '月度推进计划表',
    plans: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      objectives: '',
      key_tasks: '',
      deliverables: '',
      milestones: '',
      resources_needed: '',
      risks: '',
      success_metrics: ''
    }))
  })

  // 5W2H行动计划
  const [actionPlans, setActionPlans] = useState({
    year: new Date().getFullYear(),
    title: '5W2H行动计划表',
    actions: []
  })

  const sheets = [
    { key: 'planning', label: '年度工作规划', icon: FileText },
    { key: 'events', label: '大事件提炼', icon: FileText },
    { key: 'monthly', label: '月度推进计划', icon: FileText },
    { key: 'action', label: '5W2H行动计划', icon: FileText }
  ]

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 从数据库加载所有类型的数据
      const [planningResult, eventsResult, monthlyResult, actionResult] = await Promise.all([
        getAnnualPlans({ sheet_type: 'planning' }),
        getAnnualPlans({ sheet_type: 'events' }),
        getAnnualPlans({ sheet_type: 'monthly' }),
        getAnnualPlans({ sheet_type: 'action' })
      ])

      if (planningResult.success && planningResult.data) {
        setPlanningData(prev => ({
          ...prev,
          data: planningResult.data.length > 0 ? planningResult.data : prev.data
        }))
      }

      if (eventsResult.success && eventsResult.data) {
        setEventsData(prev => ({
          ...prev,
          events: eventsResult.data.length > 0 ? eventsResult.data : prev.events
        }))
      }

      if (monthlyResult.success && monthlyResult.data) {
        setMonthlyPlans(prev => ({
          ...prev,
          plans: monthlyResult.data.length > 0 ? monthlyResult.data : prev.plans
        }))
      }

      if (actionResult.success && actionResult.data) {
        setActionPlans(prev => ({
          ...prev,
          actions: actionResult.data.length > 0 ? actionResult.data : prev.actions
        }))
      }

      setPlans(planningResult.data || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const handleSave = async (sheet) => {
    try {
      const dataToSave = {
        planning: planningData,
        events: eventsData,
        monthly: monthlyPlans,
        action: actionPlans
      }[sheet]

      // 获取当前数据数组
      const dataArray = dataToSave[{
        planning: 'data',
        events: 'events',
        monthly: 'plans',
        action: 'actions'
      }[sheet]]

      // 批量保存数据到数据库
      const savePromises = dataArray.map(item => 
        addAnnualPlan({
          ...item,
          sheet_type: sheet,
          year: dataToSave.year
        })
      )

      const results = await Promise.all(savePromises)
      const allSuccess = results.every(result => result.success)

      if (allSuccess) {
        toast.success('保存成功')
        loadData()
      } else {
        toast.error('部分数据保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    }
  }

  const handleCellEdit = (sheet, index, field, value) => {
    const setters = {
      planning: setPlanningData,
      events: setEventsData,
      monthly: setMonthlyPlans,
      action: setActionPlans
    }

    const setter = setters[sheet]
    if (!setter) return

    setter(prev => {
      const newData = { ...prev }
      const arrayKey = {
        planning: 'data',
        events: 'events',
        monthly: 'plans',
        action: 'actions'
      }[sheet]

      if (newData[arrayKey] && newData[arrayKey][index]) {
        newData[arrayKey][index] = {
          ...newData[arrayKey][index],
          [field]: value
        }
      }
      return newData
    })

    setEditingCell({ row: null, col: null, sheet: null })
    toast.success('数据已更新')
  }

  const EditableCell = ({ sheet, index, field, value, type = 'text' }) => {
    const cellKey = `${sheet}-${index}-${field}`
    const isEditing = editingCell.row === index && 
                     editingCell.col === field && 
                     editingCell.sheet === sheet
    
    if (isEditing) {
      if (type === 'textarea') {
        return (
          <textarea
            defaultValue={value || ''}
            autoFocus
            onBlur={(e) => handleCellEdit(sheet, index, field, e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleCellEdit(sheet, index, field, e.target.value)
              }
            }}
            className="w-full border-0 bg-yellow-100 text-sm p-2 resize-none"
            rows="3"
          />
        )
      }

      return (
        <input
          type={type}
          defaultValue={value || ''}
          autoFocus
          onBlur={(e) => handleCellEdit(sheet, index, field, e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCellEdit(sheet, index, field, e.target.value)
            }
          }}
          className="w-full border-0 bg-yellow-100 text-center text-sm p-1"
        />
      )
    }

    return (
      <div
        onClick={() => setEditingCell({ row: index, col: field, sheet })}
        className="cursor-pointer hover:bg-blue-50 p-2 min-h-12 flex items-center justify-center text-center"
        title="点击编辑"
      >
        {value || ''}
      </div>
    )
  }

  const handleExport = (sheet) => {
    const dataMap = {
      planning: planningData.data,
      events: eventsData.events,
      monthly: monthlyPlans.plans,
      action: actionPlans.actions
    }
    
    const data = dataMap[sheet]
    if (!data || data.length === 0) {
      toast.error('没有数据可以导出')
      return
    }
    
    try {
      exportToExcel(data, `${sheets.find(s => s.key === sheet)?.label}_${new Date().getFullYear()}`)
      toast.success('导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败: ' + error.message)
    }
  }

  const handleExportPDF = (sheet) => {
    exportToPDF(`${sheet}-table`, `${sheets.find(s => s.key === sheet)?.label}_${new Date().getFullYear()}`)
  }

  // 获取当前表格的数据
  const getCurrentSheetData = () => {
    const dataMap = {
      planning: planningData.data,
      events: eventsData.events,
      monthly: monthlyPlans.plans,
      action: actionPlans.actions
    }
    return dataMap[currentSheet] || []
  }

  // 获取当前表格的列定义
  const getCurrentSheetColumns = () => {
    const columnsMap = {
      planning: [
        { key: 'month', label: '月份' },
        { key: 'target', label: '目标' },
        { key: 'plan', label: '计划' },
        { key: 'responsible', label: '责任人' },
        { key: 'deadline', label: '完成时间' },
        { key: 'status', label: '状态' }
      ],
      events: [
        { key: 'month', label: '月份' },
        { key: 'event', label: '大事件' },
        { key: 'description', label: '事件描述' },
        { key: 'impact', label: '影响程度' },
        { key: 'responsible', label: '负责人' },
        { key: 'status', label: '状态' }
      ],
      monthly: [
        { key: 'month', label: '月份' },
        { key: 'target', label: '目标' },
        { key: 'plan', label: '计划' },
        { key: 'responsible', label: '责任人' },
        { key: 'deadline', label: '完成时间' },
        { key: 'progress', label: '进度' }
      ],
      action: [
        { key: 'what', label: 'What (做什么)' },
        { key: 'why', label: 'Why (为什么)' },
        { key: 'who', label: 'Who (谁来做)' },
        { key: 'when', label: 'When (什么时候)' },
        { key: 'where', label: 'Where (在哪里)' },
        { key: 'how', label: 'How (怎么做)' },
        { key: 'how_much', label: 'How Much (多少钱)' },
        { key: 'status', label: '状态' }
      ]
    }
    return columnsMap[currentSheet] || []
  }

  const addActionPlan = () => {
    setActionPlans(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          id: Date.now(),
          what: '',
          why: '',
          who: '',
          when: '',
          where: '',
          how: '',
          how_much: '',
          status: '计划中'
        }
      ]
    }))
  }

  const deleteActionPlan = (index) => {
    setActionPlans(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }))
  }

  const renderPlanningSheet = () => (
    <div id="planning-table" className="overflow-x-auto">
      {/* 年度工作规划表 - 现代化设计 */}
      <div className="flex items-center justify-between mb-6 p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <FileText size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">年度工作规划表</h3>
            <p className="text-gray-600 text-sm">年度工作安排与资源分配计划</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-gray-500 text-sm">数据记录</div>
            <div className="text-blue-600 font-semibold">{planningData.data.length} 条规划</div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleSave('planning')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <Save size={18} />
              <span>保存</span>
            </button>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl">
        <thead>
          <tr>
            <th className="px-6 py-4 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50">
              <div className="flex items-center justify-center space-x-2">
                <Calendar size={16} />
                <span>月份</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50">
              <div className="flex items-center justify-center space-x-2">
                <FileText size={16} />
                <span>主题</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50">
              <div className="flex items-center justify-center space-x-2">
                <Target size={16} />
                <span>目标</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50">
              <div className="flex items-center justify-center space-x-2">
                <List size={16} />
                <span>主要任务</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50">
              <div className="flex items-center justify-center space-x-2">
                <Package size={16} />
                <span>资源需求</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50">
              <div className="flex items-center justify-center space-x-2">
                <Clock size={16} />
                <span>时间安排</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50">
              <div className="flex items-center justify-center space-x-2">
                <User size={16} />
                <span>负责人</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center">
              <div className="flex items-center justify-center space-x-2">
                <MessageSquare size={16} />
                <span>备注</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {planningData.data.map((item, index) => (
            <tr key={index} className="group hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 transition-all duration-300 border-b border-gray-100/50">
              <td className="px-6 py-4 font-bold text-center bg-gradient-to-r from-blue-50/60 to-blue-100/60 border-r border-gray-200/30 group-hover:from-blue-100/80 group-hover:to-blue-200/80 transition-colors duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white shadow-md">
                  {item.month}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-center border-r border-gray-200/30 group-hover:bg-white/50 transition-colors duration-300">
                {item.theme}
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="goals"
                  value={item.goals}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="tasks"
                  value={item.tasks}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="resources"
                  value={item.resources}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="timeline"
                  value={item.timeline}
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="responsible"
                  value={item.responsible}
                />
              </td>
              <td className="px-6 py-4 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="notes"
                  value={item.notes}
                  type="textarea"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderEventsSheet = () => (
    <div id="events-table" className="overflow-x-auto">
      {/* 年度大事件提炼表 - 现代化设计 */}
      <div className="flex items-center justify-between mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/30">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-r from-purple-500/90 to-pink-600/90 rounded-2xl shadow-xl">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">年度大事件提炼表</h3>
            <p className="text-sm text-gray-600 mt-1">重要事件记录与分析总结</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full border border-gray-200/30">
            共 {eventsData.events.length} 条记录
          </span>
          <button
            onClick={() => handleSave('events')}
            className="px-8 py-3 bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>保存</span>
          </button>
        </div>
      </div>

      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl">
        <thead>
          <tr>
            <th className="px-6 py-4 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>月份</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span>事件名称</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Tag className="w-4 h-4 text-green-600" />
                <span>事件类型</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Star className="w-4 h-4 text-yellow-600" />
                <span>重要程度</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <AlignLeft className="w-4 h-4 text-yellow-600" />
                <span>事件描述</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>影响分析</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center">
              <div className="flex items-center justify-center space-x-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>经验教训</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {eventsData.events.map((item, index) => (
            <tr key={index} className="group hover:bg-gradient-to-r hover:from-purple-50/80 hover:to-pink-50/80 transition-all duration-300 border-b border-gray-100/50">
              <td className="px-6 py-4 font-bold text-center bg-gradient-to-r from-blue-50/60 to-blue-100/60 border-r border-gray-200/30 group-hover:from-blue-100/80 group-hover:to-blue-200/80 transition-colors duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white shadow-md">
                  {item.month}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold border-r border-gray-200/30 group-hover:bg-white/50 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="event_name"
                  value={item.event_name}
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="event_type"
                  value={item.event_type}
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="importance"
                  value={item.importance}
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="description"
                  value={item.description}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="impact"
                  value={item.impact}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="lessons"
                  value={item.lessons}
                  type="textarea"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderMonthlySheet = () => (
    <div id="monthly-table" className="overflow-x-auto">
      {/* 月度推进计划表 - 现代化设计 */}
      <div className="flex items-center justify-between mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/30">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-r from-yellow-500/90 to-orange-600/90 rounded-2xl shadow-xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">月度推进计划表</h3>
            <p className="text-sm text-gray-600 mt-1">月度目标分解与执行计划</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full border border-gray-200/30">
            共 {monthlyPlans.plans.length} 条记录
          </span>
          <button
            onClick={() => handleSave('monthly')}
            className="px-8 py-3 bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>保存</span>
          </button>
        </div>
      </div>

      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl">
        <thead>
          <tr>
            <th className="px-6 py-4 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>月份</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Target className="w-4 h-4 text-green-600" />
                <span>目标</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <CheckSquare className="w-4 h-4 text-green-600" />
                <span>关键任务</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Package className="w-4 h-4 text-yellow-600" />
                <span>交付成果</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Flag className="w-4 h-4 text-yellow-600" />
                <span>里程碑</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>资源需求</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span>风险点</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-red-100/80 to-red-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center">
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="w-4 h-4 text-red-600" />
                <span>成功指标</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {monthlyPlans.plans.map((item, index) => (
            <tr key={index} className="group border-b border-gray-200/30 hover:bg-gradient-to-r from-yellow-50/50 to-orange-50/50 transition-all duration-300 hover:shadow-md">
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <span className="font-bold">{item.month}月</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell
                  sheet="monthly"
                  index={index}
                  field="objectives"
                  value={item.objectives}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell
                  sheet="monthly"
                  index={index}
                  field="key_tasks"
                  value={item.key_tasks}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell
                  sheet="monthly"
                  index={index}
                  field="deliverables"
                  value={item.deliverables}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell
                  sheet="monthly"
                  index={index}
                  field="milestones"
                  value={item.milestones}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell
                  sheet="monthly"
                  index={index}
                  field="resources_needed"
                  value={item.resources_needed}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell
                  sheet="monthly"
                  index={index}
                  field="risks"
                  value={item.risks}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 group-hover:border-gray-200/50 transition-colors">
                <EditableCell
                  sheet="monthly"
                  index={index}
                  field="success_metrics"
                  value={item.success_metrics}
                  type="textarea"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderActionSheet = () => (
    <div id="action-table" className="overflow-x-auto">
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
            <Target size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">5W2H行动计划表</h3>
            <p className="text-gray-600 text-sm">详细行动计划与执行方案</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={addActionPlan}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>新增计划</span>
          </button>
          <button
            onClick={() => handleSave('action')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
          >
            <Save size={18} />
            <span>保存</span>
          </button>
        </div>
      </div>

      <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">What<br />做什么</th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">Why<br />为什么</th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">Who<br />谁来做</th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-yellow-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">When<br />什么时候</th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-yellow-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">Where<br />在哪里</th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">How<br />怎么做</th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">How Much<br />成本多少</th>
            <th className="px-4 py-3 bg-gradient-to-r from-red-100 to-red-200 text-sm font-semibold text-gray-800 text-center border border-gray-200">状态</th>
            <th className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 no-print">操作</th>
          </tr>
        </thead>
        <tbody>
          {actionPlans.actions.map((item, index) => (
            <tr key={index} className="hover:bg-gradient-to-r from-blue-50/50 to-indigo-50/50 transition-all duration-200 border-b border-gray-100">
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="what"
                  value={item.what}
                  type="textarea"
                />
              </td>
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="why"
                  value={item.why}
                  type="textarea"
                />
              </td>
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="who"
                  value={item.who}
                />
              </td>
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="when"
                  value={item.when}
                />
              </td>
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="where"
                  value={item.where}
                />
              </td>
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="how"
                  value={item.how}
                  type="textarea"
                />
              </td>
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="how_much"
                  value={item.how_much}
                />
              </td>
              <td className="px-4 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="status"
                  value={item.status}
                />
              </td>
              <td className="px-4 py-3 border border-gray-200 no-print">
                <button
                  onClick={() => deleteActionPlan(index)}
                  className="text-red-600 hover:text-red-800 transition-all duration-200 transform hover:scale-110"
                  title="删除"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 页面标题区域 - 现代化设计 */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative z-10 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                <Calendar size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">年度规划表</h1>
                <p className="text-blue-100 text-lg">年度工作规划与执行管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white/80 text-sm">当前年度</div>
                <div className="text-white text-xl font-semibold">{new Date().getFullYear()}年</div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPrintPreview(true)}
                  className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 border border-white/30"
                >
                  <Printer size={18} />
                  <span>打印预览</span>
                </button>
                <button
                  onClick={() => handleExportPDF(currentSheet)}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl hover:from-green-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
                >
                  <Download size={18} />
                  <span>导出PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* 标签页 - 现代化设计 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 mb-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Layers size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">数据表格</h3>
                <p className="text-gray-600 text-sm">选择要查看和编辑的表格类型</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              当前选择: {sheets.find(s => s.key === currentSheet)?.label}
            </div>
          </div>
          
          <nav className="flex space-x-4">
            {sheets.map((sheet) => {
              const Icon = sheet.icon
              const isActive = currentSheet === sheet.key
              return (
                <button
                  key={sheet.key}
                  onClick={() => setCurrentSheet(sheet.key)}
                  className={`py-3 px-6 rounded-xl font-medium text-sm flex items-center space-x-3 transition-all duration-300 transform ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-gray-800 border border-gray-200 hover:shadow-md'
                  }`}
                >
                  <Icon size={18} />
                  <span>{sheet.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* 提示信息 - 现代化设计 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
              <Calculator size={20} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-blue-800 font-medium">操作提示</p>
              <p className="text-blue-600 text-sm">点击表格单元格可直接编辑数据，支持多行文本输入</p>
            </div>
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-200"></div>
            </div>
          </div>
        </div>

        {/* 表格内容 */}
        <div className="space-y-6">
          {currentSheet === 'planning' && renderPlanningSheet()}
          {currentSheet === 'events' && renderEventsSheet()}
          {currentSheet === 'monthly' && renderMonthlySheet()}
          {currentSheet === 'action' && renderActionSheet()}
        </div>

      {/* 打印预览组件 */}
      {showPrintPreview && (
        <PrintPreview
          isOpen={showPrintPreview}
          title={`${sheets.find(s => s.key === currentSheet)?.label} (${new Date().getFullYear()}年)`}
          data={getCurrentSheetData()}
          columns={getCurrentSheetColumns()}
          filename={`${sheets.find(s => s.key === currentSheet)?.label}_${new Date().getFullYear()}`}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  )
}

export default AnnualPlanning
