import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { BarChart3, TrendingUp, DollarSign, Target, Calendar, Users, Building2, AlertTriangle, CheckSquare } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
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
      const currentYear = new Date().getFullYear()
      const [targetsRes, eventsRes, progressRes, plansRes, deptsRes, empsRes] = await Promise.all([
        getDepartmentTargets({ year: currentYear }),
        getMajorEvents(),
        getMonthlyProgress({ year: currentYear }),
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

  // 按月份的销售数据（补齐 1-12 月）
  const monthlyByNum = targets.reduce((acc, target) => {
    const monthNum = Number(target.month) || 0
    if (monthNum >= 1 && monthNum <= 12) {
      if (!acc[monthNum]) {
        acc[monthNum] = { month: `${monthNum}月`, amount: 0, profit: 0 }
      }
      acc[monthNum].amount += Number(target.sales_amount) || 0
      acc[monthNum].profit += Number(target.profit) || 0
    }
    return acc
  }, {})

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return monthlyByNum[m] ? monthlyByNum[m] : { month: `${m}月`, amount: 0, profit: 0 }
  })

  // 部门完成率对比
  const departmentCompletionRate = departments.map(dept => {
    const deptTargets = targets.filter(t => t.department === dept.name)
    const planned = deptTargets.reduce((sum, t) => sum + (t.sales_amount || 0), 0)
    const actual = deptTargets.reduce((sum, t) => sum + (t.profit || 0), 0)

    return {
      name: dept.name,
      完成率: planned > 0 ? (actual / planned) * 100 : 0
    }
  })

  // 进度完成率
  const progressData = progress
    .map(item => {
      const target = Number(item.target_value) || 0
      const actual = Number(item.actual_value) || 0
      const rate = target > 0 ? (actual / target) * 100 : 0
      return {
        name: item.task_name || `${item.month || ''}月` || '目标',
        完成率: rate
      }
    })
    .sort((a, b) => {
      const am = Number(String(a.name).replace('月', '')) || 0
      const bm = Number(String(b.name).replace('月', '')) || 0
      return am - bm
    })
    .slice(0, 10)

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
  const totalCompletion = progress.reduce((sum, item) => sum + (item.completion_progress || 0), 0)
  const completionRate = progress.length > 0 ? (totalCompletion / progress.length) * 100 : 0
  const currentMonth = new Date().getMonth() + 1
  const monthlyOutput = targets
    .filter(t => (t.month || 0) === currentMonth)
    .reduce((sum, t) => sum + (t.sales_amount || 0), 0)
  const yearlyOutput = targets.reduce((sum, t) => sum + (t.sales_amount || 0), 0)
  const formatWan = (num) => {
    const n = Number(num || 0)
    if (n >= 10000) return `${(n / 10000).toFixed(2)}万`
    return n.toLocaleString()
  }
  const healthIndex = Math.max(0, Math.min(200, Math.round((completionRate / 2) + 100 - (events.length * 1))))
  const plansCompleted = Array.isArray(plans) ? plans.filter(p => String(p.status).toLowerCase() === 'completed').length : 0

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
                <th className="text-left py-3 px-4">统计维度</th>
                <th className="text-left py-3 px-4">数值</th>
                <th className="text-left py-3 px-4">完成率</th>
                <th className="text-left py-3 px-4">区域</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="py-3 px-4">部门数量</td>
                <td className="py-3 px-4">{new Set(targets.map(t => t.department)).size}</td>
                <td className="py-3 px-4">{completionRate.toFixed(1)}%</td>
                <td className="py-3 px-4">全局</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-3 px-4">目标数量</td>
                <td className="py-3 px-4">{targets.length}</td>
                <td className="py-3 px-4">{completionRate.toFixed(1)}%</td>
                <td className="py-3 px-4">全局</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-3 px-4">事件数量</td>
                <td className="py-3 px-4">{events.length}</td>
                <td className="py-3 px-4">{Math.max(0, (100 - events.length)).toFixed(0)}%</td>
                <td className="py-3 px-4">全局</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-3 px-4">活跃用户数</td>
                <td className="py-3 px-4">{employees.length}</td>
                <td className="py-3 px-4">—</td>
                <td className="py-3 px-4">全局</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DataAnalysis

