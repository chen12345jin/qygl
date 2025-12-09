import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { Download, Printer, BarChart3, Calendar, Target, TrendingUp, FileText, Building, ShoppingBag, Cloud, Users, Plus, X, Trash2 } from 'lucide-react'
import { exportToPDF } from '../utils/export'
import PageHeaderBanner from '../components/PageHeaderBanner'
import PrintPreview from '../components/PrintPreview'

const AnnualPlanningChart = () => {
  const navigate = useNavigate()
  const { getAnnualPlans, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [data, setData] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [years, setYears] = useState([2024, 2025, 2026])
  const [newYear, setNewYear] = useState('')
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [showYearModal, setShowYearModal] = useState(false)
  const [yearError, setYearError] = useState('')
  const [compact, setCompact] = useState(true)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => { loadData() }, [selectedYear])

  useEffect(() => {
    const loadYears = async () => {
      try {
        const settingsRes = await getSystemSettings()
        const settings = settingsRes?.data || []
        const found = settings.find(s => s.key === 'planningYears')
        const currentFound = settings.find(s => s.key === 'currentPlanningYear')
        if (found && Array.isArray(found.value)) {
          setYears(found.value)
          setYearsSettingId(found.id)
        } else {
          const cached = localStorage.getItem('planningYears')
          if (cached) {
            const arr = JSON.parse(cached)
            if (Array.isArray(arr) && arr.length) setYears(arr)
          }
        }
        if (currentFound && (typeof currentFound.value === 'number' || typeof currentFound.value === 'string')) {
          const y = parseInt(currentFound.value)
          if (!isNaN(y)) {
            setSelectedYear(y)
            setCurrentYearSettingId(currentFound.id)
          }
        } else {
          const cachedYear = localStorage.getItem('currentPlanningYear')
          if (cachedYear && !isNaN(parseInt(cachedYear))) {
            setSelectedYear(parseInt(cachedYear))
          }
        }
      } catch (e) {
        const cached = localStorage.getItem('planningYears')
        if (cached) {
          const arr = JSON.parse(cached)
          if (Array.isArray(arr) && arr.length) setYears(arr)
        }
        const cachedYear = localStorage.getItem('currentPlanningYear')
        if (cachedYear && !isNaN(parseInt(cachedYear))) {
          setSelectedYear(parseInt(cachedYear))
        }
      }
    }
    loadYears()
  }, [])

  const persistYears = async (arr) => {
    try {
      localStorage.setItem('planningYears', JSON.stringify(arr))
      if (yearsSettingId) {
        const res = await updateSystemSetting(yearsSettingId, { key: 'planningYears', value: arr }, false)
        if (res?.success) return
      }
      const addRes = await addSystemSetting({ key: 'planningYears', value: arr }, false)
      if (addRes?.data?.id) setYearsSettingId(addRes.data.id)
    } catch (e) {}
  }

  const persistSelectedYear = async (y, showToast = false) => {
    try {
      localStorage.setItem('currentPlanningYear', String(y))
      if (currentYearSettingId) {
        const res = await updateSystemSetting(currentYearSettingId, { key: 'currentPlanningYear', value: y }, showToast)
        if (res?.success) return
      }
      const addRes = await addSystemSetting({ key: 'currentPlanningYear', value: y }, showToast)
      if (addRes?.data?.id) setCurrentYearSettingId(addRes.data.id)
    } catch (e) {}
  }

  useEffect(() => { if (selectedYear) { persistSelectedYear(selectedYear, yearChangeByUser); if (yearChangeByUser) setYearChangeByUser(false) } }, [selectedYear, yearChangeByUser])

  const loadData = async () => {
    const [planResult, deptResult] = await Promise.all([
      getAnnualPlans({ year: selectedYear, sheet_type: 'planning', month: selectedMonth || undefined }),
      getDepartments()
    ])
    if (planResult.success) {
      const chartData = transformAnnualPlansToChartData(planResult.data)
      setData(chartData)
    }
    if (deptResult.success) setDepartments(deptResult.data)
  }

  const transformAnnualPlansToChartData = (annualPlans) => {
    const chartData = []
    const mainDepartments = ['平台部', 'SHEIN', '阿里部', '国内定制']
    const monthsToShow = selectedMonth ? [parseInt(selectedMonth)] : Array.from({ length: 12 }, (_, i) => i + 1)
    for (const month of monthsToShow) {
      mainDepartments.forEach(department => {
        const plan = annualPlans.find(p => p.department_name === department && p.month === month)
        chartData.push({
          month,
          department,
          sales_amount: plan ? (plan.target_value || 0) : 0,
          target_level: plan ? (plan.target_level || 'A') : 'A',
          description: plan ? plan.description : ''
        })
      })
    }
    return chartData
  }

  const getMonthData = (month, department) => data.find(d => d.month === month && d.department === department) || {}
  const getMonthlyTotal = (month) => data.filter(d => d.month === month).reduce((sum, item) => sum + (item.sales_amount || 0), 0)
  const getDepartmentTotal = (department) => data.filter(d => d.department === department).reduce((sum, item) => sum + (item.sales_amount || 0), 0)
  const getGrandTotal = () => data.reduce((sum, item) => sum + (item.sales_amount || 0), 0)

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
  const themeCellClasses = {
    'month-planning': 'bg-blue-50 text-blue-800 border-blue-200',
    'month-recruit': 'bg-teal-50 text-teal-800 border-teal-200',
    'month-talent': 'bg-pink-50 text-pink-800 border-pink-200',
    'month-product': 'bg-orange-50 text-orange-800 border-orange-200',
    'month-summary': 'bg-cyan-50 text-cyan-800 border-cyan-200',
    'month-study': 'bg-green-50 text-green-800 border-green-200',
    'month-battle': 'bg-rose-50 text-rose-800 border-rose-200',
    'month-sprint': 'bg-violet-50 text-violet-800 border-violet-200',
    'month-harvest': 'bg-yellow-50 text-yellow-800 border-yellow-200',
    'month-impact': 'bg-red-50 text-red-800 border-red-200',
    'month-total': 'bg-gray-100 text-gray-800 border-gray-300'
  }
  const themeRowClasses = {
    'month-planning': 'bg-blue-50',
    'month-recruit': 'bg-teal-50',
    'month-talent': 'bg-pink-50',
    'month-product': 'bg-orange-50',
    'month-summary': 'bg-cyan-50',
    'month-study': 'bg-green-50',
    'month-battle': 'bg-rose-50',
    'month-sprint': 'bg-violet-50',
    'month-harvest': 'bg-yellow-50',
    'month-impact': 'bg-red-50',
    'month-total': 'bg-gray-100'
  }
  const mainDepartments = ['平台部', 'SHEIN', '阿里部', '国内定制']

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title={`泉州太禾服饰有限公司 ${selectedYear}年 年度规划表`}
        subTitle={`年度工作落地规划（泉州太禾服饰有限公司·${selectedYear}年）`}
        year={selectedYear}
        onYearChange={(y) => { setYearChangeByUser(true); setSelectedYear(y) }}
        years={years}
        compact
        className="min-h-[72px]"
        right={(
          <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
            <button
              onClick={() => { setNewYear(''); setYearError(''); setShowYearModal(true) }}
              className="year-add-btn"
              title="添加年份"
              aria-label="添加年份"
            >
              <Plus size={18} />
              <span>添加年份</span>
            </button>
          </div>
        )}
      />
      
      
      <div className={[
        'bg-white/80','backdrop-blur-sm','rounded-3xl','shadow-2xl',
        compact ? 'p-4 md:p-6' : 'p-8'
      ].join(' ')}>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-4 rounded-2xl mb-4 min-h-[72px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <BarChart3 size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">年度规划图表</h3>
                <p className="text-gray-600 text-xs">打印与导出</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintPreview(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                title="打印预览"
                aria-label="打印预览"
              >
                <Printer size={18} />
                <span>打印预览</span>
              </button>
              <button
                onClick={() => exportToPDF('annual-chart', `泉州太禾服饰有限公司 ${selectedYear}年 年度规划表`)}
                className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-teal-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                title="导出PDF"
                aria-label="导出PDF"
              >
                <Download size={18} />
                <span>导出PDF</span>
              </button>
            </div>
          </div>
        </div>
        
        
        <div id="annual-chart" className="overflow-x-auto no-scrollbar">
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full table-excel-borders table-compact">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <th rowSpan="2" className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-white/30'].join(' ')}>
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>月份</span>
                    </div>
                  </th>
                  <th rowSpan="2" className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-white/30'].join(' ')}>
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>主题</span>
                    </div>
                  </th>
                  <th colSpan="3" className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-white/30','bg-green-600/80','backdrop-blur-sm'].join(' ')}>
                    <div className="flex items-center justify-center space-x-2">
                      <Building className="w-4 h-4" />
                      <span>平台部</span>
                    </div>
                  </th>
                  <th colSpan="3" className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-white/30','bg-blue-600/80','backdrop-blur-sm'].join(' ')}>
                    <div className="flex items-center justify-center space-x-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span>SHEIN</span>
                    </div>
                  </th>
                  <th colSpan="3" className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-white/30','bg-purple-600/80','backdrop-blur-sm'].join(' ')}>
                    <div className="flex items-center justify-center space-x-2">
                      <Cloud className="w-4 h-4" />
                      <span>阿里部</span>
                    </div>
                  </th>
                  <th colSpan="3" className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-white/30','bg-orange-600/80','backdrop-blur-sm'].join(' ')}>
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>国内定制</span>
                    </div>
                  </th>
                  <th colSpan="3" className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','bg-gray-600/80','backdrop-blur-sm'].join(' ')}>
                    <div className="flex items-center justify-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>小计</span>
                    </div>
                  </th>
                </tr>
                <tr className="bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white">
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>保底</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>完成</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>差异</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>保底</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>完成</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>差异</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>保底</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>完成</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>差异</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>保底</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>完成</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>差异</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>完成</th>
                  <th className={['px-4','py-3','text-center','border-r','border-white/20'].join(' ')}>达成</th>
                  <th className={['px-4','py-3','text-center'].join(' ')}>差异</th>
                </tr>
              </thead>
              <tbody>
                {(selectedMonth ? [parseInt(selectedMonth)] : Array.from({length: 12}, (_, i) => i + 1)).map((month) => {
                  const theme = monthThemes[month]
                  const monthTotal = getMonthlyTotal(month)
                  return (
                    <tr
                      key={`m-${month}`}
                      className={[
                        'group',
                        themeRowClasses[theme.color] || 'bg-blue-50',
                        'transition-all','duration-300','border-b','border-gray-100/50'
                      ].join(' ')}
                    >
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/30'].join(' ')}>
                        <div className="inline-flex items-center px-3 h-8 rounded-full bg-white ring-1 ring-gray-200 shadow-sm">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mr-1 ring-2 ring-white shadow-md">
                            {month}
                          </div>
                          <span className="text-xs font-medium text-gray-700">月</span>
                        </div>
                      </td>
                      <td
                        className={[
                          compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-gray-100/30','font-medium',
                          themeCellClasses[theme.color] || 'bg-blue-50 text-blue-800 border-blue-200'
                        ].join(' ')}
                      >
                        {theme.name}
                      </td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-green-700','font-medium'].join(' ')}>
                        {(getMonthData(month, '平台部').sales_amount || 0).toLocaleString()}
                      </td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-gray-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-red-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-blue-700','font-medium'].join(' ')}>
                        {(getMonthData(month, 'SHEIN').sales_amount || 0).toLocaleString()}
                      </td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-gray-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-red-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-purple-700','font-medium'].join(' ')}>
                        {(getMonthData(month, '阿里部').sales_amount || 0).toLocaleString()}
                      </td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-gray-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-red-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-orange-700','font-medium'].join(' ')}>
                        {(getMonthData(month, '国内定制').sales_amount || 0).toLocaleString()}
                      </td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-gray-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-red-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','font-bold','text-gray-800'].join(' ')}>
                        {monthTotal.toLocaleString()}
                      </td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-100/20','text-gray-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','text-red-600'].join(' ')}>0</td>
                    </tr>
                  )
                })}
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold group hover:from-gray-200 hover:to-gray-300 transition-all duration-300">
                  <td className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-gray-300/50','text-gray-800'].join(' ')}>小计</td>
                  <td className={[compact ? 'px-4 py-2' : 'px-6 py-4','text-center','border-r','border-gray-300/50','text-gray-800'].join(' ')}>年度总计</td>
                  {mainDepartments.map(dept => (
                    <React.Fragment key={dept}>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-300/50','text-gray-800'].join(' ')}>
                        {getDepartmentTotal(dept).toLocaleString()}
                      </td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-300/50','text-gray-600'].join(' ')}>0</td>
                      <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-300/50','text-red-600'].join(' ')}>0</td>
                    </React.Fragment>
                  ))}
                  <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-300/50','text-lg','text-gray-800'].join(' ')}>
                    {(selectedMonth ? getMonthlyTotal(parseInt(selectedMonth)) : Array.from({length: 12}, (_, i) => i + 1).reduce((sum, m) => sum + getMonthlyTotal(m), 0)).toLocaleString()}
                  </td>
                  <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','border-r','border-gray-300/50','text-gray-600'].join(' ')}>0</td>
                  <td className={[compact ? 'px-3 py-2' : 'px-4 py-3','text-center','text-red-600'].join(' ')}>0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-md"></div>
              <span className="font-medium text-blue-800">规划期（1-3月）</span>
            </div>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-orange-50 to-orange-100 px-3 py-2 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-md"></div>
              <span className="font-medium text-orange-800">产品期（4-6月）</span>
            </div>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-green-100 px-3 py-2 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-md"></div>
              <span className="font-medium text-green-800">成长期（7-9月）</span>
            </div>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-2 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-md"></div>
              <span className="font-medium text-purple-800">收获期（10-12月）</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-800">说明</h3>
            </div>
            <ul className="space-y-2 text-gray-700 text-sm">
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
      {showYearModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
              <div className="font-semibold">年份管理</div>
              <button onClick={() => setShowYearModal(false)} className="text-white/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">新增年份</div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={newYear}
                    onChange={(e) => { setNewYear(e.target.value); setYearError('') }}
                    placeholder="输入年份，如 2027"
                    className="h-10 w-40 px-3 bg-white text-gray-800 rounded-xl border border-gray-300 hover:bg-gray-50"
                  />
                  <button
                    onClick={async () => {
                      const n = parseInt(String(newYear || '').trim())
                      if (isNaN(n) || n < 1900 || n > 2100) { setYearError('请输入有效年份（1900-2100）'); return }
                      if (years.includes(n)) { setYearError('年份已存在'); setSelectedYear(n); return }
                      const next = [...years, n].sort((a,b)=>a-b)
                      setYears(next)
                      await persistYears(next)
                      setSelectedYear(n)
                      setNewYear('')
                      setYearError('')
                    }}
                    className="px-4 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700"
                  >
                    添加
                  </button>
                  {yearError && <span className="text-red-500 text-xs">{yearError}</span>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">年份列表</div>
                <div className="grid grid-cols-3 gap-2">
                  {years.map((y) => (
                    <div key={y} className="inline-flex items-center gap-2 px-3 h-9 rounded-full border border-gray-200 bg-white shadow-sm">
                      <span className="text-sm text-gray-800 whitespace-nowrap">{y}年</span>
                      {selectedYear === y ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">当前</span>
                      ) : (
                        <button
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                          onClick={() => setSelectedYear(y)}
                        >设为当前</button>
                      )}
                      <button
                        onClick={async () => {
                          const next = years.filter(v=>v!==y)
                          const fallback = next[next.length-1] || new Date().getFullYear()
                          if (next.length === 0) { setYears([fallback]); await persistYears([fallback]) }
                          else { setYears(next); await persistYears(next) }
                          if (selectedYear===y) { setSelectedYear(fallback) }
                        }}
                        className="p-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowYearModal(false)} className="h-10 px-4 bg-white border border-gray-300 rounded-xl">关闭</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title={`泉州太禾服饰有限公司 ${selectedYear}年 年度规划表`}
        filename={`泉州太禾服饰有限公司 ${selectedYear}年 年度规划表`}
        contentId="annual-chart"
        data={[]}
        columns={[]}
      />
      
    </div>
  )
}

export default AnnualPlanningChart
