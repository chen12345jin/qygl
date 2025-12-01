import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { Calendar, Target, Users, TrendingUp, FileText, Download, Eye } from 'lucide-react'
import { exportToExcel } from '../utils/export'
import PrintPreview from '../components/PrintPreview'
import toast from 'react-hot-toast'
import { computeActionPlanStatus } from '../utils/status'

const Planning = () => {
  const { 
    getDepartments, 
    getDepartmentTargets, 
    getAnnualWorkPlans, 
    getMajorEvents, 
    getActionPlans,
    getSystemSettings
  } = useData()
  
  const [planningData, setPlanningData] = useState({
    departments: [],
    targets: [],
    workPlans: [],
    majorEvents: [],
    actionPlans: []
  })
  
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [years, setYears] = useState([2024, 2025, 2026])
  const [apFilters, setApFilters] = useState({ department: '', status: '', month: '' })
  const [previewData, setPreviewData] = useState({
    isOpen: false,
    title: '',
    data: [],
    columns: [],
    filename: ''
  })

  useEffect(() => {
    loadPlanningData()
  }, [selectedYear])

  const computeStatus = (progress, when) => computeActionPlanStatus(progress, when)

  const loadPlanningData = async () => {
    setLoading(true)
    try {
      // 读取系统设置中的年份列表与行动计划筛选（保持与行动计划页面一致）
      try {
        const settingsRes = await getSystemSettings()
        const settings = settingsRes?.data || []
        const found = settings.find(s => s.key === 'planningYears')
        const currentFound = settings.find(s => s.key === 'currentPlanningYear')
        const apf = settings.find(s => s.key === 'currentActionPlansFilters')
        if (found && Array.isArray(found.value)) setYears(found.value)
        if (currentFound && (typeof currentFound.value === 'number' || typeof currentFound.value === 'string')) {
          const y = parseInt(currentFound.value)
          if (!isNaN(y)) setSelectedYear(y)
        }
        if (apf && typeof apf.value === 'object') {
          const v = apf.value || {}
          setApFilters({
            department: v.department || '',
            status: v.status || '',
            month: v.month || ''
          })
        }
      } catch (_) {}

      const [deptResult, targetResult, planResult, eventResult, actionResult] = await Promise.all([
        getDepartments(),
        getDepartmentTargets({ year: selectedYear }),
        getAnnualWorkPlans({ year: selectedYear }),
        getMajorEvents({ year: selectedYear }),
        getActionPlans({ year: selectedYear, department: apFilters.department, status: apFilters.status })
      ])

      const rawAP = actionResult?.data || []
      let apList = rawAP
      if (apFilters.month) {
        const m = parseInt(apFilters.month)
        apList = rawAP.filter(p => {
          const w = p.when
          if (!w) return false
          const d = new Date(w)
          if (!isNaN(d)) return (d.getMonth() + 1) === m
          if (typeof w === 'string') {
            const parts = w.split(/[-\/]/)
            if (parts.length >= 2) {
              const mm = parseInt(parts[1])
              if (!isNaN(mm)) return mm === m
            }
          }
          return false
        })
      }

      setPlanningData({
        departments: deptResult?.data || [],
        targets: targetResult?.data || [],
        workPlans: planResult?.data || [],
        majorEvents: eventResult?.data || [],
        actionPlans: apList.map(p => ({ ...p, status: computeStatus(p.progress, p.when) }))
      })
    } catch (error) {
      console.error('加载规划数据失败:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      const room = d.room || ''
      if (room === 'actionPlans' || room === 'annualWorkPlans') {
        if (!d.year || d.year === selectedYear) {
          loadPlanningData()
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => window.removeEventListener('dataUpdated', handler)
  }, [selectedYear])

  const handleExport = async (dataType, data, filename) => {
    try {
      await exportToExcel(data, filename, 'Sheet1', dataType)
      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败')
      console.error('Export error:', error)
    }
  }

  const handlePreview = (title, data, columns, filename) => {
    setPreviewData({
      isOpen: true,
      title,
      data: Array.isArray(data) ? data : [],
      columns: Array.isArray(columns) ? columns : [],
      filename
    })
  }

  const planningModules = [
    {
      title: '部门目标分解',
      icon: Target,
      color: 'bg-blue-500',
      data: planningData.targets,
      columns: [
        { key: 'department', label: '部门' },
        { key: 'target_type', label: '目标类型', render: (v) => ({
          sales: '销售',
          profit: '利润',
          project: '项目',
          efficiency: '效率',
          quality: '质量',
          cost: '成本'
        })[v] || v },
        { key: 'month', label: '月份' },
        { key: 'sales_amount', label: '销售额' },
        { key: 'profit', label: '利润' },
        { key: 'completion_rate', label: '完成率' }
      ],
      dataType: 'departmentTargets',
      filename: '部门目标分解'
    },
    {
      title: '年度工作规划',
      icon: Calendar,
      color: 'bg-green-500',
      data: planningData.workPlans,
      columns: [
        { key: 'department', label: '部门' },
        { key: 'plan_name', label: '计划名称' },
        { key: 'objective', label: '目标' },
        { key: 'timeline', label: '时间线' },
        { key: 'responsible_person', label: '负责人' },
        { key: 'status', label: '状态' }
      ],
      dataType: 'annualWorkPlans',
      filename: '年度工作规划'
    },
    {
      title: '大事件提炼',
      icon: TrendingUp,
      color: 'bg-purple-500',
      data: planningData.majorEvents,
      columns: [
        { key: 'event_name', label: '事件名称' },
        { key: 'event_type', label: '事件类型' },
        { key: 'priority', label: '优先级' },
        { key: 'responsible_department', label: '负责部门' },
        { key: 'start_date', label: '开始日期' },
        { key: 'status', label: '状态' }
      ],
      dataType: 'majorEvents',
      filename: '大事件提炼'
    },
    {
      title: '5W2H行动计划',
      icon: Users,
      color: 'bg-orange-500',
      data: planningData.actionPlans,
      columns: [
        { key: 'what', label: '做什么' },
        { key: 'why', label: '为什么' },
        { key: 'who', label: '谁来做' },
        { key: 'when', label: '什么时候' },
        { key: 'where', label: '在哪里' },
        { key: 'how', label: '怎么做' },
        { key: 'how_much', label: '多少钱' }
      ],
      dataType: 'actionPlans',
      filename: '5W2H行动计划'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">规划统览</h1>
          <p className="text-gray-600 mt-1">查看和管理企业年度规划的各个模块</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="form-select"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">
                {planningData.targets.length}
              </p>
              <p className="text-gray-600">目标设定</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">
                {planningData.workPlans.length}
              </p>
              <p className="text-gray-600">工作规划</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">
                {planningData.majorEvents.length}
              </p>
              <p className="text-gray-600">大事件</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-100">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">
                {planningData.actionPlans.length}
              </p>
              <p className="text-gray-600">行动计划</p>
            </div>
          </div>
        </div>
      </div>

      {/* 规划模块 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {planningModules.map((module, index) => (
          <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${module.color}`}>
                    <module.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      共 {module.data.length} 条记录
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreview(
                      module.title,
                      module.data,
                      module.columns,
                      module.filename
                    )}
                    className="btn-secondary flex items-center space-x-2"
                    title="预览"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleExport(
                      module.dataType,
                      module.data,
                      module.filename
                    )}
                    className="btn-primary flex items-center space-x-2"
                    title="导出Excel"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              {/* 数据预览 */}
              <div className="bg-gray-50 rounded-lg p-4">
                {module.data.length > 0 ? (
                  <div className="space-y-2">
                    {module.data.slice(0, 3).map((item, itemIndex) => (
                      <div 
                        key={itemIndex}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <span className="text-sm font-medium">
                          {item[module.columns[0]?.key] || '未命名'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.status || '进行中'}
                        </span>
                      </div>
                    ))}
                    {module.data.length > 3 && (
                      <div className="text-center text-sm text-gray-500 pt-2">
                        还有 {module.data.length - 3} 条记录...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    暂无数据
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 全部导出 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">批量操作</h3>
            <p className="text-gray-600 mt-1">一键导出所有规划数据</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                // 批量导出所有数据
                planningModules.forEach(module => {
                  if (module.data.length > 0) {
                    handleExport(module.dataType, module.data, module.filename)
                  }
                })
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Download size={16} />
              <span>导出所有数据</span>
            </button>
          </div>
        </div>
      </div>

      {/* 打印预览组件 */}
      <PrintPreview
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData(prev => ({ ...prev, isOpen: false }))}
        title={previewData.title}
        data={previewData.data}
        columns={previewData.columns}
        filename={previewData.filename}
      />
    </div>
  )
}

export default Planning
