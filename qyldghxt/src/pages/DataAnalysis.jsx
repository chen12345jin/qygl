import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { BarChart3, TrendingUp, TrendingDown, Minus, DollarSign, Target, Calendar, Users, Building2, AlertTriangle, CheckSquare } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import { formatNumber, getLocalePrefs } from '../utils/locale.js'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

import Pagination from '../components/Pagination'

const DataAnalysis = () => {
  const { 
    globalYear, setGlobalYear, // 获取全局年份和设置方法
    getDepartmentTargets, 
    getMajorEvents, 
    getMonthlyProgress,
    getAnnualWorkPlans,
    getActionPlans,
    getDepartments,
    getEmployees
  } = useData()
  
  // 年份相关状态
  const selectedYear = globalYear
  const setSelectedYear = setGlobalYear
  const [years, setYears] = useState([2024, 2025, 2026])
  
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 })
  const [targets, setTargets] = useState([])
  const [events, setEvents] = useState([])
  const [progress, setProgress] = useState([])
  const [plans, setPlans] = useState([])
  const [actions, setActions] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [completionStats, setCompletionStats] = useState({
    overall: { rate: 0, completed: 0, total: 0 }
  })

  // 确保targets始终是数组
  const safeTargets = Array.isArray(targets) ? targets : []

  useEffect(() => {
    loadData()
  }, [globalYear]) // 监听年份变化

  // 监听实时数据更新事件
  useEffect(() => {
    const handleDataUpdate = (event) => {
      const { detail } = event;
      // 当任何相关数据发生变化时，重新加载数据
      if (['departmentTargets', 'majorEvents', 'monthlyProgress', 'annualWorkPlans', 'actionPlans'].includes(detail.room)) {
        loadData();
      }
    };

    // 添加事件监听器
    window.addEventListener('dataUpdated', handleDataUpdate);

    // 组件卸载时移除事件监听器
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // 使用全局年份而非当前系统年份
      const [targetsRes, eventsRes, progressRes, plansRes, actionsRes, deptsRes, empsRes] = await Promise.all([
        getDepartmentTargets({ year: globalYear }),
        getMajorEvents({ year: globalYear }),
        getMonthlyProgress({ year: globalYear }),
        getAnnualWorkPlans({ year: globalYear }),
        getActionPlans({ year: globalYear }),
        getDepartments(),
        getEmployees()
      ])

      const t = targetsRes.data || []
      const e = eventsRes.data || []
      const p = progressRes.data || []
      const pl = plansRes.data || []
      const a = actionsRes.data || []

      setTargets(t)
      setEvents(e)
      setProgress(p)
      setPlans(pl)
      setActions(a)
      // 过滤掉包含"公司"的部门节点，避免在图表和表格中显示公司层级数据
      setDepartments((deptsRes.data || []).filter(d => !d.name.includes('公司')))
      setEmployees(empsRes.data || [])

      calculateCompletionStats(pl, t, p, e, a)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算各模块完成度统计
  const calculateCompletionStats = (annualPlans, targetsParam, monthlyProgress, majorEvents, actionPlans) => {
    // 总目标完成率 - 使用实际值/目标值的比例
    const totalTargetValue = safeTargets.reduce((sum, t) => sum + (Number(t.target_value) || 0), 0)
    const totalActualValue = safeTargets.reduce((sum, t) => sum + (Number(t.current_value) || 0), 0)
    const overallRate = totalTargetValue > 0 ? Math.round((totalActualValue / totalTargetValue) * 100) : 0
    
    // 计算计划完成数 - 统计所有已完成的项目
    const totalCompleted = safeTargets.filter(t => {
      const targetVal = Number(t.target_value) || 0
      const currentVal = Number(t.current_value) || 0
      return targetVal > 0 && currentVal >= targetVal
    }).length
    
    // 计算总项目数
    const totalItems = safeTargets.length

    setCompletionStats({
      overall: {
        total: totalItems,
        completed: totalCompleted,
        rate: overallRate
      }
    })
  }

  // 按月份的销售数据（补齐 1-12 月）
  const monthlyByNum = (Array.isArray(targets) ? targets : []).reduce((acc, target) => {
    const monthNum = Number(target.month) || 0
    if (monthNum >= 1 && monthNum <= 12) {
      if (!acc[monthNum]) {
        acc[monthNum] = { month: `${monthNum}月`, amount: 0, profit: 0 }
      }
      acc[monthNum].amount += Number(target.target_value) || 0
      acc[monthNum].profit += Number(target.current_value) || 0
    }
    return acc
  }, {})

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return monthlyByNum[m] ? monthlyByNum[m] : { month: `${m}月`, amount: 0, profit: 0 }
  })

  

  // 部门完成率对比
  const departmentCompletionRate = departments.map(dept => {
    const deptTargets = safeTargets.filter(t => t.department === dept.name || t.department_name === dept.name)
    const planned = deptTargets.reduce((sum, t) => sum + (t.target_value || 0), 0)
    const actual = deptTargets.reduce((sum, t) => sum + (t.current_value || 0), 0)

    return {
      name: dept.name,
      完成率: planned > 0 ? (actual / planned) * 100 : 0
    }
  })

  // 进度完成率 - 优化计算逻辑
  const progressData = progress
    .map(item => {
      const target = Number(item.target_value) || 0
      const actual = Number(item.actual_value) || 0
      let rate = target > 0 ? (actual / target) * 100 : 0
      
      // 如果没有目标值，尝试使用 completion_rate
      if (target === 0 && item.completion_rate) {
        rate = parseFloat(item.completion_rate) || 0
      }
      
      // 基于状态计算完成率
      const status = String(item.status || '').toLowerCase()
      if (status === 'completed') {
        rate = 100
      } else if (status === 'in_progress' || status === 'on_track') {
        rate = 50 // 进行中的任务默认50%完成率
      } else if (status === 'ahead') {
        rate = 75 // 超前的任务默认75%完成率
      }

      return {
        name: item.task_name || `${item.month || ''}月任务` || '目标',
        完成率: rate
      }
    })
    .sort((a, b) => {
      // 按月份排序
      const am = Number(a.month) || 0
      const bm = Number(b.month) || 0
      return am - bm
    })
    .slice(0, 10)

  // 大事件分布
  // 事件类型中英文映射
  const eventTypeMap = {
    'market': '市场活动',
    'product': '产品发布',
    'operation': '运营活动',
    'finance': '财务事件',
    'human_resource': '人力资源',
    'technology': '技术升级',
    'opportunity': '机遇事件',
    'strategic': '战略事件',
    'risk': '风险事件',
    'operational': '运营事件',
    'other': '其他事件'
  }

  const eventsDistribution = events.reduce((acc, event) => {
    const eventType = event.event_type || 'other'
    const dimension = eventTypeMap[eventType] || eventTypeMap['other']
    acc[dimension] = (acc[dimension] || 0) + 1
    return acc
  }, {})

  const eventsData = Object.entries(eventsDistribution).map(([name, value]) => ({
    name,
    value
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']
  
  // 计算总目标完成率 - 使用实际值/目标值的比例
  const totalTargetValue = safeTargets.reduce((sum, t) => sum + (Number(t.target_value) || 0), 0)
  const totalActualValue = safeTargets.reduce((sum, t) => sum + (Number(t.current_value) || 0), 0)
  const completionRate = totalTargetValue > 0 ? (totalActualValue / totalTargetValue) * 100 : 0
  
  // 计算计划完成数 - 统计所有已完成的项目
  const plansCompleted = safeTargets.filter(t => {
    const targetVal = Number(t.target_value) || 0
    const currentVal = Number(t.current_value) || 0
    return targetVal > 0 && currentVal >= targetVal
  }).length
  
  // 计算本月销售额 - 使用所选年份的当前月份
  const currentMonth = new Date().getMonth() + 1
  const monthlyOutput = safeTargets
    .filter(t => {
      const month = Number(t.month) || 0
      return month === currentMonth
    })
    .reduce((sum, t) => sum + (Number(t.current_value) || 0), 0)
  const yearlyOutput = safeTargets.reduce((sum, t) => sum + (Number(t.current_value) || 0), 0)
  const formatWan = (num) => {
    const n = Number(num || 0)
    if (n >= 10000) {
      const s = formatNumber(n / 10000, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const lang = getLocalePrefs().language || 'zh-CN'
      return `${s}${lang.startsWith('zh') ? '万' : ''}`
    }
    return formatNumber(n)
  }
  const healthIndex = Math.max(0, Math.min(200, Math.round((completionRate / 2) + 100 - (events.length * 1))))
  
  // 表格数据准备
  const yearlyTargetVal = safeTargets.reduce((sum, t) => sum + (Number(t.target_value) || 0), 0)
  const yearlyActualVal = safeTargets.reduce((sum, t) => sum + (Number(t.current_value) || 0), 0)
  
  const currentMonthTargetVal = safeTargets
    .filter(t => Number(t.month) === currentMonth)
    .reduce((sum, t) => sum + (Number(t.target_value) || 0), 0)
  const currentMonthActualVal = safeTargets
    .filter(t => Number(t.month) === currentMonth)
    .reduce((sum, t) => sum + (Number(t.current_value) || 0), 0)

  const analysisTableData = [
    {
      name: '年度总销售额',
      target: yearlyTargetVal,
      actual: yearlyActualVal,
    },
    {
      name: `${currentMonth}月销售额`,
      target: currentMonthTargetVal,
      actual: currentMonthActualVal,
    },
    ...departments.map(dept => {
      const deptTargets = safeTargets.filter(t => t.department === dept.name || t.department_name === dept.name)
      const t = deptTargets.reduce((sum, i) => sum + (Number(i.target_value) || 0), 0)
      const a = deptTargets.reduce((sum, i) => sum + (Number(i.current_value) || 0), 0)
      return {
        name: `${dept.name}`,
        target: t,
        actual: a,
      }
    })
  ]

  // 分页逻辑
  const startIndex = (pagination.page - 1) * pagination.pageSize
  const endIndex = startIndex + pagination.pageSize
  const currentTableData = analysisTableData.slice(startIndex, endIndex)

  const getTrendStatus = (row, rate) => {
    // 1. 完成率 >= 100% 直接返回超额
    if (rate >= 100) {
      return { text: '超额', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' }
    }

    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), month, 0).getDate()
    
    let expectedProgress = 0
    let isStartOfPeriod = false
    
    // 判断是否为当月数据行
    if (row.name.includes(`${month}月`)) {
      expectedProgress = (day / daysInMonth) * 100
      // 月初前5天，进度要求放宽
      if (day <= 5) isStartOfPeriod = true
    } else {
      // 年度或部门数据（按年度进度）
      const yearProgress = (now.getMonth() + (day / daysInMonth)) / 12 * 100
      expectedProgress = yearProgress
      // 年初（1月）进度要求放宽
      if (month === 1) isStartOfPeriod = true
    }

    // 2. 周期初期特殊处理：只要有进展或偏差不大就算正常
    if (isStartOfPeriod) {
      // 如果是初期，允许较大偏差（例如只完成了预期的 50% 也算正常，因为基数小）
      if (rate >= expectedProgress * 0.5) {
        return { text: '正常', icon: Minus, color: 'text-blue-600', bg: 'bg-blue-50' }
      }
    }

    // 3. 常规判断逻辑
    if (rate >= expectedProgress * 1.05) {
      return { text: '超额', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' }
    } else if (rate >= expectedProgress * 0.9) {
      return { text: '正常', icon: Minus, color: 'text-blue-600', bg: 'bg-blue-50' }
    } else {
      return { text: '滞后', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeaderBanner
        title="数据分析"
        subTitle="指标概览与趋势分析"
        year={selectedYear}
        onYearChange={setSelectedYear}
        years={years}
        right={(
          <button
            onClick={loadData}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
          >
            <TrendingUp size={18} />
            <span>刷新数据</span>
          </button>
        )}
      />

      {/* 顶部指标条 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center justify-between h-20 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md">
          <div className="flex items-center space-x-3">
            <Target size={24} className="opacity-90" />
            <span className="text-sm">总目标完成率</span>
          </div>
          <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
        </div>
        <div className="flex items-center justify-between h-20 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-md">
          <div className="flex items-center space-x-3">
            <DollarSign size={24} className="opacity-90" />
            <span className="text-sm">本月销售额</span>
          </div>
          <div className="text-2xl font-bold">{formatWan(monthlyOutput)}</div>
        </div>
        <div className="flex items-center justify-between h-20 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-md">
          <div className="flex items-center space-x-3">
            <Users size={24} className="opacity-90" />
            <span className="text-sm">活跃用户数</span>
          </div>
          <div className="text-2xl font-bold">{employees.length}</div>
        </div>
        <div className="flex items-center justify-between h-20 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white shadow-md">
          <div className="flex items-center space-x-3">
            <CheckSquare size={24} className="opacity-90" />
            <span className="text-sm">计划完成数</span>
          </div>
          <div className="text-2xl font-bold">{plansCompleted}</div>
        </div>
      </div>

      {/* 图表区域 - 现代化设计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度销售额趋势 */}
        <div className="group relative bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg mr-4">
                <TrendingUp size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">月度目标完成趋势</h3>
            </div>
            <div className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              实时数据
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" fontSize={12} interval={0} tickMargin={2} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                formatter={(value) => `¥${formatNumber(value)}`}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Legend />
              <Bar dataKey="amount" fill="#8884d8" name="计划值" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#82ca9d" name="实际值" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 部门完成率对比 */}
        <div className="group relative bg-gradient-to-br from-white/80 to-green-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-lg mr-4">
                <BarChart3 size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">部门完成率对比</h3>
            </div>
            <div className="text-sm font-medium bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              多维度分析
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentCompletionRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
              <Tooltip 
                formatter={(value) => `${Number(value).toFixed(1)}%`}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Legend />
              <Bar dataKey="完成率" name="完成率" fill="#82ca9d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 进度完成率 */}
        <div className="group relative bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg mr-4">
                <Target size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">项目推进趋势</h3>
            </div>
            <div className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              目标追踪
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                formatter={(value) => `${Number(value).toFixed(1)}%`}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="完成率" stroke="#8884d8" strokeWidth={3} dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 大事件分布 */}
        <div className="group relative bg-gradient-to-br from-white/80 to-orange-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg mr-4">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">事件状态分析</h3>
            </div>
            <div className="text-sm font-medium bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              事件分析
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={eventsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {eventsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg mr-4">
              <BarChart3 size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">详细数据分析</h3>
          </div>
          <div className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">概览</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="text-left py-3 px-4">指标</th>
                <th className="text-left py-3 px-4">目标值</th>
                <th className="text-left py-3 px-4">实际值</th>
                <th className="text-left py-3 px-4">完成率</th>
                <th className="text-left py-3 px-4">趋势</th>
              </tr>
            </thead>
            <tbody>
              {currentTableData.map((row, index) => {
                const rate = row.target > 0 ? (row.actual / row.target) * 100 : 0
                const status = getTrendStatus(row, rate)
                const StatusIcon = status.icon
                
                return (
                  <tr key={index} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{row.name}</td>
                    <td className="py-3 px-4 text-gray-600">¥{formatNumber(row.target)}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">¥{formatNumber(row.actual)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className={`mr-2 font-bold ${rate >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                          {rate.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${rate >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, rate)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center ${status.color} ${status.bg} px-2 py-1 rounded-full w-fit`}>
                        <StatusIcon size={14} className="mr-1" />
                        <span className="text-xs font-bold">{status.text}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={analysisTableData.length}
            onChange={(p) => setPagination(p)}
            className="mt-4 border-none"
          />
        </div>
      </div>
    </div>
  )
}

export default DataAnalysis

