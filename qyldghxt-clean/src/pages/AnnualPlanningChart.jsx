import React, { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { Download, Printer, Filter, BarChart3, Calendar, Target, TrendingUp, FileText, Building, ShoppingBag, Cloud, Users } from 'lucide-react'
import { exportToPDF, printElement } from '../utils/export'

const AnnualPlanningChart = () => {
  const { getAnnualPlans, getDepartments } = useData()
  const [data, setData] = useState([])
  const [departments, setDepartments] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadData()
  }, [year])

  const loadData = async () => {
    const [planResult, deptResult] = await Promise.all([
      getAnnualPlans({ year, sheet_type: 'planning' }),
      getDepartments()
    ])
    
    if (planResult.success) {
      // 将年度规划数据转换为图表需要的格式
      const chartData = transformAnnualPlansToChartData(planResult.data)
      setData(chartData)
    }
    if (deptResult.success) {
      setDepartments(deptResult.data)
    }
  }

  // 将年度规划数据转换为图表需要的格式
  const transformAnnualPlansToChartData = (annualPlans) => {
    const chartData = []
    
    // 为每个部门和月份创建默认数据
    const mainDepartments = ['平台部', 'SHEIN', '阿里部', '国内定制']
    
    // 生成1-12月的默认数据
    for (let month = 1; month <= 12; month++) {
      mainDepartments.forEach(department => {
        // 查找对应的年度规划数据
        const plan = annualPlans.find(p => 
          p.department_name === department && 
          p.month === month
        )
        
        chartData.push({
          month: month,
          department: department,
          sales_amount: plan ? (plan.target_value || 0) : 0,
          target_level: plan ? (plan.target_level || 'A') : 'A',
          description: plan ? plan.description : ''
        })
      })
    }
    
    return chartData
  }

  const getMonthData = (month, department) => {
    return data.find(d => d.month === month && d.department === department) || {}
  }

  const getMonthlyTotal = (month) => {
    return data.filter(d => d.month === month).reduce((sum, item) => sum + (item.sales_amount || 0), 0)
  }

  const getDepartmentTotal = (department) => {
    return data.filter(d => d.department === department).reduce((sum, item) => sum + (item.sales_amount || 0), 0)
  }

  const getGrandTotal = () => {
    return data.reduce((sum, item) => sum + (item.sales_amount || 0), 0)
  }

  const monthThemes = {
    1: { name: '规划导航月', color: 'month-planning' },
    2: { name: '招聘月', color: 'month-recruit' },
    3: { name: '人才引备战月', color: 'month-talent' },
    4: { name: '产品月', color: 'month-product' },
    5: { name: '产品月', color: 'month-product' },
    6: { name: '年中总结月', color: 'month-summary' },
    7: { name: '学习月', color: 'month-study' },
    8: { name: '备战月', color: 'month-battle' },
    9: { name: '抢战月', color: 'month-sprint' },
    10: { name: '丰收月', color: 'month-harvest' },
    11: { name: '冲刺月', color: 'month-impact' },
    12: { name: '总结月', color: 'month-total' }
  }

  const mainDepartments = ['平台部', 'SHEIN', '阿里部', '国内定制']

  return (
    <div className="space-y-8">
      {/* 年度规划图表 - 现代化设计 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
        {/* 标题区域 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                泉州太禾服饰有限公司 {year}年 年度规划表
              </h1>
              <p className="text-gray-600 mt-1">年度业务目标与进度可视化分析</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-xl">
              <Calendar className="w-4 h-4 text-blue-600" />
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="bg-transparent border-none focus:outline-none text-blue-700 font-medium"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => printElement('annual-chart')}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300"
              >
                <Printer size={18} />
                <span>打印</span>
              </button>
              <button
                onClick={() => exportToPDF('annual-chart', `年度规划表_${year}`)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300"
              >
                <Download size={18} />
                <span>导出PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div id="annual-chart" className="overflow-x-auto">
          {/* 表格标题 */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-3 rounded-2xl">
              <Target className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">月度业务目标</h2>
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          
          {/* 现代化表格容器 */}
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full">
              <thead>
                {/* 第一行表头 */}
                <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <th rowSpan="2" className="px-6 py-4 text-center border-r border-white/30">
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>月份</span>
                    </div>
                  </th>
                  <th rowSpan="2" className="px-6 py-4 text-center border-r border-white/30">
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>主题</span>
                    </div>
                  </th>
                  <th colSpan="3" className="px-6 py-4 text-center border-r border-white/30 bg-green-600/80 backdrop-blur-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <Building className="w-4 h-4" />
                      <span>平台部</span>
                    </div>
                  </th>
                  <th colSpan="3" className="px-6 py-4 text-center border-r border-white/30 bg-blue-600/80 backdrop-blur-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span>SHEIN</span>
                    </div>
                  </th>
                  <th colSpan="3" className="px-6 py-4 text-center border-r border-white/30 bg-purple-600/80 backdrop-blur-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <Cloud className="w-4 h-4" />
                      <span>阿里部</span>
                    </div>
                  </th>
                  <th colSpan="3" className="px-6 py-4 text-center border-r border-white/30 bg-orange-600/80 backdrop-blur-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>国内定制</span>
                    </div>
                  </th>
                  <th colSpan="3" className="px-6 py-4 text-center bg-gray-600/80 backdrop-blur-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>小计</span>
                    </div>
                  </th>
                </tr>
                
                {/* 第二行表头 */}
                <tr className="bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white">
                  <th className="px-4 py-3 text-center border-r border-white/20">保底</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">完成</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">差异</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">保底</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">完成</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">差异</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">保底</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">完成</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">差异</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">保底</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">完成</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">差异</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">完成</th>
                  <th className="px-4 py-3 text-center border-r border-white/20">达成</th>
                  <th className="px-4 py-3 text-center">差异</th>
                </tr>
              </thead>
            <tbody>
              {Array.from({length: 12}, (_, i) => {
                const month = i + 1
                const theme = monthThemes[month]
                const monthTotal = getMonthlyTotal(month)
                
                return (
                  <tr key={month} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300 border-b border-gray-100/50">
                    <td className="px-6 py-4 text-center border-r border-gray-100/30">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {month}
                        </div>
                        <span className="font-medium text-gray-800">月</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-100/30 font-medium text-gray-700">
                      {theme.name}
                    </td>
                    
                    {/* 平台部 */}
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-green-700 font-medium">
                      {(getMonthData(month, '平台部').sales_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-gray-600">0</td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-red-600">0</td>
                    
                    {/* SHEIN */}
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-blue-700 font-medium">
                      {(getMonthData(month, 'SHEIN').sales_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-gray-600">0</td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-red-600">0</td>
                    
                    {/* 阿里部 */}
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-purple-700 font-medium">
                      {(getMonthData(month, '阿里部').sales_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-gray-600">0</td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-red-600">0</td>
                    
                    {/* 国内定制 */}
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-orange-700 font-medium">
                      {(getMonthData(month, '国内定制').sales_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-gray-600">0</td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-red-600">0</td>
                    
                    {/* 小计 */}
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 font-bold text-gray-800">
                      {monthTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-100/20 text-gray-600">0</td>
                    <td className="px-4 py-3 text-center text-red-600">0</td>
                  </tr>
                )
              })}
              
              {/* 合计行 */}
              <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold group hover:from-gray-200 hover:to-gray-300 transition-all duration-300">
                <td className="px-6 py-4 text-center border-r border-gray-300/50 text-gray-800">小计</td>
                <td className="px-6 py-4 text-center border-r border-gray-300/50 text-gray-800">年度总计</td>
                {mainDepartments.map(dept => (
                  <React.Fragment key={dept}>
                    <td className="px-4 py-3 text-center border-r border-gray-300/50 text-gray-800">
                      {getDepartmentTotal(dept).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300/50 text-gray-600">0</td>
                    <td className="px-4 py-3 text-center border-r border-gray-300/50 text-red-600">0</td>
                  </React.Fragment>
                ))}
                <td className="px-4 py-3 text-center border-r border-gray-300/50 text-lg text-gray-800">
                  {getGrandTotal().toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center border-r border-gray-300/50 text-gray-600">0</td>
                <td className="px-4 py-3 text-center text-red-600">0</td>
              </tr>
            </tbody>
          </table>
          </div>

          {/* 图例说明 */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-md"></div>
              <span className="font-medium text-blue-800">规划期（1-3月）</span>
            </div>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-md"></div>
              <span className="font-medium text-orange-800">产品期（4-6月）</span>
            </div>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-md"></div>
              <span className="font-medium text-green-800">成长期（7-9月）</span>
            </div>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-md"></div>
              <span className="font-medium text-purple-800">收获期（10-12月）</span>
            </div>
          </div>

          {/* 备注说明 */}
          <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">说明</h3>
            </div>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><span className="font-semibold text-blue-600">保底：</span>部门必须完成的最低目标</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span><span className="font-semibold text-green-600">完成：</span>实际完成的业绩数据</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span><span className="font-semibold text-red-600">差异：</span>完成数与保底数的差值</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span><span className="font-semibold text-purple-600">产能匹配：</span>各部门目标需与生产部门产能相匹配</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span><span className="font-semibold text-orange-600">更新频率：</span>数据更新频率：月度更新</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnnualPlanningChart
