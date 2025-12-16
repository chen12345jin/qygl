import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { 
  Building2, 
  Users, 
  Target, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckSquare,
  BarChart3,
  DollarSign,
  Award,
  Info,
  GitBranch,
  Shield,
  FileText,
  Settings,
  Database
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts'
import { formatNumber as fmtNumber, formatDate } from '../utils/locale.js'

// 优化的统计卡片组件
const StatCard = React.memo(({ stat, onClick }) => {
  const Icon = stat.icon
  return (
    <div 
      className={`${stat.bgColor} rounded-xl p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-100`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
          <p className="text-gray-600 text-sm">{stat.title}</p>
        </div>
      </div>
    </div>
  )
})

// 优化的快速操作组件
const QuickActionCard = React.memo(({ action, onClick }) => {
  const Icon = action.icon
  return (
    <div 
      className="bg-white rounded-xl p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-100 group"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
          <Icon className={`w-8 h-8 ${action.color}`} />
        </div>
        <h3 className="font-semibold text-gray-800 group-hover:text-gray-900">{action.title}</h3>
      </div>
    </div>
  )
})

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getDepartments, getEmployees, getDepartmentTargets, getActionPlans, getMonthlyProgress, getNotifications, getAnnualWorkPlans, globalYear } = useData()
  const [stats, setStats] = useState({
    departments: 0,
    employees: 0,
    targets: 0,
    actionPlans: 0
  })
  const [chartData, setChartData] = useState([])
  const [notifications, setNotifications] = useState([])
  const [latestNews, setLatestNews] = useState([])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [deptResult, empResult, targetResult, planResult, monthlyResult, notifResult] = await Promise.all([
        getDepartments({ type: 'DEPT' }),
        getEmployees(),
        getDepartmentTargets(), // 获取所有年份的目标数据
        getActionPlans(),
        getMonthlyProgress({ year: globalYear }),
        getNotifications()
      ])

        if (notifResult?.success && Array.isArray(notifResult.data)) {
          setNotifications(notifResult.data.slice(0, 5))
        }

        const deptList = deptResult?.success && Array.isArray(deptResult.data) ? deptResult.data : []
        const getDeptName = (item) => {
          if (item.department && typeof item.department === 'string' && isNaN(Number(item.department))) return item.department
          if (item.department_name) return item.department_name
          const id = item.department_id || (Number(item.department) ? Number(item.department) : null)
          if (id) {
            const d = deptList.find(d => d.id == id)
            if (d) return d.name
          }
          return '未知部门'
        }

        let newsItems = []

        if (targetResult?.success && Array.isArray(targetResult.data)) {
          targetResult.data.forEach(item => {
            newsItems.push({
              id: `target-${item.id}`,
              type: 'target',
              title: `${getDeptName(item)} 更新了目标设定`,
              subtitle: `${item.responsible_person || '管理员'} · ${formatDate(item.created_at || new Date(), { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
              timestamp: new Date(item.created_at || new Date()).getTime(),
              icon: CheckSquare,
              color: 'text-green-600',
              bgColor: 'bg-green-100',
              bgGradient: 'from-green-100 to-emerald-100',
              dotColor: 'bg-green-500',
              path: '/department-targets'
            })
          })
        }

        const annualPlansRes = await getAnnualWorkPlans({ year: globalYear })
        if (annualPlansRes?.success && Array.isArray(annualPlansRes.data)) {
          annualPlansRes.data.forEach(item => {
            newsItems.push({
              id: `plan-${item.id}`,
              type: 'plan',
              title: `${getDeptName(item)} 更新了年度计划`,
              subtitle: `${item.responsible_person || '管理员'} · ${formatDate(item.created_at || new Date(), { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
              timestamp: new Date(item.created_at || new Date()).getTime(),
              icon: Calendar,
              color: 'text-blue-600',
              bgColor: 'bg-blue-100',
              bgGradient: 'from-blue-100 to-cyan-100',
              dotColor: 'bg-blue-500',
              path: '/annual-work-plan'
            })
          })
        }

        if (empResult?.success && Array.isArray(empResult.data)) {
          const recentEmps = empResult.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
          recentEmps.forEach(item => {
            newsItems.push({
              id: `emp-${item.id}`,
              type: 'employee',
              title: `${item.department || '人事部'} 新增员工: ${item.name}`,
              subtitle: `系统自动生成 · ${formatDate(item.created_at || new Date(), { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
              timestamp: new Date(item.created_at || new Date()).getTime(),
              icon: Users,
              color: 'text-purple-600',
              bgColor: 'bg-purple-100',
              bgGradient: 'from-purple-100 to-violet-100',
              dotColor: 'bg-purple-500',
              path: '/system/employees'
            })
          })
        }

        newsItems.sort((a, b) => b.timestamp - a.timestamp)
        setLatestNews(newsItems.slice(0, 5))

        const getDepartmentCount = () => {
          if (deptResult?.success && Array.isArray(deptResult.data)) {
            const realDepts = deptResult.data.filter(d => !d.name.includes('公司'))
            return realDepts.length
          }
          return 0
        }

        const getEmployeeCount = () => {
          if (empResult?.success && Array.isArray(empResult.data)) {
            return empResult.data.length
          }
          return 0
        }

        const getTargetCount = () => {
          if (targetResult?.success && Array.isArray(targetResult.data)) {
            return targetResult.data.length
          }
          return 0
        }

        const getPlanCount = () => {
          if (planResult?.success && Array.isArray(planResult.data)) {
            return planResult.data.length
          }
          return 0
        }

        setStats({
          departments: getDepartmentCount(),
          employees: getEmployeeCount(),
          targets: getTargetCount(),
          actionPlans: getPlanCount()
        })

        let chartArray = []
        if (monthlyResult?.success && Array.isArray(monthlyResult.data) && monthlyResult.data.length > 0) {
          const monthlyData = monthlyResult.data.reduce((acc, item) => {
            if (!item || typeof item !== 'object') return acc
            const monthNum = Number(item.month) || 1
            const m = `${monthNum}月`
            if (!acc[m]) acc[m] = { month: m, sales: 0, profit: 0 }
            acc[m].sales += Number(item.actual_value) || 0
            acc[m].profit += Number(item.target_value) || 0
            return acc
          }, {})
          const fullMonths = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
          chartArray = fullMonths.map(m => (
            monthlyData[m] ? monthlyData[m] : { month: m, sales: 0, profit: 0 }
          ))
        } else if (targetResult?.success && Array.isArray(targetResult.data) && targetResult.data.length > 0) {
          const targetMonthly = targetResult.data.reduce((acc, t) => {
            if (!t || typeof t !== 'object') return acc
            const monthNum = Number(t.month) || 1
            const m = `${monthNum}月`
            if (!acc[m]) acc[m] = { month: m, sales: 0, profit: 0 }
            acc[m].sales += Number(t.sales_amount) || 0
            acc[m].profit += Number(t.profit) || 0
            return acc
          }, {})
          const fullMonths = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
          chartArray = fullMonths.map(m => (
            targetMonthly[m] ? targetMonthly[m] : { month: m, sales: 0, profit: 0 }
          ))
        }
        // 确保至少有12个月的数据
        if (chartArray.length === 0) {
          chartArray = Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, sales: 0, profit: 0 }))
        }
        setChartData(chartArray)
      } catch (error) {
        console.error('加载仪表板数据失败:', error)
        setStats({
          departments: 0,
          employees: 0,
          targets: 0,
          actionPlans: 0
        })
        setChartData([])
      }
    }

    loadDashboardData()
  }, [globalYear])

  // 使用useMemo优化统计卡片数据
  const statCards = useMemo(() => [
    {
      title: '部门数量',
      value: stats.departments,
      icon: Building2,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      path: '/system/departments'
    },
    {
      title: '员工总数',
      value: stats.employees,  
      icon: Users,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      path: '/system/employees'
    },
    {
      title: '目标设定',
      value: stats.targets,
      icon: Target,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      path: '/department-targets'
    },
    {
      title: '行动计划',
      value: stats.actionPlans,
      icon: CheckSquare,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      path: '/action-plans'
    }
  ], [stats])

  // 使用useMemo优化快速操作数据
  const quickActions = useMemo(() => [
    { title: '部门目标分解', icon: Target, path: '/department-targets', color: 'text-blue-600' },
    { title: '年度工作规划', icon: Calendar, path: '/annual-work-plan', color: 'text-green-600' },
    { title: '大事件提炼', icon: AlertTriangle, path: '/major-events', color: 'text-red-600' },
    { title: '月度推进计划', icon: TrendingUp, path: '/monthly-progress', color: 'text-purple-600' },
    { title: '5W2H行动计划', icon: CheckSquare, path: '/action-plans', color: 'text-yellow-600' },
    { title: '年度规划表', icon: BarChart3, path: '/annual-planning-chart', color: 'text-indigo-600' }
  ], [])

  // 使用useCallback优化导航函数
  const handleNavigate = useCallback((path) => {
    navigate(path)
  }, [navigate])

  // 确保 chartData 是数组
  const safeChartData = useMemo(() => Array.isArray(chartData) ? chartData : [], [chartData])
  const avgSales = useMemo(() => {
    const arr = safeChartData || []
    if (!arr.length) return 0
    return arr.reduce((s, i) => s + (Number(i.sales) || 0), 0) / arr.length
  }, [safeChartData])
  const avgProfit = useMemo(() => {
    const arr = safeChartData || []
    if (!arr.length) return 0
    return arr.reduce((s, i) => s + (Number(i.profit) || 0), 0) / arr.length
  }, [safeChartData])
  // 动态计算Y轴最大值，让图表填满容器
  const yAxisMax = useMemo(() => {
    const arr = safeChartData || []
    if (!arr.length) return 1000
    const maxValue = Math.max(...arr.map(item => Math.max(Number(item.sales) || 0, Number(item.profit) || 0)))
    // 如果最大值为0，设置默认值
    if (maxValue === 0) return 1000
    // 向上取整到最近的千位或百位，确保有一定的顶部空间
    return Math.ceil(maxValue * 1.2 / 1000) * 1000
  }, [safeChartData])
  const formatNum = useCallback((v) => {
    return fmtNumber(v)
  }, [])

  return (
    <div className="space-y-8">
      {/* 欢迎区域 - 现代化设计 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white overflow-hidden min-h-[72px]">
        {/* 背景装饰元素 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-white rounded-full animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              欢迎回来，{user?.username || '用户'}！
            </h1>
            <p className="text-blue-100 text-lg">
              {user?.department || '未知部门'} · {user?.role || '未知角色'} · 今天是 {formatDate(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div 
            className="text-right cursor-pointer group"
            onClick={() => navigate('/annual-planning')}
          >
            <div className="text-4xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              {globalYear}
            </div>
            <div className="text-blue-200 font-medium group-hover:text-white transition-colors">年度规划进行中</div>
          </div>
        </div>
      </div>

      {/* 统计卡片 - 现代化设计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <StatCard 
            key={index} 
            stat={stat} 
            onClick={() => handleNavigate(stat.path)}
          />
        ))}
      </div>

      {/* 图表和快捷操作 - 现代化设计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 月度销售图表 */}
        <div 
          className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 flex flex-col"
          onClick={() => navigate('/data-analysis')}
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mr-3 shadow-md">
                <BarChart3 size={20} className="text-white" />
              </div>
              月度销售趋势
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center text-xs text-gray-700">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                实际
              </div>
              <div className="flex items-center text-xs text-gray-700">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                目标
              </div>
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                查看详情 →
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[220px] pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeChartData} margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
                <XAxis dataKey="month" stroke="#475569" fontSize={12} interval={0} tickMargin={4} />
                <YAxis stroke="#475569" fontSize={12} tickFormatter={formatNum} width={50} domain={[0, yAxisMax]} />
                <Tooltip 
                  formatter={(value, name) => [formatNum(value), name]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                />
                <ReferenceLine y={avgSales} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: '实际均值', position: 'right', fill: '#1e3a8a', fontSize: 10 }} />
                <ReferenceLine y={avgProfit} stroke="#10b981" strokeDasharray="4 4" label={{ value: '目标均值', position: 'right', fill: '#065f46', fontSize: 10 }} />
                <Bar dataKey="sales" name="实际" fill="url(#salesGradient)" radius={[6, 6, 0, 0]} isAnimationActive />
                <Bar dataKey="profit" name="目标" fill="url(#profitGradient)" radius={[6, 6, 0, 0]} isAnimationActive />
                <defs>
                  <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg mr-3">
                <TrendingUp size={20} className="text-white" />
              </div>
              快捷操作
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionCard 
                key={index} 
                action={action} 
                onClick={() => handleNavigate(action.path)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 管理员功能和系统公告 - 现代化设计 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 管理员功能 */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mr-3 shadow-md">
                <Users size={20} className="text-white" />
              </div>
              管理员功能
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: '公司信息', icon: Info, path: '/system/company-info', color: 'from-blue-500 to-cyan-500', bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200' },
              { title: '部门管理', icon: Building2, path: '/system/departments', color: 'from-indigo-500 to-purple-500', bg: 'from-indigo-50 to-purple-50', border: 'border-indigo-200' },
              { title: '员工管理', icon: Users, path: '/system/employees', color: 'from-purple-500 to-pink-500', bg: 'from-purple-50 to-pink-50', border: 'border-purple-200' },
              { title: '组织架构', icon: GitBranch, path: '/system/org-structure', color: 'from-pink-500 to-rose-500', bg: 'from-pink-50 to-rose-50', border: 'border-pink-200' },
              { title: '角色管理', icon: Shield, path: '/system/roles', color: 'from-orange-500 to-amber-500', bg: 'from-orange-50 to-amber-50', border: 'border-orange-200' },
              { title: '用户管理', icon: Users, path: '/system/users', color: 'from-amber-500 to-yellow-500', bg: 'from-amber-50 to-yellow-50', border: 'border-amber-200' },
              { title: '系统日志', icon: FileText, path: '/system/logs', color: 'from-lime-500 to-green-500', bg: 'from-lime-50 to-green-50', border: 'border-lime-200' },
              { title: '模板设置', icon: FileText, path: '/system/templates', color: 'from-emerald-500 to-teal-500', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200' },
              
              { title: '系统设置', icon: Settings, path: '/system/settings', color: 'from-teal-500 to-cyan-500', bg: 'from-teal-50 to-cyan-50', border: 'border-teal-200' },
            ].map((item, index) => (
              <div 
                key={index}
                className={`group relative flex items-center p-3 bg-gradient-to-r ${item.bg} rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300 border ${item.border}`}
                onClick={() => navigate(item.path)}
              >
                <div className={`w-8 h-8 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center shadow-md mr-3 shrink-0`}>
                  <item.icon size={16} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 truncate">{item.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 系统公告 */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg mr-3 shadow-md">
                <AlertTriangle size={20} className="text-white" />
              </div>
              系统公告
            </h2>
          </div>
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((item, index) => (
                <div 
                  key={item.id || index}
                  className="group relative flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-yellow-200"
                  onClick={() => navigate('/system/settings')}
                >
                  <div className="flex-shrink-0 w-3 h-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mt-2 shadow-sm"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                      {item.content} - {formatDate(item.created_at, { month: 'numeric', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-sm"></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无系统公告
              </div>
            )}
          </div>
        </div>

        {/* 最新动态 */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg mr-3 shadow-md">
                <TrendingUp size={20} className="text-white" />
              </div>
              最新动态
            </h2>
          </div>
          <div className="space-y-4">
            {latestNews.length > 0 ? (
              latestNews.map((item) => (
                <div 
                  key={item.id}
                  className="group relative flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200"
                  onClick={() => navigate(item.path)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 bg-gradient-to-r ${item.bgGradient} rounded-full flex items-center justify-center shadow-md`}>
                      <item.icon size={18} className={item.color} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`w-2 h-2 ${item.dotColor} rounded-full shadow-sm`}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无最新动态
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
