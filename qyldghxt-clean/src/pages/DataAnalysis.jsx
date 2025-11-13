import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { BarChart3, TrendingUp, DollarSign, Target, Calendar, Users, Building2, AlertTriangle } from 'lucide-react'
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

const DataAnalysis = () => {
  const { 
    getDepartmentTargets, 
    getMajorEvents, 
    getMonthlyProgress,
    getAnnualWorkPlans,
    getDepartments,
    getEmployees
  } = useData()
  
  const [loading, setLoading] = useState(true)
  const [targets, setTargets] = useState([])
  const [events, setEvents] = useState([])
  const [progress, setProgress] = useState([])
  const [plans, setPlans] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [targetsRes, eventsRes, progressRes, plansRes, deptsRes, empsRes] = await Promise.all([
        getDepartmentTargets(),
        getMajorEvents(),
        getMonthlyProgress(),
        getAnnualWorkPlans(),
        getDepartments(),
        getEmployees()
      ])

      setTargets(targetsRes.data || [])
      setEvents(eventsRes.data || [])
      setProgress(progressRes.data || [])
      setPlans(plansRes.data || [])
      setDepartments(deptsRes.data || [])
      setEmployees(empsRes.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 按月份的销售数据
  const monthlySalesData = targets.reduce((acc, target) => {
    const month = target.month || 0
    if (!acc[month]) {
      acc[month] = { month: `${month}月`, amount: 0, profit: 0 }
    }
    acc[month].amount += target.sales_amount || 0
    acc[month].profit += target.profit || 0
    return acc
  }, {})

  const monthlyData = Object.values(monthlySalesData).sort((a, b) => {
    return parseInt(a.month) - parseInt(b.month)
  })

  // 部门业绩对比
  const departmentPerformance = departments.map(dept => {
    const deptTargets = targets.filter(t => t.department === dept.name)
    const totalSales = deptTargets.reduce((sum, t) => sum + (t.sales_amount || 0), 0)
    const totalProfit = deptTargets.reduce((sum, t) => sum + (t.profit || 0), 0)
    const staffCount = deptTargets.reduce((sum, t) => sum + (t.staff_count || 0), 0)
    
    return {
      name: dept.name,
      销售额: totalSales,
      利润: totalProfit,
      人均产值: staffCount > 0 ? totalProfit / staffCount : 0
    }
  })

  // 进度完成率
  const progressData = progress.map(item => ({
    name: item.target || '目标',
    完成率: (item.completion_progress || 0) * 100
  })).slice(0, 10)

  // 大事件分布
  const eventsDistribution = events.reduce((acc, event) => {
    const dimension = event.dimension || '其他'
    acc[dimension] = (acc[dimension] || 0) + 1
    return acc
  }, {})

  const eventsData = Object.entries(eventsDistribution).map(([name, value]) => ({
    name,
    value
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 - 优化版 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white overflow-hidden">
        {/* 背景装饰元素 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-blob"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-white rounded-full animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center mb-3">
              <div className="p-3 bg-gradient-to-r from-blue-300 to-purple-300 rounded-xl mr-4">
                <BarChart3 size={28} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">数据分析</h1>
            </div>
            <p className="text-blue-100 text-lg">企业年度规划数据综合分析</p>
          </div>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
          >
            <TrendingUp size={18} />
            <span>刷新数据</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 - 优化版 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
          {/* 悬停效果装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Building2 size={28} className="text-white" />
            </div>
            <div className="ml-5">
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {departments.length}
              </p>
              <p className="text-gray-600 font-medium mt-1">部门数量</p>
            </div>
          </div>
          
          {/* 底部装饰线 */}
          <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500 rounded-full"></div>
        </div>

        <div className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
          {/* 悬停效果装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users size={28} className="text-white" />
            </div>
            <div className="ml-5">
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {employees.length}
              </p>
              <p className="text-gray-600 font-medium mt-1">员工总数</p>
            </div>
          </div>
          
          {/* 底部装饰线 */}
          <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-green-500 to-blue-500 group-hover:w-full transition-all duration-500 rounded-full"></div>
        </div>

        <div className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
          {/* 悬停效果装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Target size={28} className="text-white" />
            </div>
            <div className="ml-5">
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {targets.length}
              </p>
              <p className="text-gray-600 font-medium mt-1">目标数量</p>
            </div>
          </div>
          
          {/* 底部装饰线 */}
          <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-500 rounded-full"></div>
        </div>

        <div className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
          {/* 悬停效果装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle size={28} className="text-white" />
            </div>
            <div className="ml-5">
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {events.length}
              </p>
              <p className="text-gray-600 font-medium mt-1">大事件数量</p>
            </div>
          </div>
          
          {/* 底部装饰线 */}
          <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 group-hover:w-full transition-all duration-500 rounded-full"></div>
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
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                月度销售额趋势
              </h3>
            </div>
            <div className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              实时数据
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                formatter={(value) => `¥${value.toLocaleString()}`}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Legend />
              <Bar dataKey="amount" fill="#8884d8" name="销售额" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#82ca9d" name="利润" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 部门业绩对比 */}
        <div className="group relative bg-gradient-to-br from-white/80 to-green-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-lg mr-4">
                <BarChart3 size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                部门业绩对比
              </h3>
            </div>
            <div className="text-sm font-medium bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              多维度分析
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                formatter={(value) => `¥${value.toLocaleString()}`}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="销售额" stroke="#8884d8" strokeWidth={3} dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="利润" stroke="#82ca9d" strokeWidth={3} dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 进度完成率 */}
        <div className="group relative bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg mr-4">
                <Target size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                进度完成率
              </h3>
            </div>
            <div className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              目标追踪
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                formatter={(value) => `${value.toFixed(1)}%`}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Legend />
              <Bar dataKey="完成率" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 大事件分布 */}
        <div className="group relative bg-gradient-to-br from-white/80 to-orange-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg mr-4">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                大事件分布
              </h3>
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

      {/* 数据汇总表格 - 现代化设计 */}
      <div className="bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg mr-4">
              <BarChart3 size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              数据汇总
            </h3>
          </div>
          <div className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            关键指标
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group relative bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2 font-medium">计划数</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{plans.length}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-md">
                <Calendar size={20} className="text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 group-hover:w-full transition-all duration-500 rounded-full"></div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg p-6 border border-green-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2 font-medium">推进计划</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">{progress.length}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-md">
                <TrendingUp size={20} className="text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-green-500 to-green-600 group-hover:w-full transition-all duration-500 rounded-full"></div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2 font-medium">大事件</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">{events.length}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-md">
                <AlertTriangle size={20} className="text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600 group-hover:w-full transition-all duration-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataAnalysis

