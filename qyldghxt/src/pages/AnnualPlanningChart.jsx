import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { Download, Printer, BarChart3, Calendar, Target, TrendingUp, FileText, Building, ShoppingBag, Cloud, Users, Plus, X, Trash2, CheckCircle, Clock, AlertTriangle, Activity, PieChart, Layers, RotateCcw, Filter, RefreshCcw } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import PrintPreview from '../components/PrintPreview'
import { formatNumber } from '../utils/locale.js'
import { translateStatus } from '../utils/status.js'

const AnnualPlanningChart = () => {
  const navigate = useNavigate()
  const { 
    globalYear, setGlobalYear,
    getAnnualPlans, getDepartments, getDepartmentTargets, getMonthlyProgress, getMajorEvents, getActionPlans, getSystemSettings, addSystemSetting, updateSystemSetting 
  } = useData()
  const [data, setData] = useState([])
  const [departments, setDepartments] = useState([])
  const [chartDepartments, setChartDepartments] = useState([]) // 实际有数据的部门列表
  const [monthlyPlanData, setMonthlyPlanData] = useState({})
  const selectedYear = globalYear
  const setSelectedYear = setGlobalYear
  const [years, setYears] = useState([2024, 2025, 2026])
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  const [compact, setCompact] = useState(true)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = React.useRef(null)
  const dataUpdateDebounceRef = React.useRef(null)

  // 数据完成度汇总状态
  const [completionStats, setCompletionStats] = useState({
    // 部门目标分解
    departmentTargets: { total: 0, completed: 0, inProgress: 0, rate: 0 },
    // 月度推进计划
    monthlyProgress: { total: 0, completed: 0, inProgress: 0, rate: 0 },
    // 大事件提炼
    majorEvents: { total: 0, completed: 0, inProgress: 0, rate: 0 },
    // 5W2H行动计划
    actionPlans: { total: 0, completed: 0, inProgress: 0, rate: 0 },
    // 年度规划表
    annualPlans: { total: 0, completed: 0, inProgress: 0, rate: 0 },
    // 整体
    overall: { total: 0, completed: 0, inProgress: 0, rate: 0 }
  })

  // 模态框状态
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [currentModule, setCurrentModule] = useState(null)
  const [moduleTasks, setModuleTasks] = useState([])

  // 所有模块的原始数据
  const [allModuleData, setAllModuleData] = useState({
    annualPlans: [],
    departmentTargets: [],
    monthlyProgress: [],
    majorEvents: [],
    actionPlans: []
  })

  useEffect(() => { loadData() }, [selectedYear, selectedMonth, selectedDepartment])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFilterOpen])

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      const room = d.room || ''
      if (['annualWorkPlans', 'majorEvents', 'monthlyProgress', 'actionPlans', 'departmentTargets'].includes(room)) {
        if (!d.year || d.year === selectedYear) {
          if (dataUpdateDebounceRef.current) clearTimeout(dataUpdateDebounceRef.current)
          dataUpdateDebounceRef.current = setTimeout(() => { loadData() }, 300)
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => {
      window.removeEventListener('dataUpdated', handler)
      if (dataUpdateDebounceRef.current) clearTimeout(dataUpdateDebounceRef.current)
    }
  }, [selectedYear])

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
        }
        if (currentFound && (typeof currentFound.value === 'number' || typeof currentFound.value === 'string')) {
          const y = parseInt(currentFound.value)
          if (!isNaN(y)) {
            setGlobalYear(y)
            setCurrentYearSettingId(currentFound.id)
          }
        }
      } catch (e) {}
    }
    loadYears()
  }, [])

  const persistYears = async (arr) => {
    try {
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
      if (currentYearSettingId) {
        const res = await updateSystemSetting(currentYearSettingId, { key: 'currentPlanningYear', value: y }, showToast)
        if (res?.success) return
      }
      const addRes = await addSystemSetting({ key: 'currentPlanningYear', value: y }, showToast)
      if (addRes?.data?.id) setCurrentYearSettingId(addRes.data.id)
    } catch (e) {}
  }

  useEffect(() => {
    if (selectedYear && yearChangeByUser) {
      persistSelectedYear(selectedYear, true)
      setYearChangeByUser(false)
    }
  }, [selectedYear, yearChangeByUser])

  const loadData = async () => {
    const [planResult, deptResult, targetsResult, monthlyResult, eventsResult, actionsResult] = await Promise.all([
      getAnnualPlans({ year: selectedYear }),
      getDepartments({ type: 'DEPT' }),
      getDepartmentTargets({ year: selectedYear }),
      getMonthlyProgress({ year: selectedYear }),
      getMajorEvents({ year: selectedYear }),
      getActionPlans({ year: selectedYear })
    ])

    let annualPlans = []
    if (planResult && planResult.success) {
      annualPlans = planResult.data || []
    }

    let targets = []
    if (targetsResult && targetsResult.success) {
      targets = targetsResult.data || []
    }

    let monthlyProgress = []
    if (monthlyResult && monthlyResult.success) {
      monthlyProgress = monthlyResult.data || []
    }

    let majorEvents = []
    if (eventsResult && eventsResult.success) {
      majorEvents = eventsResult.data || []
    }

    let actionPlans = []
    if (actionsResult && actionsResult.success) {
      actionPlans = actionsResult.data || []
    }

    // 保存所有模块的原始数据
    setAllModuleData({
      annualPlans,
      departmentTargets: targets,
      monthlyProgress,
      majorEvents,
      actionPlans
    })

    // 计算各模块完成度
    calculateCompletionStats(
      annualPlans,
      targets,
      monthlyProgress,
      majorEvents,
      actionPlans
    )

    if (planResult.success) {
      const plans = planResult.data || []
      const plansMap = {}
      
      // Aggregate plans by month to get theme/goals
      for (let m = 1; m <= 12; m++) {
        const monthPlans = plans.filter(p => Number(p.month) === m)
        if (monthPlans.length > 0) {
          // Use the first non-empty theme found, or default
          const themePlan = monthPlans.find(p => p.theme)
          plansMap[m] = {
            theme: themePlan ? themePlan.theme : null,
            goals: monthPlans.map(p => p.plan_name).filter(v => v).join('\n'),
            tasks: monthPlans.map(p => p.description).filter(v => v).join('\n')
          }
        }
      }
      setMonthlyPlanData(plansMap)

      // 获取部门列表用于图表数据计算
      const deptList = deptResult.success ? (deptResult.data || []) : []
      const result = transformAnnualPlansToChartData(planResult.data, targets, monthlyProgress, majorEvents, actionPlans, deptList)
      setData(result.chartData)
      setChartDepartments(result.departments) // 设置实际有数据的部门列表
    }
    if (deptResult.success) setDepartments(deptResult.data)
  }

  // 计算各模块完成度统计
  const calculateCompletionStats = (annualPlans, targets, monthlyProgress, majorEvents, actionPlans) => {
    // 1. 部门目标分解完成度
    const targetStats = calculateTargetCompletion(targets)
    
    // 2. 月度推进计划完成度
    const monthlyStats = calculateMonthlyCompletion(monthlyProgress)
    
    // 3. 大事件完成度
    const eventsStats = calculateEventsCompletion(majorEvents)
    
    // 4. 5W2H行动计划完成度
    const actionsStats = calculateActionsCompletion(actionPlans)
    
    // 5. 年度规划表完成度
    const plansStats = calculatePlansCompletion(annualPlans)
    
    // 6. 整体完成度
    const totalItems = targetStats.total + monthlyStats.total + eventsStats.total + actionsStats.total + plansStats.total
    const totalCompleted = targetStats.completed + monthlyStats.completed + eventsStats.completed + actionsStats.completed + plansStats.completed
    const totalInProgress = targetStats.inProgress + monthlyStats.inProgress + eventsStats.inProgress + actionsStats.inProgress + plansStats.inProgress
    const overallRate = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0

    setCompletionStats({
      departmentTargets: targetStats,
      monthlyProgress: monthlyStats,
      majorEvents: eventsStats,
      actionPlans: actionsStats,
      annualPlans: plansStats,
      overall: {
        total: totalItems,
        completed: totalCompleted,
        inProgress: totalInProgress,
        rate: overallRate
      }
    })
  }

  // 部门目标完成度计算
  const calculateTargetCompletion = (targets) => {
    if (!targets || targets.length === 0) return { total: 0, completed: 0, inProgress: 0, rate: 0 }
    
    const total = targets.length
    let completed = 0
    let inProgress = 0
    
    targets.forEach(t => {
      const targetVal = Number(t.target_value) || 0
      const currentVal = Number(t.current_value) || 0
      if (targetVal > 0) {
        const rate = (currentVal / targetVal) * 100
        if (rate >= 100) completed++
        else if (rate > 0) inProgress++
      }
    })
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, rate }
  }

  // 月度推进计划完成度计算
  const calculateMonthlyCompletion = (monthlyProgress) => {
    if (!monthlyProgress || monthlyProgress.length === 0) return { total: 0, completed: 0, inProgress: 0, rate: 0 }
    
    const total = monthlyProgress.length
    let completed = 0
    let inProgress = 0
    
    monthlyProgress.forEach(p => {
      const status = String(p.status || '').toLowerCase()
      // 同时处理英文和中文状态
      if (status === 'ahead' || status === 'completed' || status === '已完成') {
        completed++
      } else if (status === 'on_track' || status === 'in_progress' || status === '进行中') {
        inProgress++
      } else {
        // 基于目标值和实际值计算
        const targetVal = Number(p.target_value) || 0
        const actualVal = Number(p.actual_value) || 0
        if (targetVal > 0) {
          const rate = (actualVal / targetVal) * 100
          if (rate >= 100) completed++
          else if (rate > 0) inProgress++
        }
      }
    })
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, rate }
  }

  // 大事件完成度计算
  const calculateEventsCompletion = (majorEvents) => {
    if (!majorEvents || majorEvents.length === 0) return { total: 0, completed: 0, inProgress: 0, rate: 0 }
    
    const total = majorEvents.length
    let completed = 0
    let inProgress = 0
    
    majorEvents.forEach(e => {
      const status = String(e.status || '').toLowerCase()
      // 同时处理英文和中文状态
      if (status === 'completed' || status === 'done' || status === 'finished' || status === '已完成') {
        completed++
      } else if (status === 'executing' || status === 'in_progress' || status === 'preparing' || status === '进行中') {
        inProgress++
      }
    })
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, rate }
  }

  // 5W2H行动计划完成度计算
  const calculateActionsCompletion = (actionPlans) => {
    if (!actionPlans || actionPlans.length === 0) return { total: 0, completed: 0, inProgress: 0, rate: 0 }
    
    const total = actionPlans.length
    let completed = 0
    let inProgress = 0
    
    actionPlans.forEach(a => {
      const progress = parseFloat(a.progress) || 0
      const status = String(a.status || '').toLowerCase()
      
      // 同时处理英文和中文状态
      if (progress >= 100 || status === 'completed' || status === '已完成') {
        completed++
      } else if (progress > 0 || status === 'in_progress' || status === '进行中') {
        inProgress++
      }
    })
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, rate }
  }

  // 年度规划表完成度计算
  const calculatePlansCompletion = (annualPlans) => {
    if (!annualPlans || annualPlans.length === 0) return { total: 0, completed: 0, inProgress: 0, rate: 0 }
    
    const total = annualPlans.length
    let completed = 0
    let inProgress = 0
    
    annualPlans.forEach(p => {
      const status = String(p.status || '').toLowerCase()
      // 同时处理英文和中文状态
      if (status === 'completed' || status === 'done' || status === '已完成') {
        completed++
      } else if (status === 'in_progress' || status === 'ongoing' || status === '进行中') {
        inProgress++
      } else {
        // 检查是否有内容填写（视为进行中）
        const hasContent = p.goals || p.tasks || p.plan_name || p.description
        if (hasContent) inProgress++
      }
    })
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, rate }
  }

  const transformAnnualPlansToChartData = (annualPlans, targets, monthlyProgress, majorEvents, actionPlans, deptList = []) => {
    const chartData = []
    const deptIdToName = {}
    if (deptList && deptList.length > 0) {
      for (let i = 0; i < deptList.length; i++) {
        const d = deptList[i]
        if (d && d.id) deptIdToName[d.id] = d.name || d.department_name
      }
    }
    const getDeptName = (item) => {
      if (item.department_name) return String(item.department_name).trim()
      if (item.department) return String(item.department).trim()
      if (item.department_id && deptIdToName[item.department_id]) return String(deptIdToName[item.department_id]).trim()
      return null
    }
    
    // 需要删除的部门列表 - 包含外部人员和职能部门
    const departmentsToRemove = [
      // 外部人员
      '外协', '客户', '供应商', '外协部',
      
      // 职能部门
      '设计部', '设计组', '计划部', '行政部', '人事部', '品管部', 
      '后道车间', '缝制车间', '裁剪部', '临时组', '吊挂组',
      '钉钉部署', '营销中心', '生产部', '采购部', '快反生产线',
      '发改委', '生产中心', '财务中心', '国外营销部', '国内营销部',
      '常规生产线', '人政中心', '总经办', '监委', '仓储部',
      '交付中心', '配送组', '工艺组', '生管组', '品控中心',
      '视觉部', '配送部', '物控部', 'IE部',
      '生产组', '技术部', '财务部', 'IT部', '法务部', '审计部',
      '培训部', '客服部', '公关部', '市场部', '品牌部', '战略部',
      '投资部', '运营部', '人力资源部', '行政人事部', '综合管理部'
    ];
    
    // 过滤部门的函数
    const isMainDepartment = (deptName) => {
      if (!deptName || typeof deptName !== 'string') return false;
      const name = deptName.trim();
      if (!name) return false;
      // 过滤掉需要删除的部门
      if (departmentsToRemove.includes(name)) return false;
      // 过滤掉包含特定关键词的部门
      const excludeKeywords = ['公司', '外部', '职能', '支持', '后勤', '管理'];
      return !excludeKeywords.some(keyword => name.includes(keyword));
    };
    
    const deptSet = new Set()
    if (Array.isArray(deptList)) {
      for (let i = 0; i < deptList.length; i++) {
        const d = deptList[i]
        const name = (d?.name || d?.department_name || d?.department || '').trim()
        if (isMainDepartment(name)) deptSet.add(name)
      }
    }
    const collectDept = (arr) => {
      if (!arr || arr.length === 0) return
      for (let i = 0; i < arr.length; i++) {
        const n = getDeptName(arr[i])
        if (n && isMainDepartment(n)) deptSet.add(n)
      }
    }
    collectDept(annualPlans)
    collectDept(targets)
    collectDept(monthlyProgress)
    collectDept(majorEvents)
    collectDept(actionPlans)
    let mainDepartments = Array.from(deptSet).sort()
    
    // 应用部门筛选
    if (selectedDepartment) {
      mainDepartments = mainDepartments.filter(dept => dept === selectedDepartment)
    }
    
    const monthsToShow = selectedMonth ? [parseInt(selectedMonth)] : Array.from({ length: 12 }, (_, i) => i + 1)
    const getActionMonth = (action) => {
      if (!action.when) return null
      const match = action.when.match(/(\d{1,2})月/)
      if (match) return parseInt(match[1])
      const d = new Date(action.when)
      if (!isNaN(d.getTime())) return d.getMonth() + 1
      return null
    }
    const getEventMonth = (event) => {
      if (event.month) return parseInt(event.month)
      if (event.planned_date) return new Date(event.planned_date).getMonth() + 1
      if (event.actual_date) return new Date(event.actual_date).getMonth() + 1
      return null
    }
    const keyOf = (m, dept) => `${m}|${dept}`
    const idxTargets = new Map()
    const idxProgress = new Map()
    const idxPlans = new Map()
    const idxEvents = new Map()
    const idxActions = new Map()
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]
      const m = Number(t.month)
      const dept = getDeptName(t)
      if (!m || !dept || !isMainDepartment(dept)) continue
      const k = keyOf(m, dept)
      const arr = idxTargets.get(k) || []
      arr.push(t)
      idxTargets.set(k, arr)
    }
    for (let i = 0; i < monthlyProgress.length; i++) {
      const p = monthlyProgress[i]
      const m = Number(p.month)
      const dept = getDeptName(p)
      if (!m || !dept || !isMainDepartment(dept)) continue
      const k = keyOf(m, dept)
      const arr = idxProgress.get(k) || []
      arr.push(p)
      idxProgress.set(k, arr)
    }
    for (let i = 0; i < annualPlans.length; i++) {
      const wp = annualPlans[i]
      const m = Number(wp.month)
      const dept = getDeptName(wp)
      if (!m || !dept || !isMainDepartment(dept)) continue
      const k = keyOf(m, dept)
      const arr = idxPlans.get(k) || []
      arr.push(wp)
      idxPlans.set(k, arr)
    }
    for (let i = 0; i < majorEvents.length; i++) {
      const e = majorEvents[i]
      const m = getEventMonth(e)
      const dept = getDeptName(e)
      if (!m || !dept || !isMainDepartment(dept)) continue
      const k = keyOf(m, dept)
      const arr = idxEvents.get(k) || []
      arr.push(e)
      idxEvents.set(k, arr)
    }
    for (let i = 0; i < actionPlans.length; i++) {
      const a = actionPlans[i]
      const m = getActionMonth(a)
      const dept = getDeptName(a)
      if (!m || !dept || !isMainDepartment(dept)) continue
      const k = keyOf(m, dept)
      const arr = idxActions.get(k) || []
      arr.push(a)
      idxActions.set(k, arr)
    }
    for (let i = 0; i < monthsToShow.length; i++) {
      const month = monthsToShow[i]
      for (let j = 0; j < mainDepartments.length; j++) {
        const department = mainDepartments[j]
        const k = keyOf(month, department)
        const relevantTargets = idxTargets.get(k) || []
        const deptTarget = relevantTargets.reduce((sum, t) => sum + (Number(t.target_value) || 0), 0)
        const deptCurrent = relevantTargets.reduce((sum, t) => sum + (Number(t.current_value) || 0), 0)
        const relevantProgress = idxProgress.get(k) || []
        const progressTarget = relevantProgress.reduce((sum, p) => sum + (Number(p.target_value) || 0), 0)
        const progressCurrent = relevantProgress.reduce((sum, p) => sum + (Number(p.actual_value) || 0), 0)
        const relevantWorkPlans = idxPlans.get(k) || []
        const plan = relevantWorkPlans[0] || null
        let totalTarget = progressTarget
        let totalCurrent = progressCurrent
        if (relevantProgress.length === 0) {
          totalTarget = deptTarget
          totalCurrent = deptCurrent
        }
        chartData.push({
          month,
          department,
          sales_amount: totalTarget,
          current_value: totalCurrent,
          target_level: plan ? (plan.target_level || 'A') : 'A',
          description: plan ? plan.description : ''
        })
      }
    }
    return { chartData, departments: mainDepartments }
  }

  const monthDeptMap = React.useMemo(() => {
    const m = new Map()
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      if (d && d.month && d.department) m.set(`${d.month}|${d.department}`, d)
    }
    return m
  }, [data])
  const monthlyTotals = React.useMemo(() => {
    const totals = { target: {}, current: {} }
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const m = d.month
      if (!m) continue
      totals.target[m] = (totals.target[m] || 0) + (d.sales_amount || 0)
      totals.current[m] = (totals.current[m] || 0) + (d.current_value || 0)
    }
    return totals
  }, [data])
  const departmentTotals = React.useMemo(() => {
    const totals = {}
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const dept = d.department
      if (!dept) continue
      const t = totals[dept] || { target: 0, current: 0 }
      t.target += d.sales_amount || 0
      t.current += d.current_value || 0
      totals[dept] = t
    }
    return totals
  }, [data])
  const grandTotals = React.useMemo(() => {
    let t = 0, c = 0
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      t += d.sales_amount || 0
      c += d.current_value || 0
    }
    return { target: t, current: c }
  }, [data])
  const getMonthData = (month, department) => monthDeptMap.get(`${month}|${department}`) || {}
  const getMonthlyTotal = (month) => monthlyTotals.target[month] || 0
  const getMonthlyCurrent = (month) => monthlyTotals.current[month] || 0
  const getDepartmentTotal = (department) => (departmentTotals[department]?.target) || 0
  const getDepartmentCurrent = (department) => (departmentTotals[department]?.current) || 0
  const getGrandTotal = () => grandTotals.target
  const getGrandCurrent = () => grandTotals.current

  const getFilterCount = () => {
    let count = 0
    if (selectedMonth) count++
    if (selectedDepartment) count++
    return count
  }
  const filterCount = getFilterCount()

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

  // 使用transformAnnualPlansToChartData计算出的部门列表
  const mainDepartments = React.useMemo(() => {
    // 需要删除的部门列表 - 包含外部人员和职能部门
    const departmentsToRemove = [
      // 外部人员
      '外协', '客户', '供应商', '外协部',
      
      // 职能部门
      '设计部', '设计组', '计划部', '行政部', '人事部', '品管部', 
      '后道车间', '缝制车间', '裁剪部', '临时组', '吊挂组',
      '钉钉部署', '营销中心', '生产部', '采购部', '快反生产线',
      '发改委', '生产中心', '财务中心', '国外营销部', '国内营销部',
      '常规生产线', '人政中心', '总经办', '监委', '仓储部',
      '交付中心', '配送组', '工艺组', '生管组', '品控中心',
      '视觉部', '配送部', '物控部', 'IE部',
      '生产组', '技术部', '财务部', 'IT部', '法务部', '审计部',
      '培训部', '客服部', '公关部', '市场部', '品牌部', '战略部',
      '投资部', '运营部', '人力资源部', '行政人事部', '综合管理部'
    ];
    
    // 优先使用图表数据计算时确定的部门列表
    if (chartDepartments && chartDepartments.length > 0) {
      const unique = [...new Set(chartDepartments.map(d => (d || '').trim()).filter(Boolean))]
        .filter(dept => {
          // 过滤掉需要删除的部门
          if (departmentsToRemove.includes(dept)) return false;
          // 过滤掉包含特定关键词的部门
          const excludeKeywords = ['公司', '外部', '职能', '支持', '后勤', '管理'];
          return !excludeKeywords.some(keyword => dept.includes(keyword));
        })
        .sort(); // 按字典序排序
      return unique
    }
    // 如果没有，从data中提取
    const deptSet = new Set()
    data.forEach(d => { if (d.department) deptSet.add(d.department.trim()) })
    const fromData = Array.from(deptSet).filter(Boolean)
      .filter(dept => {
        // 过滤掉需要删除的部门
        if (departmentsToRemove.includes(dept)) return false;
        // 过滤掉包含特定关键词的部门
        const excludeKeywords = ['公司', '外部', '职能', '支持', '后勤', '管理'];
        return !excludeKeywords.some(keyword => dept.includes(keyword));
      })
      .sort(); // 按字典序排序
    if (fromData.length > 0) return fromData
    // 最后使用默认列表（已排序）
    return ['平台部', 'SHEIN', '阿里部', '国内定制']
  }, [chartDepartments, data])

  // 完成度进度条组件
  const CompletionProgressBar = ({ rate, colorClass = 'from-blue-500 to-purple-600' }) => (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-500`}
        style={{ width: `${Math.min(rate, 100)}%` }}
      />
    </div>
  )

  // 获取所有任务的整合列表
  const getAllTasks = () => {
    let allTasks = []
    
    // 部门目标分解
    allTasks = allTasks.concat(allModuleData.departmentTargets.map(item => {
      const progress = parseFloat(item.current_value) / parseFloat(item.target_value) * 100 || 0
      let status = '待开始'
      if (progress >= 100) {
        status = '已完成'
      } else if (progress > 0) {
        status = '进行中'
      }
      return {
        id: item.id,
        name: item.target_name || `目标-${item.id}`,
        department: item.department_name || item.department,
        status,
        progress,
        month: item.month,
        module: '部门目标分解'
      }
    }))
    
    // 月度推进计划
    allTasks = allTasks.concat(allModuleData.monthlyProgress.map(item => {
      let status = item.status || '待开始'
      status = translateStatus(status)
      if (status === '待开始') {
        const progress = parseFloat(item.completion_rate) || 0
        if (progress >= 100) {
          status = '已完成'
        } else if (progress > 0) {
          status = '进行中'
        }
      }
      return {
        id: item.id,
        name: item.task_name || `任务-${item.id}`,
        department: item.department,
        status,
        progress: parseFloat(item.completion_rate) || 0,
        month: item.month,
        module: '月度推进计划'
      }
    }))
    
    // 大事件提炼
    allTasks = allTasks.concat(allModuleData.majorEvents.map(item => {
      let status = item.status || '待开始'
      status = translateStatus(status)
      return {
        id: item.id,
        name: item.event_name || `事件-${item.id}`,
        department: item.responsible_department,
        status,
        progress: parseFloat(item.progress) || 0,
        month: item.month,
        module: '大事件提炼'
      }
    }))
    
    // 5W2H行动计划
    allTasks = allTasks.concat(allModuleData.actionPlans.map(item => {
      let status = item.status || '待开始'
      status = translateStatus(status)
      if (status === '待开始') {
        const progress = parseFloat(item.progress) || 0
        if (progress >= 100) {
          status = '已完成'
        } else if (progress > 0) {
          status = '进行中'
        }
      }
      return {
        id: item.id,
        name: item.goal || item.what || `行动-${item.id}`,
        department: item.department,
        status,
        progress: parseFloat(item.progress) || 0,
        month: new Date(item.start_date).getMonth() + 1 || 0,
        module: '5W2H行动计划'
      }
    }))
    
    // 年度规划表
    allTasks = allTasks.concat(allModuleData.annualPlans.map(item => {
      let status = item.status || '待开始'
      status = translateStatus(status)
      if (status === '待开始') {
        const hasContent = item.goals || item.tasks || item.plan_name || item.description
        if (hasContent) {
          status = '进行中'
        }
      }
      return {
        id: item.id,
        name: item.plan_name || `规划-${item.id}`,
        department: item.department,
        status,
        progress: parseFloat(item.progress) || 0,
        month: item.month,
        module: '年度规划表'
      }
    }))
    
    return allTasks
  }

  // 处理卡片点击事件，显示任务列表
  const handleCardClick = (moduleType, statusFilter = null) => {
    let tasks = []
    let moduleName = ''
    
    // 如果是按状态过滤，获取所有任务并过滤
    if (statusFilter) {
      tasks = getAllTasks().filter(task => task.status === statusFilter)
      moduleName = `${statusFilter}任务列表`
      setCurrentModule({ type: 'all', name: moduleName })
      setModuleTasks(tasks)
      setShowTaskModal(true)
      return
    }
    
    switch (moduleType) {
      case 'all':
        tasks = getAllTasks();
        moduleName = '全部任务';
        break;
      case 'departmentTargets':
        tasks = allModuleData.departmentTargets.map(item => {
          const progress = parseFloat(item.current_value) / parseFloat(item.target_value) * 100 || 0
          let status = '待开始'
          if (progress >= 100) {
            status = '已完成'
          } else if (progress > 0) {
            status = '进行中'
          }
          return {
            id: item.id,
            name: item.target_name || `目标-${item.id}`,
            department: item.department_name || item.department,
            status,
            progress,
            month: item.month
          }
        })
        moduleName = '部门目标分解'
        break
      case 'monthlyProgress':
        tasks = allModuleData.monthlyProgress.map(item => {
          let status = item.status || '待开始'
          // 使用translateStatus函数转换为中文状态
          status = translateStatus(status)
          // 如果没有明确状态，根据进度计算
          if (status === '待开始') {
            const progress = parseFloat(item.completion_rate) || 0
            if (progress >= 100) {
              status = '已完成'
            } else if (progress > 0) {
              status = '进行中'
            }
          }
          return {
            id: item.id,
            name: item.task_name || `任务-${item.id}`,
            department: item.department,
            status,
            progress: parseFloat(item.completion_rate) || 0,
            month: item.month
          }
        })
        moduleName = '月度推进计划'
        break
      case 'majorEvents':
        tasks = allModuleData.majorEvents.map(item => {
          let status = item.status || '待开始'
          // 使用translateStatus函数转换为中文状态
          status = translateStatus(status)
          return {
            id: item.id,
            name: item.event_name || `事件-${item.id}`,
            department: item.responsible_department,
            status,
            progress: parseFloat(item.progress) || 0,
            month: item.month
          }
        })
        moduleName = '大事件提炼'
        break
      case 'actionPlans':
        tasks = allModuleData.actionPlans.map(item => {
          let status = item.status || '待开始'
          // 使用translateStatus函数转换为中文状态
          status = translateStatus(status)
          // 如果没有明确状态，根据进度计算
          if (status === '待开始') {
            const progress = parseFloat(item.progress) || 0
            if (progress >= 100) {
              status = '已完成'
            } else if (progress > 0) {
              status = '进行中'
            }
          }
          return {
            id: item.id,
            name: item.goal || item.what || `行动-${item.id}`,
            department: item.department,
            status,
            progress: parseFloat(item.progress) || 0,
            month: new Date(item.start_date).getMonth() + 1 || 0
          }
        })
        moduleName = '5W2H行动计划'
        break
      case 'annualPlans':
        tasks = allModuleData.annualPlans.map(item => {
          let status = item.status || '待开始'
          // 使用translateStatus函数转换为中文状态
          status = translateStatus(status)
          // 如果没有明确状态，根据内容判断
          if (status === '待开始') {
            const hasContent = item.goals || item.tasks || item.plan_name || item.description
            if (hasContent) {
              status = '进行中'
            }
          }
          return {
            id: item.id,
            name: item.plan_name || `规划-${item.id}`,
            department: item.department,
            status,
            progress: parseFloat(item.progress) || 0,
            month: item.month
          }
        })
        moduleName = '年度规划表'
        break
      default:
        return
    }
    
    setCurrentModule({ type: moduleType, name: moduleName })
    setModuleTasks(tasks)
    setShowTaskModal(true)
  }

  // 完成度卡片组件
  const CompletionCard = ({ title, icon: Icon, stats, colorClass, bgClass, borderClass, moduleType }) => (
    <div 
      className={`relative overflow-hidden p-4 ${bgClass} rounded-2xl border ${borderClass} hover:shadow-lg transition-all duration-300 cursor-pointer group`}
      onClick={() => handleCardClick(moduleType)}
    >
      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={48} className={colorClass.replace('text-', 'text-')} />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-').replace('600', '100')} ${colorClass}`}>
          <Icon size={18} />
        </div>
        <div className="font-semibold text-gray-800 text-sm">{title}</div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">完成率</span>
          <span className={`font-bold ${stats.rate >= 80 ? 'text-green-600' : stats.rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.rate}%
          </span>
        </div>
        <CompletionProgressBar 
          rate={stats.rate} 
          colorClass={stats.rate >= 80 ? 'from-green-400 to-green-600' : stats.rate >= 50 ? 'from-yellow-400 to-yellow-600' : 'from-red-400 to-red-600'}
        />
        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-200/50">
          <div className="text-center">
            <div className="text-xs text-gray-500">总数</div>
            <div className="font-bold text-gray-800">{stats.total}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">已完成</div>
            <div className="font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">进行中</div>
            <div className="font-bold text-blue-600">{stats.inProgress}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title={`${selectedYear}年 年度规划图表`}
        subTitle={`按月份与部门查看业务目标完成情况（${selectedYear}年）`}
        year={selectedYear}
        onYearChange={(y) => { setYearChangeByUser(true); setGlobalYear(y) }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
        right={null}
      />

      {/* 数据完成度汇总面板 */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <PieChart size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedYear}年度数据完成度汇总</h2>
                <p className="text-white/80 text-sm mt-1">实时展示各模块工作完成情况</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white/80 text-xs">整体完成率</div>
                <div className="text-3xl font-bold text-white">{completionStats.overall.rate}%</div>
              </div>
              <div className="w-20 h-20 relative">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="white"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={(completionStats.overall.rate * 2.2) + ' 220'}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle size={24} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 总体统计摘要 */}
        <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
          <div 
            className="p-4 text-center border-r border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer hover:shadow-md"
            onClick={() => handleCardClick('all')}
          >
            <div className="text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors">{completionStats.overall.total}</div>
            <div className="text-xs text-gray-500 mt-1">总任务数</div>
          </div>
          <div 
            className="p-4 text-center border-r border-gray-100 hover:bg-green-50 transition-colors cursor-pointer hover:shadow-md"
            onClick={() => handleCardClick('all', '已完成')}
          >
            <div className="text-2xl font-bold text-green-600 hover:text-green-700 transition-colors">{completionStats.overall.completed}</div>
            <div className="text-xs text-gray-500 mt-1">已完成</div>
          </div>
          <div 
            className="p-4 text-center border-r border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer hover:shadow-md"
            onClick={() => handleCardClick('all', '进行中')}
          >
            <div className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">{completionStats.overall.inProgress}</div>
            <div className="text-xs text-gray-500 mt-1">进行中</div>
          </div>
          <div 
            className="p-4 text-center hover:bg-orange-50 transition-colors cursor-pointer hover:shadow-md"
            onClick={() => handleCardClick('all', '待开始')}
          >
            <div className="text-2xl font-bold text-orange-600 hover:text-orange-700 transition-colors">
              {completionStats.overall.total - completionStats.overall.completed - completionStats.overall.inProgress}
            </div>
            <div className="text-xs text-gray-500 mt-1">待开始</div>
          </div>
        </div>

        {/* 各模块完成度卡片 */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Layers size={18} className="text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">各模块完成度详情</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <CompletionCard
              title="部门目标分解"
              icon={Target}
              stats={completionStats.departmentTargets}
              colorClass="text-blue-600"
              bgClass="bg-gradient-to-br from-blue-50 to-white"
              borderClass="border-blue-100"
              moduleType="departmentTargets"
            />
            <CompletionCard
              title="月度推进计划"
              icon={Calendar}
              stats={completionStats.monthlyProgress}
              colorClass="text-green-600"
              bgClass="bg-gradient-to-br from-green-50 to-white"
              borderClass="border-green-100"
              moduleType="monthlyProgress"
            />
            <CompletionCard
              title="大事件提炼"
              icon={AlertTriangle}
              stats={completionStats.majorEvents}
              colorClass="text-purple-600"
              bgClass="bg-gradient-to-br from-purple-50 to-white"
              borderClass="border-purple-100"
              moduleType="majorEvents"
            />
            <CompletionCard
              title="5W2H行动计划"
              icon={Activity}
              stats={completionStats.actionPlans}
              colorClass="text-orange-600"
              bgClass="bg-gradient-to-br from-orange-50 to-white"
              borderClass="border-orange-100"
              moduleType="actionPlans"
            />
            <CompletionCard
              title="年度规划表"
              icon={FileText}
              stats={completionStats.annualPlans}
              colorClass="text-indigo-600"
              bgClass="bg-gradient-to-br from-indigo-50 to-white"
              borderClass="border-indigo-100"
              moduleType="annualPlans"
            />
          </div>
        </div>
      </div>
      
      
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
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 relative"
                onClick={() => setIsFilterOpen(prev => !prev)}
              >
                <Filter size={14} />
                <span>筛选</span>
                {filterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white">
                    {filterCount}
                  </span>
                )}
              </button>
              <button
                className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-2 ${!selectedMonth && !selectedDepartment ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  setSelectedMonth('')
                  setSelectedDepartment('')
                }}
                title="重置筛选"
                disabled={!selectedMonth && !selectedDepartment}
              >
                <RefreshCcw size={14} />
                <span>重置</span>
              </button>
              <button
                onClick={() => setShowPrintPreview(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                title="打印预览"
                aria-label="打印预览"
              >
                <Printer size={18} />
                <span>打印预览</span>
              </button>
            </div>
          </div>
        </div>
        
        {isFilterOpen && (
          <div className="card p-6 mb-4" ref={filterRef}>
            <div className="flex items-center justify-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Filter size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-800">筛选条件</div>
                  <div className="text-xs text-gray-500">选择维度以过滤列表</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份</label>
                <select id="panel-month" name="month"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ direction: 'ltr', appearance: 'auto' }}
                >
                  <option value="">全部月份</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="panel-department" className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <select id="panel-department" name="department"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">全部部门</option>
                  {mainDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800">月度业务目标</h2>
        </div>
        <div id="annual-chart" className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] border border-gray-200 rounded-xl shadow-sm bg-white">
          <table className="w-full border-collapse text-sm text-gray-700 annual-chart-table" style={{ minWidth: `${120 + 200 + (mainDepartments.length * 3) * 140 + 3 * 140}px` }}>
            <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0 z-30 shadow-sm">
              <tr>
                <th rowSpan="2" className="sticky left-0 z-40 annual-chart-head p-3 border-b border-r border-gray-200 w-[120px] text-center shadow-[1px_0_0_0_rgba(229,231,235,1)]">
                  月份
                </th>
                <th rowSpan="2" className="sticky left-[120px] z-40 annual-chart-head p-3 border-b border-r border-gray-200 w-[200px] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] overflow-hidden whitespace-nowrap">
                  主题
                </th>
                {mainDepartments.map((dept) => (
                  <th key={dept} colSpan="3" className="p-3 border-b border-r border-gray-200 text-center min-w-[420px] whitespace-nowrap annual-chart-group-th">
                    {dept}
                  </th>
                ))}
                <th colSpan="3" className="p-3 border-b border-r border-gray-200 text-center min-w-[420px] whitespace-nowrap annual-chart-group-th bg-blue-50">
                  月度小计
                </th>
              </tr>
              <tr>
                {mainDepartments.map((dept) => (
                  <React.Fragment key={dept}>
                    <th className="p-3 border-b border-r border-gray-200 font-medium w-[140px] text-center whitespace-nowrap annual-chart-subhead-th">保底</th>
                    <th className="p-3 border-b border-r border-gray-200 font-medium w-[140px] text-center whitespace-nowrap annual-chart-subhead-th">完成</th>
                    <th className="p-3 border-b border-r border-gray-200 font-medium w-[140px] text-center whitespace-nowrap annual-chart-subhead-th">差异</th>
                  </React.Fragment>
                ))}
                <th className="p-3 border-b border-r border-gray-200 font-medium w-[140px] text-center whitespace-nowrap annual-chart-subhead-th bg-blue-50">总计</th>
                <th className="p-3 border-b border-r border-gray-200 font-medium w-[140px] text-center whitespace-nowrap annual-chart-subhead-th bg-blue-50">完成</th>
                <th className="p-3 border-b border-r border-gray-200 font-medium w-[140px] text-center whitespace-nowrap annual-chart-subhead-th bg-blue-50">差异</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(selectedMonth ? [parseInt(selectedMonth)] : Array.from({length: 12}, (_, i) => i + 1)).map((month) => {
                const planData = monthlyPlanData[month]
                const displayThemeName = planData?.theme || monthThemes[month].name
                
                const monthTotal = getMonthlyTotal(month)
                const monthCurrent = getMonthlyCurrent(month)
                const monthDiff = monthCurrent - monthTotal
                
                return (
                  <tr key={`m-${month}`} className="group annual-chart-row annual-chart-row-alt">
                    <td className="sticky left-0 z-20 bg-white p-4 border-r border-gray-200 text-center font-medium w-[120px] shadow-[1px_0_0_0_rgba(229,231,235,1)] group-hover:bg-blue-50/50">
                      {month}月
                    </td>
                    <td 
                      className="sticky left-[120px] z-20 bg-white p-4 border-r border-gray-200 w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-blue-50/50 truncate text-center"
                      title={planData ? `目标:\n${planData.goals}\n\n任务:\n${planData.tasks}` : ''}
                    >
                      {displayThemeName}
                    </td>
                    
                    {mainDepartments.map(dept => {
                       const dData = getMonthData(month, dept)
                       const target = dData.sales_amount || 0
                       const current = dData.current_value || 0
                       const diff = current - target
                       return (
                         <React.Fragment key={dept}>
                           <td className="p-3 border-r border-gray-100 text-center text-gray-600 whitespace-nowrap w-[140px]">
                             {target === 0 ? '-' : formatNumber(target)}
                           </td>
                           <td className="p-3 border-r border-gray-100 text-center text-blue-600 font-medium whitespace-nowrap w-[140px]">
                             {current === 0 ? '-' : formatNumber(current)}
                           </td>
                           <td className={`p-3 border-r border-gray-200 text-center font-medium whitespace-nowrap w-[140px] ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                             {diff === 0 ? '-' : formatNumber(diff)}
                           </td>
                         </React.Fragment>
                       )
                    })}
                    
                    {/* 月度小计列 */}
                    <td className="p-3 border-r border-gray-100 text-center text-gray-600 font-medium whitespace-nowrap w-[140px] bg-blue-50/50" style={{ textAlign: 'center' }}>
                      {monthTotal === 0 ? '-' : formatNumber(monthTotal)}
                    </td>
                    <td className="p-3 border-r border-gray-100 text-center text-blue-600 font-medium whitespace-nowrap w-[140px] bg-blue-50/50" style={{ textAlign: 'center' }}>
                      {monthCurrent === 0 ? '-' : formatNumber(monthCurrent)}
                    </td>
                    <td className={`p-3 border-r border-gray-200 text-center font-medium whitespace-nowrap w-[140px] bg-blue-50/50 ${monthDiff >= 0 ? 'text-green-600' : 'text-red-500'}`} style={{ textAlign: 'center' }}>
                      {monthDiff === 0 ? '-' : formatNumber(monthDiff)}
                    </td>

                    
                  </tr>
                )
              })}
              <tr className="bg-gray-100 font-bold sticky bottom-0 z-20 shadow-inner">
                <td className="sticky left-0 z-30 bg-gray-100 p-4 border-r border-gray-300 text-center w-[120px] shadow-[1px_0_0_0_rgba(209,213,219,1)]">小计</td>
                <td className="sticky left-[120px] z-30 bg-gray-100 p-4 border-r border-gray-300 text-center w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">年度总计</td>
                {mainDepartments.map(dept => {
                  const totalTarget = getDepartmentTotal(dept)
                  const totalCurrent = getDepartmentCurrent(dept)
                  const totalDiff = totalCurrent - totalTarget
                  return (
                  <React.Fragment key={dept}>
                    <td className="p-3 border-r border-gray-300 text-center text-gray-800 whitespace-nowrap w-[140px]">
                      {totalTarget === 0 ? '-' : formatNumber(totalTarget)}
                    </td>
                    <td className="p-3 border-r border-gray-300 text-center text-blue-700 whitespace-nowrap w-[140px]">
                      {totalCurrent === 0 ? '-' : formatNumber(totalCurrent)}
                    </td>
                    <td className={`p-3 border-r border-gray-300 text-center whitespace-nowrap w-[140px] ${totalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalDiff === 0 ? '-' : formatNumber(totalDiff)}
                    </td>
                  </React.Fragment>
                  )
                })}
                
                {/* 年度总计的小计列 */}
                <td className="p-3 border-r border-gray-300 text-center text-gray-800 whitespace-nowrap w-[140px] bg-blue-100" style={{ textAlign: 'center' }}>
                  {getGrandTotal() === 0 ? '-' : formatNumber(getGrandTotal())}
                </td>
                <td className="p-3 border-r border-gray-300 text-center text-blue-700 whitespace-nowrap w-[140px] bg-blue-100" style={{ textAlign: 'center' }}>
                  {getGrandCurrent() === 0 ? '-' : formatNumber(getGrandCurrent())}
                </td>
                <td className={`p-3 border-r border-gray-300 text-center whitespace-nowrap w-[140px] bg-blue-100 ${getGrandCurrent() - getGrandTotal() >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ textAlign: 'center' }}>
                  {getGrandCurrent() - getGrandTotal() === 0 ? '-' : formatNumber(getGrandCurrent() - getGrandTotal())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    
    {showTaskModal && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 overflow-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 模态框头部 */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
            <div className="font-semibold text-lg">
              {currentModule?.name} - 任务列表
            </div>
            <button 
              onClick={() => setShowTaskModal(false)} 
              className="text-white/80 hover:text-white transition-colors"
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* 模态框内容 */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-1">
                总计任务数: <span className="font-semibold text-gray-800">{moduleTasks.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-2 bg-green-50 rounded-lg">
                  已完成: <span className="font-semibold text-green-600">
                    {moduleTasks.filter(task => task.status === '已完成').length}
                  </span>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  进行中: <span className="font-semibold text-blue-600">
                    {moduleTasks.filter(task => task.status === '进行中').length}
                  </span>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  待开始: <span className="font-semibold text-gray-600">
                    {moduleTasks.filter(task => task.status === '待开始').length}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 任务列表表格 */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-700 font-semibold">
                  <tr>
                    <th className="p-3 border-b border-r border-gray-200 text-left">任务名称</th>
                    <th className="p-3 border-b border-r border-gray-200 text-center">所属模块</th>
                    <th className="p-3 border-b border-r border-gray-200 text-center">部门</th>
                    <th className="p-3 border-b border-r border-gray-200 text-center">月份</th>
                    <th className="p-3 border-b border-r border-gray-200 text-center">状态</th>
                    <th className="p-3 border-b border-gray-200 text-center">进度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {moduleTasks.length > 0 ? (
                    moduleTasks.map(task => (
                      <tr key={`${task.module}-${task.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 border-r border-gray-100 text-gray-800 font-medium">
                          {task.name}
                        </td>
                        <td className="p-3 border-r border-gray-100 text-center">
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                            {task.module || currentModule?.name}
                          </span>
                        </td>
                        <td className="p-3 border-r border-gray-100 text-center">
                          {task.department || '-'}
                        </td>
                        <td className="p-3 border-r border-gray-100 text-center">
                          {task.month || '-'}
                        </td>
                        <td className="p-3 border-r border-gray-100 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${ 
                            task.status === '已完成' ? 'bg-green-100 text-green-800' : 
                            task.status === '进行中' ? 'bg-blue-100 text-blue-800' : 
                            task.status === '风险中' ? 'bg-yellow-100 text-yellow-800' : 
                            task.status === '已延期' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800' 
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${ 
                                  task.progress >= 80 ? 'bg-green-500' : 
                                  task.progress >= 50 ? 'bg-yellow-500' : 
                                  task.progress > 0 ? 'bg-blue-500' : 
                                  'bg-gray-300' 
                                }`}
                                style={{ width: `${Math.min(task.progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {Math.round(task.progress)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        暂无任务数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 模态框底部 */}
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
            <button 
              onClick={() => setShowTaskModal(false)} 
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    )}

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
                    onChange={(e) => {
                      const v = e.target.value
                      setNewYear(v)
                      const n = parseInt(v)
                      if (!v) {
                        setYearError('')
                      } else if (isNaN(n) || n < 1900 || n > 2100) {
                        setYearError('请输入有效年份（1900-2100）')
                      } else if (years.includes(n)) {
                        setYearError('年份已存在')
                      } else {
                        setYearError('')
                      }
                    }}
                    placeholder="输入年份，如 2027"
                    className="h-10 w-40 px-3 bg-white text-gray-800 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      const v = String(newYear || '').trim()
                      if (!v) { setYearError('请输入有效年份（1900-2100）'); return }
                      const n = parseInt(v)
                      if (isNaN(n) || n < 1900 || n > 2100) { setYearError('请输入有效年份（1900-2100）'); return }
                      if (years.includes(n)) { setYearError('年份已存在'); setGlobalYear(n); return }
                      const next = [...years, n].sort((a,b)=>a-b)
                      setYears(next)
                      persistYears(next)
                      setGlobalYear(n)
                      persistSelectedYear(n)
                      setNewYear('')
                      setYearError('')
                    }}
                    className="px-4 h-10 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700"
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
                      {selectedYear === y
                        ? <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">当前</span>
                        : <button className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => { setGlobalYear(y); persistSelectedYear(y, true) }}>设为当前</button>}
                      <button
                        onClick={() => {
                          const next = years.filter(v=>v!==y)
                          const fallback = next[next.length-1] || new Date().getFullYear()
                          if (next.length === 0) { setYears([fallback]); persistYears([fallback]) }
                          else { setYears(next); persistYears(next) }
                          if (selectedYear===y) { setGlobalYear(fallback); persistSelectedYear(fallback, true) }
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

      {/* 打印预览组件 */}
      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title={`${selectedYear}年年度规划图表`}
        contentId="annual-chart"
        year={selectedYear}
        pageType="annualPlanning"
      />
    </div>
  )
}

export default AnnualPlanningChart
