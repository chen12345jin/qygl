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
  Award
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// 优化的统计卡片组件
const StatCard = React.memo(({ stat, onClick }) => {
  const Icon = stat.icon
  return (
    <div 
      className={`${stat.bgColor} rounded-xl p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-100`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-2">{stat.title}</p>
          <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
        </div>
        <div className={`${stat.color} p-3 rounded-lg shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
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
  const { getDepartments, getEmployees, getDepartmentTargets, getActionPlans, getMonthlyProgress } = useData()
  const [stats, setStats] = useState({
    departments: 0,
    employees: 0,
    targets: 0,
    actionPlans: 0
  })
  const [chartData, setChartData] = useState([])

  // 使用useCallback优化数据加载函数
  const loadDashboardData = useCallback(async () => {
    try {
      const [deptResult, empResult, targetResult, planResult, monthlyResult] = await Promise.all([
        getDepartments(),
        getEmployees(),
        getDepartmentTargets({ year: new Date().getFullYear() }),
        getActionPlans(),
        getMonthlyProgress({ year: new Date().getFullYear() })
      ])

      // 安全地获取数组长度，确保数据是数组
      const getDepartmentCount = () => {
        if (deptResult?.success && Array.isArray(deptResult.data)) {
          return deptResult.data.length
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

      // 生成图表数据（改用月度推进数据：目标 vs 实际）
      if (monthlyResult?.success && Array.isArray(monthlyResult.data) && monthlyResult.data.length > 0) {
        const monthlyData = monthlyResult.data.reduce((acc, item) => {
          if (!item || typeof item !== 'object') return acc
          const m = `${item.month || 1}月`
          if (!acc[m]) acc[m] = { month: m, sales: 0, profit: 0 }
          acc[m].sales += Number(item.actual_value) || 0
          acc[m].profit += Number(item.target_value) || 0
          return acc
        }, {})
        const chartArray = Object.values(monthlyData)
        setChartData(Array.isArray(chartArray) ? chartArray : [])
      } else {
        setChartData([])
      }
    } catch (error) {
      console.error('加载仪表板数据失败:', error)
      // 设置默认值
      setStats({
        departments: 0,
        employees: 0,
        targets: 0,
        actionPlans: 0
      })
      setChartData([])
    }
  }, [getDepartments, getEmployees, getDepartmentTargets, getActionPlans])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

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

  return (
    <div className="space-y-8">
      {/* 欢迎区域 - 现代化设计 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white overflow-hidden">
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
              {user?.department || '未知部门'} · {user?.role || '未知角色'} · 今天是 {new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>
          <div 
            className="text-right cursor-pointer group"
            onClick={() => navigate('/annual-planning')}
          >
            <div className="text-4xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              2025
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
          className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
          onClick={() => navigate('/data-analysis')}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mr-3 shadow-md">
                <BarChart3 size={20} className="text-white" />
              </div>
              月度销售趋势
            </h2>
            <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              查看详情 →
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="sales" name="实际" fill="url(#salesGradient)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name="目标" fill="url(#profitGradient)" radius={[6, 6, 0, 0]} />
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
          <div className="space-y-4">
            <div 
              className="group relative flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-purple-200"
              onClick={() => navigate('/system/employees')}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                  <Users size={16} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">员工管理</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-purple-500 rounded-full shadow-sm"></div>
              </div>
            </div>
            <div 
              className="group relative flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-blue-200"
              onClick={() => navigate('/system/departments')}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                  <Building2 size={16} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">部门管理</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
              </div>
            </div>
            <div 
              className="group relative flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-green-200"
              onClick={() => navigate('/system/settings')}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                  <AlertTriangle size={16} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">系统设置</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
              </div>
            </div>
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
            <div 
              className="group relative flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-yellow-200"
              onClick={() => navigate('/system/settings')}
            >
              <div className="flex-shrink-0 w-3 h-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mt-2 shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                  2025年度规划系统正式上线
                </p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  请各部门及时完成目标分解和计划制定 - 2024年12月25日
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-sm"></div>
              </div>
            </div>
            <div 
              className="group relative flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-blue-200"
              onClick={() => navigate('/system/settings')}
            >
              <div className="flex-shrink-0 w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mt-2 shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                  钉钉集成功能已开放
                </p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  支持消息推送和审批流程同步 - 2024年12月20日
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
              </div>
            </div>
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
            <div 
              className="group relative flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200"
              onClick={() => navigate('/department-targets')}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-md">
                  <CheckSquare size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">销售部完成Q1目标设定</p>
                  <p className="text-xs text-gray-600 mt-1">张经理 · 2小时前</p>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
              </div>
            </div>
            <div 
              className="group relative flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200"
              onClick={() => navigate('/annual-work-plan')}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full flex items-center justify-center shadow-md">
                  <Calendar size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">生产部更新年度工作计划</p>
                  <p className="text-xs text-gray-600 mt-1">李主管 · 4小时前</p>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
              </div>
            </div>
            <div 
              className="group relative flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-200"
              onClick={() => navigate('/system/employees')}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-violet-100 rounded-full flex items-center justify-center shadow-md">
                  <Users size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">人事部新增5名员工信息</p>
                  <p className="text-xs text-gray-600 mt-1">王主管 · 6小时前</p>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-2 h-2 bg-purple-500 rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
