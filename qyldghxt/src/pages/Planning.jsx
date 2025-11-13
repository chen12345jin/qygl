import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { Calendar, Target, Users, TrendingUp, FileText, Download, Eye } from 'lucide-react'
import { exportToExcel } from '../utils/export'
import PrintPreview from '../components/PrintPreview'
import toast from 'react-hot-toast'

const Planning = () => {
  const { 
    getDepartments, 
    getDepartmentTargets, 
    getAnnualWorkPlans, 
    getMajorEvents, 
    getActionPlans 
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

  const loadPlanningData = async () => {
    setLoading(true)
    try {
      const [deptResult, targetResult, planResult, eventResult, actionResult] = await Promise.all([
        getDepartments(),
        getDepartmentTargets({ year: selectedYear }),
        getAnnualWorkPlans(),
        getMajorEvents(),
        getActionPlans()
      ])

      setPlanningData({
        departments: deptResult?.data || [],
        targets: targetResult?.data || [],
        workPlans: planResult?.data || [],
        majorEvents: eventResult?.data || [],
        actionPlans: actionResult?.data || []
      })
    } catch (error) {
      console.error('加载规划数据失败:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

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
        { key: 'target_type', label: '目标类型' },
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
            <option value={2024}>2024年</option>
            <option value={2025}>2025年</option>
            <option value={2026}>2026年</option>
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
