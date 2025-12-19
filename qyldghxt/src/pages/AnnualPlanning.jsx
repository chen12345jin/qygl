import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { useFormValidation } from '../contexts/FormValidationContext'
import { Plus, Edit, Trash2, Save, X, Download, Printer, Calculator, FileText, Layers, Calendar, Target, List, Package, Clock, User, MessageSquare, AlertTriangle, Tag, Star, AlignLeft, TrendingUp, BookOpen, CheckSquare, Flag, Users, BarChart3, Upload, Filter, RotateCcw, RefreshCcw, Building, DollarSign, Columns } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import { exportToExcel } from '../utils/export'
import * as XLSX from 'xlsx'
import PrintPreview from '../components/PrintPreview'
import toast from 'react-hot-toast'
import FormField from '../components/FormField'
import InlineAlert from '../components/InlineAlert'
import { computeActionPlanStatus, normalizeProgress } from '../utils/status'
import OrgDepartmentSelect from '../components/OrgDepartmentSelect'
import CustomSelect from '../components/CustomSelect'

const AnnualPlanning = () => {
  const navigate = useNavigate()
  const { 
    globalYear, setGlobalYear, // Add these
    getAnnualPlans, addAnnualPlan, updateAnnualPlan, deleteAnnualPlan, getSystemSettings, addSystemSetting, updateSystemSetting, getMajorEvents, addMajorEvent, updateMajorEvent, deleteMajorEvent, getMonthlyProgress, addMonthlyProgress, updateMonthlyProgress, deleteMonthlyProgress, getActionPlans, addActionPlan, updateActionPlan, deleteActionPlan, getDepartments, getCompanyInfo, sendNotification 
  } = useData()
  const { getRequiredFields } = useFormValidation()
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [editingCell, setEditingCell] = useState({ row: null, col: null, sheet: null })
  const [currentSheet, setCurrentSheet] = useState('planning')
  const [hiddenColumns, setHiddenColumns] = useState({})
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const columnSelectorRef = useRef(null)

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
        setShowColumnSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleColumnVisibility = (sheet, columnKey) => {
    setHiddenColumns(prev => {
      const sheetHidden = prev[sheet] || []
      if (sheetHidden.includes(columnKey)) {
        return { ...prev, [sheet]: sheetHidden.filter(k => k !== columnKey) }
      } else {
        return { ...prev, [sheet]: [...sheetHidden, columnKey] }
      }
    })
  }
  
  const isHidden = (sheet, columnKey) => {
    return (hiddenColumns[sheet] || []).includes(columnKey)
  }

  // const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()) // Removed
  const selectedYear = globalYear // Map to existing variable name to minimize changes
  const setSelectedYear = setGlobalYear // Map setter to global setter
  const [years, setYears] = useState([2024, 2025, 2026])
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [showYearModal, setShowYearModal] = useState(false)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [companyName, setCompanyName] = useState('泉州太禾服饰有限公司')
  
  // 年度规划表数据
  const [planningData, setPlanningData] = useState({
    year: globalYear,
    title: '年度规划表',
    data: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      plan_name: '',
      department: '',
      category: '',
      priority: '',
      start_date: '',
      end_date: '',
      budget: '',
      actual_cost: '',
      status: 'planning',
      expected_result: '',
      actual_result: '',
      progress: 0,
      responsible_person: '',
      description: '',
      remarks: ''
    }))
  })

  // 年度工作落地规划数据 - 与 MajorEvents.jsx 字段一致
  const [eventsData, setEventsData] = useState({
    year: globalYear,
    title: '大事件提炼',
    events: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      event_name: '',
      event_type: 'strategic',
      importance: '',
      planned_date: '',
      actual_date: '',
      responsible_department: '',
      responsible_person: '',
      status: 'planning',
      progress: 0,
      description: '',
      key_points: '',
      success_criteria: '',
      risks: '',
      lessons_learned: ''
    }))
  })

  // 月度推进计划 - 与 MonthlyProgress.jsx 字段一致
  const [monthlyPlans, setMonthlyPlans] = useState({
    year: globalYear,
    title: '月度推进计划表',
    plans: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      task_name: '',
      department: '',
      responsible_person: '',
      key_activities: '',
      start_date: '',
      end_date: '',
      target_value: '',
      actual_value: '',
      completion_rate: 0,
      status: 'not_started',
      achievements: '',
      challenges: '',
      next_month_plan: '',
      support_needed: ''
    }))
  })

  // 5W2H行动计划
  const [actionPlans, setActionPlans] = useState({
    year: globalYear,
    title: '5W2H行动计划表',
    actions: []
  })
  const [actionErrors, setActionErrors] = useState({})
  const [eventsErrors, setEventsErrors] = useState({})
  const [planningErrors, setPlanningErrors] = useState({})
  const [monthlyErrors, setMonthlyErrors] = useState({})
  const [eventsFilter, setEventsFilter] = useState({ event_type: '', importance: '', month: '', responsible_department: '', status: '' })
  const [planningFilter, setPlanningFilter] = useState({ category: '', priority: '', status: '', department: '' })
  const [monthlyFilter, setMonthlyFilter] = useState({ month: '', department: '', status: '' })
  const [actionFilter, setActionFilter] = useState({ month: '', department: '', priority: '', status: '' })
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [selectedExtractIndices, setSelectedExtractIndices] = useState([])
  const [showFilterOpen, setShowFilterOpen] = useState(false)
  const importInputRef = useRef(null)

  const [departments, setDepartments] = useState([])
  const [notificationPrefs, setNotificationPrefs] = useState({ emailNotification: true, smsNotification: false, dingtalkNotification: true, taskReminder: true, deadlineAlert: true, reportNotification: true })

  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadYears = async () => {
      try {
        const settingsRes = await getSystemSettings()
        const settings = settingsRes?.data || []
        const yearsSetting = settings.find(s => s.key === 'planningYears')
        const currentYearSetting = settings.find(s => s.key === 'currentPlanningYear')
        if (yearsSetting && Array.isArray(yearsSetting.value)) {
          setYears(yearsSetting.value)
          setYearsSettingId(yearsSetting.id)
        }
        if (currentYearSetting && (typeof currentYearSetting.value === 'number' || typeof currentYearSetting.value === 'string')) {
          const y = parseInt(currentYearSetting.value)
          if (!isNaN(y)) {
            setGlobalYear(y)
            setCurrentYearSettingId(currentYearSetting.id)
          }
        }
      } catch (e) {}
    }
    loadYears()
  }, [])

  const floatingButtonClass = isScrolled
    ? "fixed top-24 right-8 z-50 flex flex-wrap items-center gap-3 bg-white/90 backdrop-blur-md shadow-2xl p-2 rounded-2xl border border-indigo-100 transition-all duration-500 animate-in fade-in slide-in-from-top-4"
    : "flex flex-wrap items-center gap-3 transition-all duration-300"

  // 类别和优先级选项定义
  const CATEGORY_OPTIONS = [
    { value: 'strategic', label: '战略性事件' },
    { value: 'operational', label: '运营性事件' },
    { value: 'risk', label: '风险性事件' },
    { value: 'opportunity', label: '机会性事件' },
    { value: 'business', label: '业务性事件' },
    { value: 'management', label: '管理性事件' },
    { value: 'temporary', label: '临时性事件' }
  ]

  const PRIORITY_OPTIONS = [
    { value: 'critical', label: '非常重要' },
    { value: 'high', label: '重要' },
    { value: 'medium', label: '一般' },
    { value: 'low', label: '较低' }
  ]

  const sheets = [
    { key: 'planning', label: '年度规划表', icon: FileText },
    { key: 'events', label: '大事件提炼', icon: FileText },
    { key: 'monthly', label: '月度推进计划', icon: FileText },
    { key: 'action', label: '5W2H行动计划', icon: FileText }
  ]

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]


  const monthThemeColors = {
    '规划导航月': 'from-blue-600 to-indigo-600',
    '招聘月': 'from-emerald-600 to-teal-600',
    '人才引备战月': 'from-purple-600 to-pink-600',
    '产品月': 'from-orange-500 to-amber-600',
    '年中总结月': 'from-cyan-600 to-blue-600',
    '学习月': 'from-green-600 to-lime-600',
    '备战月': 'from-red-600 to-rose-600',
    '抢战月': 'from-fuchsia-600 to-violet-600',
    '丰收月': 'from-yellow-500 to-orange-600',
    '冲刺月': 'from-red-600 to-orange-600',
    '总结月': 'from-gray-600 to-gray-800'
  }

  

  const validateBeforeSave = (sheet, dataToSave) => {
    if (sheet === 'action') {
      // 移除 actual_result 和 expected_result 必填（单独页面没有expected_result字段）
      const baseRequired = ['goal','start_date','end_date','what','who','how','why','how_much','department','priority']
      const nextErrors = {}
      dataToSave.actions.forEach((item, idx) => {
        const rowErrors = {}
        const requiredFields = baseRequired
        requiredFields.forEach((f) => {
          const v = (item[f] || '').toString().trim()
          if (!v) rowErrors[f] = '必填'
        })
        if (Object.keys(rowErrors).length) nextErrors[idx] = rowErrors
      })
      setActionErrors(nextErrors)
      if (Object.keys(nextErrors).length) {
        toast.error('请完善带红色提示的必填项')
        return false
      }
    }
    if (sheet === 'planning') {
      const requiredFields = getRequiredFields('annualPlanning')
      const nextErrors = {}
      // 仅校验有填写内容的行；若整表无任何内容则不拦截
      const hasAnyRow = dataToSave.data.some(it => {
        const keys = ['plan_name','department','category','priority','start_date','end_date','budget','expected_result','actual_result','responsible_person','description','remarks']
        return keys.some(k => (it[k] || '').toString().trim())
      })
      dataToSave.data.forEach((item, idx) => {
        const rowErrors = {}
        const rowHasData = ['plan_name','department','category','priority','start_date','end_date','budget','expected_result','actual_result','responsible_person','description','remarks'].some(k => (item[k] || '').toString().trim())
        if (rowHasData) {
          requiredFields.forEach((f) => {
            const v = (item[f] || '').toString().trim()
            if (!v) rowErrors[f] = '必填'
          })
        }
        if (Object.keys(rowErrors).length) nextErrors[idx] = rowErrors
      })
      setPlanningErrors(nextErrors)
      if (hasAnyRow && Object.keys(nextErrors).length) {
        toast.error('请完善带红色提示的必填项')
        return false
      }
    }
    if (sheet === 'events') {
      // 移除 description 和 lessons 必填
      const requiredFields = getRequiredFields('majorEvents')
      
      const nextErrors = {}
      const hasAnyRow = dataToSave.events.some(it => {
        const keys = ['event_name','event_type','importance','responsible_department','responsible_person','budget','actual_cost','description','key_points','success_criteria','risks','lessons_learned']
        return keys.some(k => (it[k] || '').toString().trim())
      })
      dataToSave.events.forEach((item, idx) => {
        const rowErrors = {}
        const rowHasData = ['event_name','event_type','importance','responsible_department','responsible_person','budget','actual_cost','description','key_points','success_criteria','risks','lessons_learned'].some(k => (item[k] || '').toString().trim())
        if (rowHasData) {
          requiredFields.forEach((f) => {
            const v = (item[f] || '').toString().trim()
            if (!v) rowErrors[f] = '必填'
          })
        }
        if (Object.keys(rowErrors).length) nextErrors[idx] = rowErrors
      })
      setEventsErrors(nextErrors)
      if (hasAnyRow && Object.keys(nextErrors).length) {
        toast.error('请完善带红色提示的必填项')
        return false
      }
    }
    if (sheet === 'monthly') {
      const requiredFields = getRequiredFields('monthlyProgress')
      const hasAnyRow = dataToSave.plans.some(it => {
        const keys = ['task_name','department','responsible_person','key_activities','start_date','end_date','target_value','actual_value','completion_rate','status','achievements','challenges','next_month_plan','support_needed']
        return keys.some(k => (it[k] || '').toString().trim())
      })
      if (!hasAnyRow) return true
      const nextErrors = {}
      dataToSave.plans.forEach((item, idx) => {
        const rowHasData = ['task_name','department','responsible_person','key_activities','start_date','end_date','target_value','actual_value','completion_rate','status','achievements','challenges','next_month_plan','support_needed'].some(k => (item[k] || '').toString().trim())
        if (rowHasData) {
          const rowErrors = {}
          requiredFields.forEach((f) => {
            const v = (item[f] || '').toString().trim()
            if (!v) rowErrors[f] = '必填'
          })
          if (Object.keys(rowErrors).length) nextErrors[idx] = rowErrors
        }
      })
      if (Object.keys(nextErrors).length) {
        toast.error('请完善带红色提示的必填项')
        return false
      }
    }
    return true
  }

  const getThemeCellClasses = (theme) => {
    switch (theme) {
      case '规划导航月':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case '招聘月':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      case '人才引备战月':
        return 'bg-pink-50 text-pink-700 border-pink-200'
      case '产品月':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case '年中总结月':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case '学习月':
        return 'bg-green-50 text-green-700 border-green-200'
      case '备战月':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case '抢战月':
        return 'bg-violet-50 text-violet-700 border-violet-200'
      case '丰收月':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case '冲刺月':
        return 'bg-red-50 text-red-700 border-red-200'
      case '总结月':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  const getThemeRowClasses = (theme) => {
    switch (theme) {
      case '规划导航月':
        return 'bg-blue-50'
      case '招聘月':
        return 'bg-teal-50'
      case '人才引备战月':
        return 'bg-pink-50'
      case '产品月':
        return 'bg-orange-50'
      case '年中总结月':
        return 'bg-cyan-50'
      case '学习月':
        return 'bg-green-50'
      case '备战月':
        return 'bg-rose-50'
      case '抢战月':
        return 'bg-violet-50'
      case '丰收月':
        return 'bg-yellow-50'
      case '冲刺月':
        return 'bg-red-50'
      case '总结月':
        return 'bg-gray-100'
      default:
        return 'bg-blue-50'
    }
  }

  const head = (s) => s

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
    loadData()
  }, [selectedYear])

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      const room = d.room || ''
      if (['annualWorkPlans', 'majorEvents', 'monthlyProgress', 'actionPlans'].includes(room)) {
        if (!d.year || d.year === selectedYear) {
          loadData()
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => window.removeEventListener('dataUpdated', handler)
  }, [selectedYear])

  useEffect(() => {
    if (selectedYear && yearChangeByUser) {
      persistSelectedYear(selectedYear, true)
      setYearChangeByUser(false)
    }
  }, [selectedYear, yearChangeByUser])

  const loadData = async () => {
    try {
      // 从数据库加载所有类型的数据
      const [planningResult, eventsResult, monthlyResult, actionResult, deptResult] = await Promise.all([
        getAnnualPlans({ year: selectedYear }),
        getMajorEvents({ year: selectedYear }),
        getMonthlyProgress({ year: selectedYear }),
        getActionPlans({ year: selectedYear }),
        getDepartments()
      ])

      if (planningResult.success && planningResult.data) {
        const loaded = Array.isArray(planningResult.data) ? planningResult.data : []
        const normalizedPlanning = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          // Aggregate all plans for this month
          const foundItems = loaded.filter(e => {
            let itemMonth = Number(e?.month);
            // Fix for legacy data: infer month from plan_name if month is missing
            if (!itemMonth && e?.plan_name) {
               const map = {
                 '规划导航月': 1,
                 '招聘月': 2,
                 '人才引备战月': 3,
                 '产品月 (4月)': 4,
                 '产品月': 4,
                 '产品月 (5月)': 5,
                 '年中总结月': 6,
                 '学习月': 7,
                 '备战月': 8,
                 '抢战月': 9,
                 '丰收月': 10,
                 '冲刺月': 11,
                 '总结月': 12
               }
               if (map[e.plan_name]) itemMonth = map[e.plan_name];
            }
            return itemMonth === m;
          })
          
          if (foundItems.length > 0) {
            // Use the first item's ID for potential updates, but aggregate text fields
            const first = foundItems[0]
            // Helper to join multiple fields (priority: first key, then second key)
            const join = (key, altKey) => foundItems.map(item => item[key] || item[altKey]).filter(v => v !== null && v !== undefined && v !== '').join('\n')
            const categoryJoined = join('category')
            const priorityJoined = join('priority')
            const categoryValue = (categoryJoined || '').toString().split('\n').map(s => s.trim()).filter(Boolean)[0] || ''
            const priorityValue = (priorityJoined || '').toString().split('\n').map(s => s.trim()).filter(Boolean)[0] || ''
            
            return {
              ...first,
              month: m,
              plan_name: join('plan_name', 'goals'),
              department: join('department', 'department_name'),
              category: categoryValue,
              priority: priorityValue,
              start_date: join('start_date'),
              end_date: join('end_date'),
              budget: join('budget', 'resources'),
              actual_cost: join('actual_cost'),
              status: join('status') || 'planning',
              expected_result: join('expected_result'),
              actual_result: join('actual_result'),
              progress: join('progress') || 0,
              responsible_person: join('responsible_person', 'responsible'),
              description: join('description', 'tasks'),
              remarks: join('remarks', 'notes')
            }
          }
          
          return {
            month: m,
            plan_name: '',
            department: '',
            category: '',
            priority: '',
            start_date: '',
            end_date: '',
            budget: '',
            actual_cost: '',
            status: 'planning',
            expected_result: '',
            actual_result: '',
            progress: 0,
            responsible_person: '',
            description: '',
            remarks: ''
          }
        })
        setPlanningData(prev => ({
          ...prev,
          year: selectedYear,
          data: normalizedPlanning
        }))
      }

      if (eventsResult.success && eventsResult.data) {
        const loadedEvents = Array.isArray(eventsResult.data) ? eventsResult.data : []
        const toCnImportance = (v) => {
          if (!v) return ''
          const k = String(v || '').trim().toLowerCase()
          const map = {
            critical: '非常重要',
            high: '重要',
            medium: '一般',
            low: '较低',
            '高': '重要',
            '中': '一般',
            '低': '较低',
            '非常重要': '非常重要',
            '重要': '重要',
            '一般': '一般',
            '较低': '较低'
          }
          return map[k] || ''
        }
        const getMonth = (e) => {
          if (e?.planned_date) {
            const d = new Date(e.planned_date)
            if (!isNaN(d)) return d.getMonth() + 1
          }
          if (e?.actual_date) {
            const d = new Date(e.actual_date)
            if (!isNaN(d)) return d.getMonth() + 1
          }
          if (e?.month) return Number(e.month)
          return undefined
        }
        const normalized = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const foundItems = loadedEvents.filter(e => getMonth(e) === m)
          
          if (foundItems.length > 0) {
            const first = foundItems[0]
            const join = (key) => foundItems.map(item => item[key]).filter(v => v).join('\n')
            // Special handling for importance - take the highest priority? Or just first. taking first for now to avoid confusion
            // Special handling for event_type - join unique
            const types = [...new Set(foundItems.map(item => item.event_type).filter(v => v))]
            
            return {
              id: first.id,
              month: m,
              event_name: join('event_name'),
              event_type: types.join(', '),
              importance: toCnImportance(first.importance),
              planned_date: join('planned_date'),
              actual_date: join('actual_date'),
              responsible_department: join('responsible_department'),
              responsible_person: join('responsible_person'),
              budget: join('budget'),
              actual_cost: join('actual_cost'),
              status: join('status'),
              progress: join('progress'),
              description: join('description'),
              key_points: join('key_points'),
              success_criteria: join('success_criteria'),
              risks: join('risks'),
              lessons_learned: join('lessons_learned')
            }
          }
          return { 
            month: m, 
            event_name: '', 
            event_type: '', 
            importance: '', 
            planned_date: '',
            actual_date: '',
            responsible_department: '',
            responsible_person: '',
            budget: '',
            actual_cost: '',
            status: '',
            progress: '',
            description: '',
            key_points: '',
            success_criteria: '',
            risks: '',
            lessons_learned: ''
          }
        })
        setEventsData(prev => ({ ...prev, year: selectedYear, events: normalized }))
      }

      if (monthlyResult.success && monthlyResult.data) {
        const loadedMonthly = Array.isArray(monthlyResult.data) ? monthlyResult.data : []
        const normalizedMonthly = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const foundItems = loadedMonthly.filter(e => Number(e?.month) === m)
          
          if (foundItems.length > 0) {
            const first = foundItems[0]
            const join = (key, altKey) => foundItems.map(item => item[key] || item[altKey]).filter(v => v).join('\n')
            
            return {
              ...first,
              month: m,
              task_name: join('task_name', 'objectives'),
              department: join('department'),
              responsible_person: join('responsible_person'),
              key_activities: join('key_activities', 'key_tasks'),
              start_date: join('start_date'),
              end_date: join('end_date'),
              target_value: join('target_value'),
              actual_value: join('actual_value'),
              completion_rate: join('completion_rate', 'success_metrics'),
              status: join('status') || 'not_started',
              achievements: join('achievements', 'deliverables'),
              challenges: join('challenges', 'risks'),
              next_month_plan: join('next_month_plan', 'milestones'),
              support_needed: join('support_needed', 'resources_needed')
            }
          }
          return {
            month: m,
            task_name: '',
            department: '',
            responsible_person: '',
            key_activities: '',
            start_date: '',
            end_date: '',
            target_value: '',
            actual_value: '',
            completion_rate: '',
            status: 'not_started',
            achievements: '',
            challenges: '',
            next_month_plan: '',
            support_needed: ''
          }
        })
        setMonthlyPlans(prev => ({ ...prev, year: selectedYear, plans: normalizedMonthly }))
      }

      if (actionResult.success && actionResult.data) {
        const actions = Array.isArray(actionResult.data) ? actionResult.data : []
        // 处理旧数据格式，将when字段转换为start_date和end_date，确保开始日期和结束日期显示
        const processedActions = actions.map(action => {
          if (action.when && !action.start_date) {
            return {
              ...action,
              start_date: action.when,
              end_date: action.when
            }
          }
          return action
        })
        setActionPlans(prev => ({
          ...prev,
          year: selectedYear,
          actions: processedActions
        }))
      }

      if (deptResult && deptResult.success) {
        setDepartments(deptResult.data || [])
      }

    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const handleSave = async (sheet) => {
    try {
      const dataToSave = {
        planning: planningData,
        events: eventsData,
        monthly: monthlyPlans,
        action: actionPlans
      }[sheet]

      if (!validateBeforeSave(sheet, dataToSave)) {
        return
      }

      if (sheet === 'action') {
        // 移除 expected_result（单独页面没有此字段），status和progress是自动计算的非必填
        const baseRequired = ['goal','start_date','end_date','what','who','how','why','how_much','department','priority']
        const nextErrors = {}
        dataToSave.actions.forEach((item, idx) => {
          const rowErrors = {}
          const requiredFields = baseRequired
          requiredFields.forEach((f) => {
            const v = (item[f] || '').toString().trim()
            if (!v) rowErrors[f] = '必填'
          })
          if (Object.keys(rowErrors).length) nextErrors[idx] = rowErrors
        })
        setActionErrors(nextErrors)
        if (Object.keys(nextErrors).length) {
          toast.error('请完善带红色提示的必填项')
          return
        }
      }

      // 获取当前数据数组，仅保存有内容的行
      const dataArrayAll = dataToSave[{
        planning: 'data',
        events: 'events',
        monthly: 'plans',
        action: 'actions'
      }[sheet]]
      const rowHasData = (sheet, item) => {
        if (sheet === 'planning') return ['plan_name','department','category','priority','start_date','end_date','budget','expected_result','actual_result','responsible_person','description','remarks'].some(k => (item[k] || '').toString().trim())
        if (sheet === 'events') return ['event_name','event_type','importance','responsible_department','responsible_person','budget','actual_cost','description','key_points','success_criteria','risks','lessons_learned'].some(k => (item[k] || '').toString().trim())
        if (sheet === 'monthly') return ['task_name','department','responsible_person','key_activities','start_date','end_date','target_value','actual_value','completion_rate','status','achievements','challenges','next_month_plan','support_needed'].some(k => (item[k] || '').toString().trim())
        return true
      }
      const dataArray = (Array.isArray(dataArrayAll) ? dataArrayAll : []).filter(it => rowHasData(sheet, it))

      // 批量保存数据到数据库
      const savePromises = dataArray.map(async (item) => {
        if (sheet === 'events') {
          const toEnImportance = (v) => {
            const k = String(v || '').trim().toLowerCase()
            const map = { 
              'critical': 'critical',
              'high': 'high',
              'medium': 'medium',
              'low': 'low',
              '高': 'high', 
              '中': 'medium', 
              '低': 'low',
              '非常重要': 'critical',
              '重要': 'high',
              '一般': 'medium',
              '较低': 'low'
            }
            return map[k] || ''
          }
          const payload = {
            year: dataToSave.year,
            event_name: item.event_name || '',
            event_type: item.event_type || '',
            importance: toEnImportance(item.importance),
            planned_date: item.planned_date || `${dataToSave.year}-${String(item.month || 1).padStart(2,'0')}-01`,
            actual_date: item.actual_date || '',
            responsible_department: item.responsible_department || '',
            responsible_person: item.responsible_person || '',
            budget: !isNaN(parseFloat(item.budget)) ? parseFloat(item.budget) : 0,
            actual_cost: !isNaN(parseFloat(item.actual_cost)) ? parseFloat(item.actual_cost) : 0,
            status: item.status || '',
            progress: normalizeProgress(item.progress || 0),
            description: item.description || '',
            key_points: item.key_points || '',
            success_criteria: item.success_criteria || '',
            risks: item.risks || '',
            lessons_learned: item.lessons_learned || ''
          }
          if (item.id) {
            const upd = await updateMajorEvent(item.id, payload)
            if (upd && upd.success) return upd
            const add = await addMajorEvent(payload)
            return add
          } else {
            const add = await addMajorEvent(payload)
            return add
          }
        } else if (sheet === 'monthly') {
          const payload = {
            year: dataToSave.year,
            month: item.month,
            task_name: item.task_name || '',
            department: item.department || '',
            responsible_person: item.responsible_person || '',
            key_activities: item.key_activities || '',
            start_date: item.start_date || '',
            end_date: item.end_date || '',
            target_value: item.target_value || null,
            actual_value: item.actual_value || null,
            completion_rate: item.completion_rate || '',
            status: item.status || '',
            achievements: item.achievements || '',
            challenges: item.challenges || '',
            next_month_plan: item.next_month_plan || '',
            support_needed: item.support_needed || ''
          }
          if (item.id) {
            const upd = await updateMonthlyProgress(item.id, payload)
            if (upd && upd.success) return upd
            const add = await addMonthlyProgress(payload)
            return add
          } else {
            const add = await addMonthlyProgress(payload)
            return add
          }
        } else if (sheet === 'action') {
          const payload = {
            year: dataToSave.year,
            goal: item.goal || '',
            what: item.what || '',
            why: item.why || '',
            who: item.who || '',
            start_date: item.start_date || '',
            end_date: item.end_date || '',
            how: item.how || '',
            how_much: item.how_much || null,
            department: item.department || '',
            priority: item.priority || '',
            progress: normalizeProgress(item.progress || 0),
            status: computeActionPlanStatus(normalizeProgress(item.progress || 0), item.end_date || ''),
            actual_result: item.actual_result || '',
            remarks: item.remarks || ''
          }
          if (item.id) {
            const upd = await updateActionPlan(item.id, payload)
            if (upd && upd.success) return upd
            const add = await addActionPlan(payload)
            return add
          } else {
            const add = await addActionPlan(payload)
            return add
          }
        } else {
          // planning
          const payload = { 
            ...item, 
            year: dataToSave.year,
            sheet_type: 'planning',
            plan_name: item.plan_name || '',
            department: item.department || '',
            category: (item.category || '').toString().trim().toLowerCase(),
            priority: (item.priority || '').toString().trim().toLowerCase(),
            start_date: item.start_date || '',
            end_date: item.end_date || '',
            budget: !isNaN(parseFloat(item.budget)) ? parseFloat(item.budget) : 0,
            actual_cost: !isNaN(parseFloat(item.actual_cost)) ? parseFloat(item.actual_cost) : 0,
            status: item.status || '',
            expected_result: item.expected_result || '',
            actual_result: item.actual_result || '',
            progress: normalizeProgress(item.progress || 0),
            responsible_person: item.responsible_person || '',
            description: item.description || '',
            remarks: item.remarks || ''
          }
          if (item.id) {
            const upd = await updateAnnualPlan(item.id, payload)
            if (upd && upd.success) return upd
            const add = await addAnnualPlan(payload)
            return add
          } else {
            const add = await addAnnualPlan(payload)
            return add
          }
        }
      })

      const results = await Promise.all(savePromises)
      const allSuccess = results.every(result => result.success)

      if (allSuccess) {
        toast.success('保存成功')
        loadData()
        try {
          const channels = {
            email: !!notificationPrefs.emailNotification,
            sms: !!notificationPrefs.smsNotification,
            dingtalk: !!notificationPrefs.dingtalkNotification
          }
          const category = sheet === 'action' ? 'workNotice' : sheet === 'monthly' ? 'deadlineAlert' : sheet === 'events' ? 'workNotice' : 'system'
          const count = dataArray.length
          const title = sheet === 'action' ? '工作通知' : sheet === 'monthly' ? '截止提醒' : sheet === 'events' ? '工作通知' : '系统通知'
          const content = `${selectedYear}年${sheets.find(s=>s.key===sheet)?.label}已保存，共${count}条。`
          await sendNotification({ category, title, content, channels, meta: { sheet, year: selectedYear } })
        } catch (_) {}
      } else {
        toast.error('部分数据保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    }
  }

  const deleteEventsRow = async (index) => {
    try {
      const item = eventsData.events[index]
      if (item?.id) await deleteMajorEvent(item.id)
      setEventsData(prev => ({
        ...prev,
        events: prev.events.filter((_, i) => i !== index)
      }))
      toast.success('已删除')
    } catch (e) {
      toast.error('删除失败')
    }
  }

  const deleteMonthlyRow = async (index) => {
    try {
      const item = monthlyPlans.plans[index]
      if (item?.id) await deleteMonthlyProgress(item.id)
      setMonthlyPlans(prev => ({
        ...prev,
        plans: prev.plans.filter((_, i) => i !== index)
      }))
      toast.success('已删除')
    } catch (e) {
      toast.error('删除失败')
    }
  }

  const cleanupEventsDuplicates = async () => {
    try {
      const seen = new Set()
      const toDelete = []
      eventsData.events.forEach(item => {
        const key = `${item.month}-${(item.event_name || '').trim()}`
        if (seen.has(key)) {
          if (item.id) toDelete.push(item.id)
        } else {
          seen.add(key)
        }
      })
      for (const id of toDelete) {
        await deleteMajorEvent(id)
      }
      setEventsData(prev => ({
        ...prev,
        events: prev.events.filter((item, idx) => {
          const key = `${item.month}-${(item.event_name || '').trim()}`
          const firstIdx = prev.events.findIndex(e => `${e.month}-${(e.event_name || '').trim()}` === key)
          return idx === firstIdx
        })
      }))
      toast.success('已清理重复')
    } catch (e) {
      toast.error('清理重复失败')
    }
  }

  const cleanupMonthlyDuplicates = async () => {
    try {
      const seen = new Set()
      const toDelete = []
      monthlyPlans.plans.forEach(item => {
        const key = String(item.month)
        if (seen.has(key)) {
          if (item.id) toDelete.push(item.id)
        } else {
          seen.add(key)
        }
      })
      for (const id of toDelete) {
        await deleteMonthlyProgress(id)
      }
      setMonthlyPlans(prev => ({
        ...prev,
        plans: prev.plans.filter((item, idx) => {
          const key = String(item.month)
          const firstIdx = prev.plans.findIndex(p => String(p.month) === key)
          return idx === firstIdx
        })
      }))
      toast.success('已清理重复')
    } catch (e) {
      toast.error('清理重复失败')
    }
  }

  const cleanupActionDuplicates = async () => {
    try {
      const seen = new Set()
      const toDelete = []
      actionPlans.actions.forEach(item => {
        const key = `${(item.what || '').trim()}-${(item.start_date || '').trim()}`
        if (seen.has(key)) {
          if (item.id) toDelete.push(item.id)
        } else {
          seen.add(key)
        }
      })
      for (const id of toDelete) {
        await deleteActionPlan(id)
      }
      setActionPlans(prev => ({
        ...prev,
        actions: prev.actions.filter((item, idx) => {
          const key = `${(item.what || '').trim()}-${(item.start_date || '').trim()}`
          const firstIdx = prev.actions.findIndex(a => `${(a.what || '').trim()}-${(a.start_date || '').trim()}` === key)
          return idx === firstIdx
        })
      }))
      toast.success('已清理重复')
    } catch (e) {
      toast.error('清理重复失败')
    }
  }

  const cleanupPlanningDuplicates = async () => {
    try {
      const seen = new Set()
      const duplicates = []
      planningData.data.forEach(item => {
        const key = String(item.month)
        if (seen.has(key)) {
          if (item.id) duplicates.push(item.id)
        } else {
          seen.add(key)
        }
      })
      for (const id of duplicates) {
        await deleteAnnualPlan(id)
      }
      await loadData()
      toast.success('已清理重复数据')
    } catch (e) {
      console.error('清理重复失败:', e)
      toast.error('清理重复失败')
    }
  }

  // 同步相关表格数据的函数
  const syncRelatedTables = (sheet, updatedRow) => {
    const month = updatedRow.month
    const department = updatedRow.department
    const year = selectedYear
    
    // 1. 当更新年度规划表时，同步更新其他表格
    if (sheet === 'planning') {
      // 同步到大事件提炼
      setEventsData(prev => {
        const newEvents = [...prev.events]
        if (newEvents[month - 1]) {
          newEvents[month - 1] = {
            ...newEvents[month - 1],
            responsible_department: department,
            year
          }
        }
        return { ...prev, events: newEvents }
      })
      
      // 同步到月度推进计划
      setMonthlyPlans(prev => {
        const newPlans = [...prev.plans]
        if (newPlans[month - 1]) {
          newPlans[month - 1] = {
            ...newPlans[month - 1],
            department,
            year
          }
        }
        return { ...prev, plans: newPlans }
      })
      
      // 同步到5W2H行动计划
      setActionPlans(prev => {
        const newActions = prev.actions.map(action => {
          // 匹配相同月份和部门的行动计划
          if (action.month === month && action.department === department) {
            return { ...action, year }
          }
          return action
        })
        return { ...prev, actions: newActions }
      })
    }
    
    // 2. 当更新大事件提炼时，同步更新其他表格
    else if (sheet === 'events') {
      // 同步到年度规划表
      setPlanningData(prev => {
        const newData = [...prev.data]
        if (newData[month - 1]) {
          newData[month - 1] = {
            ...newData[month - 1],
            department: updatedRow.responsible_department,
            year
          }
        }
        return { ...prev, data: newData }
      })
      
      // 同步到月度推进计划
      setMonthlyPlans(prev => {
        const newPlans = [...prev.plans]
        if (newPlans[month - 1]) {
          newPlans[month - 1] = {
            ...newPlans[month - 1],
            department: updatedRow.responsible_department,
            year
          }
        }
        return { ...prev, plans: newPlans }
      })
    }
    
    // 3. 当更新月度推进计划时，同步更新其他表格
    else if (sheet === 'monthly') {
      // 同步到年度规划表
      setPlanningData(prev => {
        const newData = [...prev.data]
        if (newData[month - 1]) {
          newData[month - 1] = {
            ...newData[month - 1],
            department,
            year
          }
        }
        return { ...prev, data: newData }
      })
      
      // 同步到大事件提炼
      setEventsData(prev => {
        const newEvents = [...prev.events]
        if (newEvents[month - 1]) {
          newEvents[month - 1] = {
            ...newEvents[month - 1],
            responsible_department: department,
            year
          }
        }
        return { ...prev, events: newEvents }
      })
    }
    
    // 4. 当更新5W2H行动计划时，同步更新其他表格
    else if (sheet === 'action') {
      // 同步到年度规划表
      if (month) {
        setPlanningData(prev => {
          const newData = [...prev.data]
          if (newData[month - 1]) {
            newData[month - 1] = {
              ...newData[month - 1],
              department,
              year
            }
          }
          return { ...prev, data: newData }
        })
      }
    }
  }

  const handleCellEdit = async (sheet, index, field, value) => {
    const setters = {
      planning: setPlanningData,
      events: setEventsData,
      monthly: setMonthlyPlans,
      action: setActionPlans
    }
    const stateMap = {
      planning: planningData,
      events: eventsData,
      monthly: monthlyPlans,
      action: actionPlans
    }

    const setter = setters[sheet]
    const currentState = stateMap[sheet]
    if (!setter || !currentState) return

    const arrayKey = {
      planning: 'data',
      events: 'events',
      monthly: 'plans',
      action: 'actions'
    }[sheet]

    if (!currentState[arrayKey] || !currentState[arrayKey][index]) return

    const currentRow = { ...currentState[arrayKey][index] }
    let nextValue = value
    let updatedRow = null

    if (sheet === 'action') {
      if (field === 'progress') {
        nextValue = normalizeProgress(value)
        updatedRow = { ...currentRow, [field]: nextValue }
        const dateToUse = updatedRow.end_date || updatedRow.start_date
        const s = computeActionPlanStatus(nextValue, dateToUse)
        updatedRow.status = s
      } else if (field === 'how_much' || field === 'actual_result') {
        updatedRow = { ...currentRow, [field]: nextValue }
        
        const budget = parseFloat(field === 'how_much' ? nextValue : currentRow.how_much)
        const actual = parseFloat(field === 'actual_result' ? nextValue : currentRow.actual_result)
        
        let p = 0
        if (!isNaN(budget) && !isNaN(actual) && budget > 0) {
          p = (actual / budget) * 100
        }
        p = parseFloat(p.toFixed(2))
        const normalizedP = normalizeProgress(p)
        
        updatedRow.progress = normalizedP
        const dateToUse = updatedRow.end_date || updatedRow.start_date
        updatedRow.status = computeActionPlanStatus(normalizedP, dateToUse)
      } else if (field === 'start_date' || field === 'end_date') {
        updatedRow = { ...currentRow, [field]: nextValue }
        const p = normalizeProgress(updatedRow.progress)
        const dateToUse = field === 'end_date' ? nextValue : (updatedRow.end_date || updatedRow.start_date)
        const s = computeActionPlanStatus(p, dateToUse)
        updatedRow.status = s
      } else {
        updatedRow = { ...currentRow, [field]: nextValue }
      }
    } else if (sheet === 'monthly') {
      if (field === 'target_value' || field === 'actual_value') {
        updatedRow = { ...currentRow, [field]: nextValue }
        const target = parseFloat(field === 'target_value' ? nextValue : currentRow.target_value)
        const actual = parseFloat(field === 'actual_value' ? nextValue : currentRow.actual_value)
        
        let rate = 0
        if (!isNaN(target) && !isNaN(actual) && target !== 0) {
          rate = (actual / target) * 100
        }
        const normalizedRate = normalizeProgress(rate)
        updatedRow.completion_rate = normalizedRate
        
        const dateToUse = updatedRow.end_date || updatedRow.start_date
        updatedRow.status = computeActionPlanStatus(normalizedRate, dateToUse)
      } else if (field === 'start_date' || field === 'end_date') {
        updatedRow = { ...currentRow, [field]: nextValue }
        const p = normalizeProgress(updatedRow.completion_rate)
        const dateToUse = field === 'end_date' ? nextValue : (updatedRow.end_date || updatedRow.start_date)
        updatedRow.status = computeActionPlanStatus(p, dateToUse)
      } else {
        updatedRow = { ...currentRow, [field]: nextValue }
      }
    } else if (sheet === 'events') {
      if (field === 'budget' || field === 'actual_cost') {
        updatedRow = { ...currentRow, [field]: nextValue }
        const budget = parseFloat(field === 'budget' ? nextValue : currentRow.budget)
        const actual = parseFloat(field === 'actual_cost' ? nextValue : currentRow.actual_cost)
        
        let p = 0
        if (!isNaN(budget) && !isNaN(actual) && budget !== 0) {
          p = (actual / budget) * 100
        }
        p = parseFloat(p.toFixed(2))
        const normalizedP = normalizeProgress(p)
        
        updatedRow.progress = normalizedP
        const s = computeActionPlanStatus(normalizedP, updatedRow.planned_date)
        updatedRow.status = s
      } else if (field === 'planned_date' || field === 'actual_date') {
        updatedRow = { ...currentRow, [field]: nextValue }
        const p = normalizeProgress(updatedRow.progress)
        const dateToUse = field === 'planned_date' ? nextValue : (updatedRow.planned_date)
        const s = computeActionPlanStatus(p, dateToUse)
        updatedRow.status = s
      } else {
        updatedRow = { ...currentRow, [field]: nextValue }
      }
    } else if (sheet === 'planning') {
      if (field === 'budget' || field === 'actual_cost') {
        updatedRow = { ...currentRow, [field]: nextValue }
        const budget = parseFloat(field === 'budget' ? nextValue : currentRow.budget)
        const actual = parseFloat(field === 'actual_cost' ? nextValue : currentRow.actual_cost)
        
        let p = 0
        if (!isNaN(budget) && !isNaN(actual) && budget !== 0) {
          p = (actual / budget) * 100
        }
        p = parseFloat(p.toFixed(2))
        const normalizedP = normalizeProgress(p)
        
        updatedRow.progress = normalizedP
        const s = computeActionPlanStatus(normalizedP, updatedRow.end_date)
        updatedRow.status = s
      } else if (field === 'category' || field === 'priority') {
        const v = (nextValue || '').toString().trim().toLowerCase()
        updatedRow = { ...currentRow, [field]: v }
      } else if (field === 'start_date' || field === 'end_date') {
        updatedRow = { ...currentRow, [field]: nextValue }
        const p = normalizeProgress(updatedRow.progress)
        const dateToUse = field === 'end_date' ? nextValue : (updatedRow.end_date)
        const s = computeActionPlanStatus(p, dateToUse)
        updatedRow.status = s
      } else {
        updatedRow = { ...currentRow, [field]: nextValue }
      }
    } else {
      updatedRow = { ...currentRow, [field]: nextValue }
    }

    // Validation Logic
    const requiredFields = getRequiredFields(
        sheet === 'planning' ? 'annualPlanning' :
        sheet === 'events' ? 'majorEvents' :
        sheet === 'monthly' ? 'monthlyProgress' :
        sheet === 'action' ? 'actionPlans' : ''
    )

    if (requiredFields.includes(field)) {
        const errorSetter = {
            planning: setPlanningErrors,
            events: setEventsErrors,
            monthly: setMonthlyErrors,
            action: setActionErrors
        }[sheet]
        
        if (errorSetter) {
            const valStr = (nextValue || '').toString().trim()
            errorSetter(prev => {
                const next = { ...prev }
                const rowErrors = { ...(next[index] || {}) }
                
                if (!valStr) {
                    rowErrors[field] = '必填'
                    next[index] = rowErrors
                } else {
                    delete rowErrors[field]
                    if (Object.keys(rowErrors).length === 0) {
                        delete next[index]
                    } else {
                        next[index] = rowErrors
                    }
                }
                return next
            })
        }
    }

    // Update State
    setter(prev => {
      const newData = { ...prev }
      if (newData[arrayKey] && newData[arrayKey][index]) {
        newData[arrayKey][index] = updatedRow
      }
      return newData
    })

    try {
      const id = updatedRow.id
      let result
      
      if (sheet === 'planning') {
        // Map fields to match AnnualWorkPlan schema where possible
        const payload = {
          ...updatedRow,
          year: selectedYear,
          sheet_type: 'planning',
          // Sync key fields
          plan_name: updatedRow.goals || updatedRow.plan_name,
          description: updatedRow.tasks || updatedRow.description,
          responsible_person: updatedRow.responsible || updatedRow.responsible_person,
          remarks: updatedRow.notes || updatedRow.remarks,
          // Try to pass budget if resources looks like a number
          budget: !isNaN(parseFloat(updatedRow.resources)) ? parseFloat(updatedRow.resources) : (updatedRow.budget || 0)
        }
        
        if (id) result = await updateAnnualPlan(id, payload)
        else result = await addAnnualPlan(payload)
      } else if (sheet === 'events') {
        const payload = { ...updatedRow, year: selectedYear }
        if (id) result = await updateMajorEvent(id, payload)
        else result = await addMajorEvent(payload)
      } else if (sheet === 'monthly') {
        const payload = { ...updatedRow, year: selectedYear }
        if (id) result = await updateMonthlyProgress(id, payload)
        else result = await addMonthlyProgress(payload)
      } else if (sheet === 'action') {
        const payload = { ...updatedRow, year: selectedYear }
        if (id) result = await updateActionPlan(id, payload)
        else result = await addActionPlan(payload)
      }

      if (result && result.success) {
         // Update ID if new
         if (!id && result.data && result.data.id) {
            setter(prev => {
              const newData = { ...prev }
              if (newData[arrayKey] && newData[arrayKey][index]) {
                newData[arrayKey][index] = { ...newData[arrayKey][index], id: result.data.id }
                updatedRow = newData[arrayKey][index] // 更新updatedRow的ID
              }
              return newData
            })
         }
         
         // 1. 调用syncRelatedTables函数同步相关表格数据
         syncRelatedTables(sheet, updatedRow)
         
         // 2. 重新加载所有数据以确保数据一致性
         await loadData()
         
         toast.success('数据已保存并同步')
      }
    } catch (e) {
      console.error('Save failed', e)
    }

    setEditingCell({ row: null, col: null, sheet: null })
  }

  const EditableCell = ({ sheet, index, field, value, type = 'text', options = [], item, error }) => {
    const cellKey = `${sheet}-${index}-${field}`
    const isEditing = editingCell.row === index && 
                     editingCell.col === field && 
                     editingCell.sheet === sheet
    
    const errorClass = error ? 'border border-red-500 ring-1 ring-red-500 rounded' : ''

    if (isEditing) {
      if (type === 'select' && (field === 'department' || field === 'responsible_department')) {
        return (
          <div className={`w-full ${errorClass}`}>
            <OrgDepartmentSelect
              value={value || ''}
              onChange={(v) => {
                handleCellEdit(sheet, index, field, v)
                setEditingCell({ row: null, col: null, sheet: null })
              }}
              placeholder="请选择部门"
              leafOnly
            />
          </div>
        )
      }
      if (type === 'textarea') {
        return (
          <textarea
            defaultValue={value || ''}
            autoFocus
            onBlur={(e) => handleCellEdit(sheet, index, field, e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleCellEdit(sheet, index, field, e.target.value)
              }
            }}
            className={`w-full border-0 bg-yellow-100 text-sm p-1 resize-none ${errorClass}`}
            rows={sheet === 'action' ? 2 : 3}
          />
        )
      }

      if (type === 'select') {
        return (
          <select
            defaultValue={value || ''}
            autoFocus
            onBlur={(e) => handleCellEdit(sheet, index, field, e.target.value)}
            onChange={(e) => handleCellEdit(sheet, index, field, e.target.value)}
            className={`w-full border-0 bg-yellow-100 text-center text-sm p-2 ${errorClass}`}
          >
            {options.map((opt, index) => {
              const o = typeof opt === 'string' ? { value: opt, label: opt } : opt
              return (
                <option key={`${field}-${o.value}-${index}`} value={o.value}>{o.label}</option>
              )
            })}
          </select>
        )
      }

      return (
        <input
          type={type}
          defaultValue={value || ''}
          autoFocus
          onBlur={(e) => handleCellEdit(sheet, index, field, e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCellEdit(sheet, index, field, e.target.value)
            }
          }}
          className={`w-full border-0 bg-yellow-100 text-center text-sm p-1 ${errorClass}`}
        />
      )
    }

    const badge = (val) => {
      const map = {
        '高': 'bg-red-100 text-red-700',
        '中': 'bg-yellow-100 text-yellow-700',
        '低': 'bg-green-100 text-green-700'
      }
      const cls = map[val]
      if (!cls) return val || ''
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{val}</span>
      )
    }

    const renderValue = () => {
      if (field === 'importance') return badge(value)
      if (field === 'priority') {
        const v = String(value || '').toLowerCase()
        const map = {
            'critical': { label: '非常重要', cls: 'bg-purple-100 text-purple-800' },
            'high': { label: '重要', cls: 'bg-red-100 text-red-800' },
            'medium': { label: '一般', cls: 'bg-yellow-100 text-yellow-800' },
            'low': { label: '较低', cls: 'bg-green-100 text-green-800' }
        }
        const config = map[v]
        if (config) {
            return <span className={`px-2 py-1 rounded-full text-xs ${config.cls}`}>{config.label}</span>
        }
        // Fallback for backward compatibility
        const txt = v==='high'?'高':v==='medium'?'中':v==='low'?'低':(value||'')
        const cls = v==='high'?'bg-red-100 text-red-800':v==='medium'?'bg-yellow-100 text-yellow-800':v==='low'?'bg-green-100 text-green-800':''
        return cls ? (<span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{txt}</span>) : txt
      }
      if (field === 'category') {
          if (options && options.length) {
              const v = String(value || '').toLowerCase()
              const opt = options.find(o => String(o.value).toLowerCase() === v)
              if (opt) return opt.label
          }
          // Fallback map if options not provided or value not found
           const map = {
            'strategic': '战略性事件',
            'operational': '运营性事件',
            'risk': '风险性事件',
            'opportunity': '机会性事件',
            'business': '业务性事件',
            'management': '管理性事件',
            'temporary': '临时性事件'
          }
          return map[String(value||'').toLowerCase()] || value || ''
      }
      if (field === 'status') {
        // Use logic from standalone pages to determine status display
        const progressVal = item ? (item.progress || item.completion_rate || 0) : 0
        const dateVal = item ? (
          sheet === 'events' ? item.planned_date : 
          sheet === 'planning' ? item.end_date :
          (item.end_date || item.start_date)
        ) : null

        // Replicate renderStatusBadge logic from MajorEvents.jsx / MonthlyProgress.jsx
        const p = Number(progressVal) || 0
        let statusText = '未开始'
        let colorClass = ''
        
        if (p === 100) {
          colorClass = 'bg-blue-100 text-blue-800'
          statusText = '已完成'
        } else if (p > 75) {
          colorClass = 'bg-emerald-100 text-emerald-800'
          statusText = '即将完成'
        } else if (p > 50) {
          colorClass = 'bg-orange-100 text-orange-800'
          statusText = '接近完成'
        } else if (p > 25) {
          colorClass = 'bg-lime-100 text-lime-800'
          statusText = '进行中'
        } else if (p > 0) {
          colorClass = 'bg-green-50 text-green-700'
          statusText = '初始'
        } else {
          colorClass = 'bg-white border border-gray-200 text-gray-500'
          statusText = '未开始'
        }

        // Check for delay if value is 'delayed' (computed by handleCellEdit)
        if (value === 'delayed') {
           statusText += ' (延期)'
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
            {statusText}
          </span>
        )
      }
      if (sheet === 'events' && field === 'event_type') {
        const map = {
          strategic: '战略性事件',
          strateg: '战略性事件',
          operational: '运营性事件',
          operation: '运营性事件',
          opportunity: '机会性事件',
          risk: '风险性事件',
          product: '产品',
          recruitment: '招聘',
          training: '培训',
          meeting: '会议',
          release: '发布',
          promotion: '推广',
          audit: '审计',
          delivery: '交付',
          milestone: '里程碑',
          purchase: '采购',
          inventory: '库存',
          quality: '质量',
          plan: '计划',
          summary: '总结',
          campaign: '活动',
          launch: '发布',
          hiring: '招聘'
        }
        const txt = map[(value || '').toLowerCase().trim()] || (value || '')
        return txt
      }
      if (field === 'progress') {
        const num = Number(value || 0)
        return `${isNaN(num)?0:num}%`
      }
      return value || ''
    }

    const actionEllipsisFields = ['goal','when','what','who','how','why','how_much','department','priority','status','progress','actual_result','remarks']
    const monthlyEllipsisFields = ['task_name','department','responsible_person','target_value','actual_value','completion_rate','key_activities','achievements','challenges','next_month_plan','support_needed']
    const planningEllipsisFields = ['plan_name','description','remarks','expected_result','responsible_person']
    const eventsEllipsisFields = ['event_name','event_type','importance','description','key_points','success_criteria','risks','lessons_learned']
    const useEllipsis = (sheet === 'action' && actionEllipsisFields.includes(field)) || (sheet === 'monthly' && monthlyEllipsisFields.includes(field)) || (sheet === 'planning' && planningEllipsisFields.includes(field)) || (sheet === 'events' && eventsEllipsisFields.includes(field))
    const cellClass = useEllipsis ? 'text-ellipsis cell-limit' : 'text-break whitespace-pre-wrap leading-relaxed'
    const content = renderValue()
    const display = (useEllipsis && typeof content === 'string')
      ? (content.length > 3 ? `${content.slice(0,3)}...` : content)
      : content

    return (
      <div
        onClick={() => {
          if (sheet === 'action' && field === 'progress') return;
          setEditingCell({ row: index, col: field, sheet })
        }}
        className={`cursor-pointer hover:bg-blue-50 ${sheet==='action' ? 'p-1 min-h-8' : sheet==='events' ? 'p-1 min-h-8' : 'p-2 min-h-12'} flex items-center justify-start text-left ${errorClass}`}
        title={error || (typeof content === 'string' ? content : '点击编辑')}
      >
        <div className={cellClass}>{display}</div>
      </div>
    )
  }

  const handleExport = (sheet) => {
    const dataMap = {
      planning: planningData.data,
      events: eventsData.events,
      monthly: monthlyPlans.plans,
      action: actionPlans.actions
    }
    
    const sheetNameMap = {
      planning: '年度规划表',
      events: '大事件提炼',
      monthly: '月度推进计划',
      action: '5W2H行动计划'
    }
    
    const data = dataMap[sheet]
    if (!data || data.length === 0) {
      toast('当前没有可导出的数据', { icon: 'ℹ️' })
      return
    }
    
    const toastId = toast.loading('正在导出数据...', { duration: 0 })

    setTimeout(() => {
      try {
        const name = sheet === 'planning' 
          ? `${companyName}_${selectedYear}年_年度规划表`
          : `${companyName}_${selectedYear}年_${sheetNameMap[sheet]}`
        const sheetLabel = sheetNameMap[sheet]
        exportToExcel(data, name, sheetLabel, sheet)
        toast.success(`已导出 ${data.length} 条数据`, { id: toastId })
      } catch (error) {
        console.error('导出失败:', error)
        toast.error('导出失败: ' + error.message, { id: toastId })
      }
    }, 100)
  }

  const handleNotifyStatus = () => {
    try {
      const rows = getCurrentSheetData()
      const keys = getCurrentSheetColumns().map(c => c.key).filter(k => k !== 'notes')
      const filledCount = rows.filter(r => keys.some(k => (r[k] || '').toString().trim())).length
      const label = sheets.find(s => s.key === currentSheet)?.label
      toast.success(`当前表：${label}，年份：${selectedYear}，行数：${rows.length}，已填写：${filledCount}`)
    } catch (e) {
      toast.error('无法获取当前状态')
    }
  }

  const getFilteredEvents = () => {
    const list = eventsData.events.map((item, idx) => ({ item, index: idx }))
    return list.filter(({ item }) => {
      const typeOk = !eventsFilter.event_type || (item.event_type || '').includes(eventsFilter.event_type)
      const impOk = !eventsFilter.importance || (item.importance || '') === eventsFilter.importance
      let monthOk = true
      if (eventsFilter.month) {
        const m = parseInt(eventsFilter.month)
        const plannedDate = item.planned_date ? new Date(item.planned_date) : null
        const actualDate = item.actual_date ? new Date(item.actual_date) : null
        monthOk = (plannedDate && plannedDate.getMonth() + 1 === m) || (actualDate && actualDate.getMonth() + 1 === m) || item.month === m
      }
      const deptOk = !eventsFilter.responsible_department || (item.responsible_department || '') === eventsFilter.responsible_department
      const statusOk = !eventsFilter.status || (item.status || '') === eventsFilter.status
      return typeOk && impOk && monthOk && deptOk && statusOk
    })
  }

  const getEventsFilterCount = () => {
    let count = 0
    if (eventsFilter.event_type) count++
    if (eventsFilter.importance) count++
    if (eventsFilter.month) count++
    if (eventsFilter.responsible_department) count++
    if (eventsFilter.status) count++
    return count
  }

  const handleResetEventsFilter = async () => {
    try {
      setEventsFilter({ event_type: '', importance: '', month: '', responsible_department: '', status: '' })
      setShowFilterOpen(false)
      await loadData()
      toast.success('已重置筛选')
    } catch (e) {}
  }

  // 年度规划表筛选
  const getFilteredPlanning = () => {
    const list = planningData.data.map((item, idx) => ({ item, index: idx }))
    return list.filter(({ item }) => {
      const categoryOk = !planningFilter.category || (item.category || '') === planningFilter.category
      const priorityOk = !planningFilter.priority || (item.priority || '') === planningFilter.priority
      const statusOk = !planningFilter.status || (item.status || '') === planningFilter.status
      const deptOk = !planningFilter.department || (item.department || '') === planningFilter.department
      return categoryOk && priorityOk && statusOk && deptOk
    })
  }

  const getPlanningFilterCount = () => {
    let count = 0
    if (planningFilter.category) count++
    if (planningFilter.priority) count++
    if (planningFilter.status) count++
    if (planningFilter.department) count++
    return count
  }

  const handleResetPlanningFilter = () => {
    setPlanningFilter({ category: '', priority: '', status: '', department: '' })
    setShowFilterOpen(false)
    toast.success('已重置筛选')
  }

  // 月度推进计划筛选
  const getFilteredMonthly = () => {
    const list = monthlyPlans.plans.map((item, idx) => ({ item, index: idx }))
    return list.filter(({ item }) => {
      const monthOk = !monthlyFilter.month || String(item.month) === monthlyFilter.month
      const deptOk = !monthlyFilter.department || (item.department || '') === monthlyFilter.department
      const statusOk = !monthlyFilter.status || (item.status || '') === monthlyFilter.status
      return monthOk && deptOk && statusOk
    })
  }

  const getMonthlyFilterCount = () => {
    let count = 0
    if (monthlyFilter.month) count++
    if (monthlyFilter.department) count++
    if (monthlyFilter.status) count++
    return count
  }

  const handleResetMonthlyFilter = () => {
    setMonthlyFilter({ month: '', department: '', status: '' })
    setShowFilterOpen(false)
    toast.success('已重置筛选')
  }

  // 5W2H行动计划筛选
  const getFilteredActions = () => {
    const list = actionPlans.actions.map((item, idx) => ({ item, index: idx }))
    return list.filter(({ item }) => {
      let monthOk = true
      if (actionFilter.month) {
        const m = parseInt(actionFilter.month)
        const startDate = item.start_date ? new Date(item.start_date) : null
        const endDate = item.end_date ? new Date(item.end_date) : null
        monthOk = (startDate && startDate.getMonth() + 1 === m) || (endDate && endDate.getMonth() + 1 === m)
      }
      const deptOk = !actionFilter.department || (item.department || '') === actionFilter.department
      const statusOk = !actionFilter.status || (item.status || '') === actionFilter.status
      const priorityOk = !actionFilter.priority || (item.priority || '') === actionFilter.priority
      return monthOk && deptOk && statusOk && priorityOk
    })
  }

  const getActionFilterCount = () => {
    let count = 0
    if (actionFilter.month) count++
    if (actionFilter.department) count++
    if (actionFilter.status) count++
    if (actionFilter.priority) count++
    return count
  }

  const handleResetActionFilter = () => {
    setActionFilter({ month: '', department: '', status: '', priority: '' })
    setShowFilterOpen(false)
    toast.success('已重置筛选')
  }

  const toggleSelectExtract = (idx) => {
    setSelectedExtractIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  const confirmExtract = () => {
    const toAdd = planningData.data
      .map((p, idx) => ({ p, idx }))
      .filter(({ idx }) => selectedExtractIndices.includes(idx))
      .map(({ p }) => ({
        month: p.month,
        event_name: (p.theme || p.goals || '').toString().trim(),
        event_type: (p.theme || '').toString().trim(),
        importance: '中',
        description: [p.goals, p.tasks].filter(Boolean).join('；').trim(),
        impact: '',
        lessons: ''
      }))

    const merged = [...eventsData.events]
    toAdd.forEach(ev => {
      const existsIdx = merged.findIndex(e => e.month === ev.month && (e.event_name || '').trim() === ev.event_name)
      if (existsIdx >= 0) {
        merged[existsIdx] = { ...merged[existsIdx], ...ev }
      } else {
        merged.push(ev)
      }
    })
    setEventsData(prev => ({ ...prev, events: merged }))
    setShowExtractModal(false)
    setSelectedExtractIndices([])
    toast.success('已提炼至大事件')
  }

  const renderColumnVisibilityToggle = (sheetName) => {
    const columns = getCurrentSheetColumns()
    
    return (
      <div className="relative" ref={columnSelectorRef}>
        <button
          type="button"
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold"
          title="列设置"
        >
          <Columns size={16} />
          <span className="hidden sm:inline">列设置</span>
        </button>
        
        {showColumnSelector && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-50 border border-gray-100 p-3 max-h-80 overflow-y-auto">
            <div className="text-sm font-bold text-gray-700 mb-2 px-1">显示列</div>
            <div className="space-y-1">
              {columns.map(col => (
                <label key={col.key} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={!isHidden(sheetName, col.key)}
                    onChange={() => toggleColumnVisibility(sheetName, col.key)}
                  />
                  <span className="ml-2 text-sm text-gray-700 truncate">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDynamicTable = (sheetName, data, errors = {}) => {
    const columns = getCurrentSheetColumns()
    
    return (
      <div className="overflow-x-auto rounded-3xl shadow-2xl border border-gray-200/50">
        <table className="w-full border-collapse table-excel-borders table-compact min-w-[1200px]">
          <thead>
            <tr>
              {columns.map(col => {
                if (isHidden(sheetName, col.key)) return null
                const isSticky = (col.key === 'month' && sheetName === 'planning')
                
                return (
                  <th key={col.key} className={`px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm text-sm font-semibold text-gray-700 text-center border-r border-gray-200/50 whitespace-nowrap ${isSticky ? 'sticky left-0 z-10' : ''}`}>
                    <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                      <span>{col.label}</span>
                      {col.required && <span className="ml-1 text-red-500">*</span>}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="group hover:bg-blue-50/30 transition-all duration-300 border-b border-gray-100/50">
                {columns.map(col => {
                  if (isHidden(sheetName, col.key)) return null
                  const isSticky = (col.key === 'month' && sheetName === 'planning')
                  
                  return (
                    <td key={col.key} className={`px-4 py-3 border-r border-gray-200/30 transition-colors duration-300 ${isSticky ? 'sticky left-0 bg-white z-10 group-hover:bg-blue-50/30' : ''}`}>
                      {sheetName === 'planning' && col.key === 'month' ? (
                        <div className="flex items-center justify-center">
                          <div className="inline-flex items-center px-3 h-8 rounded-full bg-white ring-1 ring-gray-200 shadow-sm">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mr-1 ring-2 ring-white shadow-md">
                              {item.month}
                            </div>
                            <span className="text-xs font-medium text-gray-700">月</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <EditableCell
                            sheet={sheetName}
                            index={index}
                            field={col.key}
                            value={item[col.key]}
                            type={col.type || 'text'}
                            options={col.options}
                            disabled={col.disabled}
                            render={col.render} // Pass render if EditableCell supports it or handles it
                          />
                          {errors && errors[index]?.[col.key] && <span className="text-red-500 text-xs mt-1 block">{errors[index][col.key]}</span>}
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const handleImportEvents = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet)
        const mapped = json.map(r => ({
          month: (() => {
            const raw = Number(r['月份'] ?? r['month'] ?? r.month ?? 1)
            return Number.isFinite(raw) ? Math.min(12, Math.max(1, raw)) : 1
          })(),
          event_name: (r['事件名称'] ?? r['event_name'] ?? r.event_name ?? '').toString().trim(),
          event_type: (r['事件类型'] ?? r['event_type'] ?? r.event_type ?? '').toString().trim(),
          importance: (r['重要程度'] ?? r['importance'] ?? r.importance ?? '').toString().trim(),
          description: (r['事件描述'] ?? r['description'] ?? r.description ?? '').toString().trim(),
          impact: (r['影响分析'] ?? r['impact'] ?? r.impact ?? '').toString().trim(),
          lessons: (r['经验教训'] ?? r['lessons'] ?? r.lessons ?? '').toString().trim()
        }))
        setEventsData(prev => ({ ...prev, events: [...prev.events, ...mapped] }))
        toast.success('导入成功')
      } catch (err) {
        toast.error('导入失败')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const renderStatusBadge = (progress, endDate) => {
    const p = normalizeProgress(progress)
    const status = computeActionPlanStatus(p, endDate)
    
    let statusText = '未开始'
    let colorClass = ''
    
    if (p === 100) {
      colorClass = 'bg-blue-100 text-blue-800'
      statusText = '已完成'
    } else if (p > 75) {
      colorClass = 'bg-emerald-100 text-emerald-800'
      statusText = '即将完成'
    } else if (p > 50) {
      colorClass = 'bg-orange-100 text-orange-800'
      statusText = '接近完成'
    } else if (p > 25) {
      colorClass = 'bg-lime-100 text-lime-800'
      statusText = '进行中'
    } else if (p > 0) {
      colorClass = 'bg-green-50 text-green-700'
      statusText = '初始'
    } else {
      colorClass = 'bg-white border border-gray-200 text-gray-500'
      statusText = '未开始'
    }
    
    if (status === 'delayed') {
      statusText += ' (延期)'
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${colorClass}`}>
        {statusText}
      </span>
    )
  }

  // 获取当前表格的数据
  const getCurrentSheetData = () => {
    const dataMap = {
      planning: planningData.data,
      events: eventsData.events,
      monthly: monthlyPlans.plans,
      action: actionPlans.actions
    }
    return dataMap[currentSheet] || []
  }

  // 获取当前表格的列定义（与单独页面字段保持一致）
  const getCurrentSheetColumns = () => {
    const THEMES = ['规划导航月', '招聘月', '人才引备战月', '产品月', '产品月', '年中总结月', '学习月', '备战月', '抢战月', '丰收月', '冲刺月', '总结月']
    
    const columnsMap = {
      // 年度规划表 - 与 AnnualWorkPlan.jsx 字段一致
      planning: [
        { 
          key: 'year', 
          label: '年份', 
          type: 'select',
          options: years.map(y => ({ value: y, label: `${y}年` })),
          required: true
        },
        { 
          key: 'month', 
          label: '月份/主题', 
          type: 'select', 
          required: true,
          options: THEMES.map((t, i) => ({ value: i + 1, label: `${i + 1}月 - ${t}` })),
          render: (value) => {
            if (!value) return '-'
            const t = THEMES[value - 1]
            return `${value}月${t ? ` (${t})` : ''}`
          }
        },
        { key: 'plan_name', label: '计划名称', required: true },
        { 
          key: 'department', 
          label: '负责部门', 
          type: 'select', 
          required: true,
          options: departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name }))
        },
        { 
          key: 'category', 
          label: '类别', 
          type: 'select', 
          required: true,
          options: CATEGORY_OPTIONS,
          render: (v) => {
            const opt = CATEGORY_OPTIONS.find(o => o.value === String(v || '').toLowerCase())
            return opt ? opt.label : v
          }
        },
        { 
          key: 'priority', 
          label: '优先级', 
          type: 'select', 
          required: true,
          options: PRIORITY_OPTIONS,
          render: (v) => {
            const opt = PRIORITY_OPTIONS.find(o => o.value === String(v || '').toLowerCase())
            return opt ? opt.label : v
          }
        },
        { key: 'start_date', label: '开始日期', type: 'date', required: true },
        { key: 'end_date', label: '结束日期', type: 'date', required: true },
        { key: 'budget', label: '预算（万元）', type: 'number', required: true },
        { key: 'actual_cost', label: '实际成本（万元）', type: 'number' },
        { key: 'responsible_person', label: '负责人', required: true },
        { key: 'expected_result', label: '预期结果', type: 'number', required: true },
        { key: 'actual_result', label: '实际结果', type: 'number' },
        { key: 'progress', label: '进度（%）', type: 'number', required: false, disabled: true },
        { 
          key: 'status', 
          label: '状态', 
          type: 'custom', 
          disabled: true,
          render: (v, item) => renderStatusBadge(item?.progress, item?.end_date)
        },
        { key: 'description', label: '预期成果', type: 'textarea' },
        { key: 'remarks', label: '备注', type: 'textarea' }
      ],
      // 大事件提炼 - 与 MajorEvents.jsx 字段一致
      events: [
        { 
          key: 'year', 
          label: '年份', 
          type: 'select',
          options: years.map(y => ({ value: y, label: `${y}年` })),
          required: true
        },
        { key: 'event_name', label: '事件名称', required: true },
        { 
          key: 'event_type', 
          label: '事件类型', 
          type: 'select', 
          required: true,
          options: [
            { value: 'strategic', label: '战略性事件' },
            { value: 'operational', label: '运营性事件' },
            { value: 'risk', label: '风险性事件' },
            { value: 'opportunity', label: '机会性事件' }
          ],
          render: (v) => ({
            strategic: '战略性事件',
            operational: '运营性事件',
            risk: '风险性事件',
            opportunity: '机会性事件'
          })[String(v || '').toLowerCase()] || v 
        },
        { 
          key: 'importance', 
          label: '重要性', 
          type: 'select',
          options: [
            { value: 'critical', label: '非常重要' },
            { value: 'high', label: '重要' },
            { value: 'medium', label: '一般' },
            { value: 'low', label: '较低' }
          ],
          render: (v) => ({
            critical: '非常重要',
            high: '重要',
            medium: '一般',
            low: '较低'
          })[String(v || '').toLowerCase()] || v 
        },
        { key: 'planned_date', label: '计划日期', type: 'date' },
        { key: 'actual_date', label: '实际日期', type: 'date' },
        { 
          key: 'responsible_department', 
          label: '负责部门', 
          type: 'select', 
          required: true,
          options: departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name }))
        },
        { key: 'responsible_person', label: '负责人' },
        { key: 'budget', label: '预算（万元）', type: 'number' },
        { key: 'actual_cost', label: '实际成本（万元）', type: 'number' },
        { key: 'progress', label: '进度（%）', type: 'number', required: false, disabled: true },
        { 
          key: 'status', 
          label: '状态', 
          type: 'custom', 
          disabled: true,
          render: (v, item) => renderStatusBadge(item?.progress, item?.planned_date)
        },
        { key: 'description', label: '事件描述', type: 'textarea' },
        { key: 'key_points', label: '关键要点', type: 'textarea' },
        { key: 'success_criteria', label: '成功标准', type: 'textarea' },
        { key: 'risks', label: '风险因素', type: 'textarea' },
        { key: 'lessons_learned', label: '经验教训', type: 'textarea' }
      ],
      // 月度推进计划 - 与 MonthlyProgress.jsx 字段一致
      monthly: [
        { 
          key: 'year', 
          label: '年度', 
          type: 'select',
          options: years.map(y => ({ value: y, label: `${y}年` })),
          required: true
        },
        { 
          key: 'month', 
          label: '月份', 
          type: 'select', 
          required: true,
          options: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
        },
        { key: 'task_name', label: '任务名称', required: true },
        { 
          key: 'department', 
          label: '负责部门', 
          type: 'select', 
          required: true,
          options: departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name }))
        },
        { key: 'responsible_person', label: '负责人', required: true },
        { key: 'key_activities', label: '关键活动', type: 'textarea', required: true },
        { key: 'start_date', label: '开始日期', type: 'date' },
        { key: 'end_date', label: '结束日期', type: 'date' },
        { key: 'target_value', label: '目标值', type: 'number' },
        { key: 'actual_value', label: '实际值', type: 'number' },
        { key: 'completion_rate', label: '进度（%）', type: 'number', required: false, disabled: true },
        { 
          key: 'status', 
          label: '状态', 
          type: 'custom', 
          disabled: true,
          render: (v, item) => renderStatusBadge(item?.completion_rate, item?.end_date)
        },
        { key: 'achievements', label: '主要成果', type: 'textarea' },
        { key: 'challenges', label: '遇到的挑战', type: 'textarea' },
        { key: 'next_month_plan', label: '下月计划', type: 'textarea' },
        { key: 'support_needed', label: '需要支持', type: 'textarea' }
      ],
      // 5W2H行动计划 - 与 ActionPlans.jsx 字段一致
      action: [
        { 
          key: 'year', 
          label: '年份', 
          type: 'select',
          options: years.map(y => ({ value: y, label: `${y}年` })),
          required: true
        },
        { key: 'goal', label: '目标', type: 'textarea', required: true },
        { key: 'start_date', label: '开始日期', type: 'date', required: true },
        { key: 'end_date', label: '结束日期', type: 'date', required: true },
        { key: 'what', label: '事项', type: 'textarea', required: true },
        { key: 'who', label: '执行人/协同人', required: true },
        { key: 'how', label: '策略方法/执行步骤/行动方案', type: 'textarea', required: true },
        { key: 'why', label: '价值', type: 'textarea', required: true },
        { key: 'how_much', label: '投入预算/程度/数量', type: 'number', required: true },
        { 
          key: 'department', 
          label: '负责部门', 
          type: 'select', 
          required: true,
          options: departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name }))
        },
        { 
          key: 'priority', 
          label: '优先级', 
          type: 'select', 
          required: true,
          options: [
            { value: 'high', label: '高' },
            { value: 'medium', label: '中' },
            { value: 'low', label: '低' }
          ],
          render: (v) => ({
            high: '高',
            medium: '中',
            low: '低'
          })[String(v || '').toLowerCase()] || v 
        },
        { key: 'actual_result', label: '实际结果', type: 'number' },
        { key: 'progress', label: '进度（%）', type: 'number', required: false, disabled: true },
        { 
          key: 'status', 
          label: '状态', 
          type: 'custom', 
          required: false,
          disabled: true,
          render: (v, item) => renderStatusBadge(item?.progress, item?.end_date || item?.start_date)
        },
        { key: 'remarks', label: '备注', type: 'textarea' }
      ]
    }
    return columnsMap[currentSheet] || []
  }

  const addActionRow = () => {
    setActionPlans(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          id: Date.now(),
          goal: '',
          start_date: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`,
          end_date: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`,
          what: '',
          who: '',
          how: '',
          why: '',
          how_much: '',
          status: 'not_started',
          progress: 0,
          priority: 'medium'
        }
      ]
    }))
  }

  const deleteActionRow = (index) => {
    setActionPlans(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }))
  }

  const renderPlanningSheet = () => (
    <div id="planning-table" className="overflow-x-auto">
      {/* 年度规划表 - 现代化设计 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <FileText size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{`${companyName} ${selectedYear}年 年度规划表`}</h3>
            <p className="text-gray-600 text-sm">年度工作安排与资源分配计划</p>
          </div>
        </div>
        <div className={floatingButtonClass}>
          <div className="text-right mr-2">
            <div className="text-gray-500 text-sm">数据记录</div>
            <div className="text-blue-600 font-semibold">{planningData.data.length} 条规划</div>
          </div>
          
          {renderColumnVisibilityToggle('planning')}

          <button
            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 relative"
            onClick={() => setShowFilterOpen(prev => !prev)}
          >
            <Filter size={14} />
            <span>筛选</span>
            {getPlanningFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white">
                {getPlanningFilterCount()}
              </span>
            )}
          </button>
          <button
            className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-2 ${!(planningFilter.category || planningFilter.priority || planningFilter.status || planningFilter.department) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleResetPlanningFilter}
            title="重置筛选"
            disabled={!(planningFilter.category || planningFilter.priority || planningFilter.status || planningFilter.department)}
          >
            <RefreshCcw size={14} />
            <span>重置</span>
          </button>
          
          <button
            onClick={() => handleSave('planning')}
            className="btn-primary"
          >
            <Save size={18} />
            <span>保存</span>
          </button>
          <button
            onClick={cleanupPlanningDuplicates}
            className="btn-danger"
          >
            <Trash2 size={18} />
            <span>清理重复</span>
          </button>
        </div>
      </div>

      {showFilterOpen && (
        <div className="card p-6 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="planning-panel-category" className="block text-sm font-medium text-gray-700 mb-1">类别</label>
              <select id="planning-panel-category" name="category"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                value={planningFilter.category}
                onChange={(e) => setPlanningFilter(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">全部类别</option>
                <option value="strategic">战略性事件</option>
                <option value="operational">运营性事件</option>
                <option value="risk">风险性事件</option>
                <option value="opportunity">机会性事件</option>
                <option value="business">业务性事件</option>
                <option value="management">管理性事件</option>
                <option value="temporary">临时性事件</option>
              </select>
            </div>
            <div>
              <label htmlFor="planning-panel-priority" className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select id="planning-panel-priority" name="priority"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                value={planningFilter.priority}
                onChange={(e) => setPlanningFilter(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">全部优先级</option>
                <option value="critical">非常重要</option>
                <option value="high">重要</option>
                <option value="medium">一般</option>
                <option value="low">较低</option>
              </select>
            </div>
            <div>
              <label htmlFor="planning-panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select id="planning-panel-status" name="status"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 text-sm"
                value={planningFilter.status}
                onChange={(e) => setPlanningFilter(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">全部状态</option>
                <option value="planning">规划中</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div>
              <label htmlFor="planning-panel-department" className="block text-sm font-medium text-gray-700 mb-1">部门</label>
              <select id="planning-panel-department" name="department"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                value={planningFilter.department}
                onChange={(e) => setPlanningFilter(prev => ({ ...prev, department: e.target.value }))}
              >
                <option value="">全部部门</option>
                {departments.filter(d => !d.name.includes('公司')).map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {renderDynamicTable('planning', getFilteredPlanning(), planningErrors)}
    </div>
  )

  const renderEventsSheet = () => (
    <div id="events-table" className="overflow-x-auto">
      {/* 大事件提炼 - 与 MajorEvents.jsx 字段一致 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/30 relative">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-r from-purple-500/90 to-pink-600/90 rounded-2xl shadow-xl">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">大事件提炼</h3>
            <p className="text-sm text-gray-600 mt-1">制定和管理企业年度工作计划的具体落地实施方案</p>
          </div>
        </div>
        <div className={floatingButtonClass}>
          <span className="text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full border border-gray-200/30">
            共 {eventsData.events.length} 条记录
          </span>
          
          {renderColumnVisibilityToggle('events')}

          <button
            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 relative"
            onClick={() => setShowFilterOpen(prev => !prev)}
          >
            <Filter size={14} />
            <span>筛选</span>
            {getEventsFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white">
                {getEventsFilterCount()}
              </span>
            )}
          </button>
          <button
            className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-2 ${!(eventsFilter.event_type || eventsFilter.importance || eventsFilter.month || eventsFilter.responsible_department || eventsFilter.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleResetEventsFilter}
            title="重置筛选"
            disabled={!(eventsFilter.event_type || eventsFilter.importance || eventsFilter.month || eventsFilter.responsible_department || eventsFilter.status)}
          >
            <RefreshCcw size={14} />
            <span>重置</span>
          </button>
          
          <button
            onClick={() => handleSave('events')}
            className="btn-primary"
          >
            <Save className="w-5 h-5" />
            <span>保存</span>
          </button>
          <button
            onClick={cleanupEventsDuplicates}
            className="btn-danger"
          >
            <Trash2 className="w-5 h-5" />
            <span>清理重复</span>
          </button>
        </div>
        
      </div>

      {showFilterOpen && (
        <div className="card p-6 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="events-panel-type" className="block text-sm font-medium text-gray-700 mb-1">事件类型</label>
              <select id="events-panel-type" name="event_type"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                value={eventsFilter.event_type}
                onChange={(e) => setEventsFilter(prev => ({ ...prev, event_type: e.target.value }))}
              >
                <option value="">全部类型</option>
                <option value="strategic">战略性事件</option>
                <option value="operational">运营性事件</option>
                <option value="risk">风险性事件</option>
                <option value="opportunity">机会性事件</option>
              </select>
            </div>
            <div>
              <label htmlFor="events-panel-importance" className="block text-sm font-medium text-gray-700 mb-1">重要性</label>
              <select id="events-panel-importance" name="importance"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                value={eventsFilter.importance}
                onChange={(e) => setEventsFilter(prev => ({ ...prev, importance: e.target.value }))}
              >
                <option value="">全部重要性</option>
                <option value="critical">非常重要</option>
                <option value="high">重要</option>
                <option value="medium">一般</option>
                <option value="low">较低</option>
              </select>
            </div>
            <div>
              <label htmlFor="events-panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份</label>
              <select id="events-panel-month" name="month"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                value={eventsFilter.month}
                onChange={(e) => setEventsFilter(prev => ({ ...prev, month: e.target.value }))}
              >
                <option value="">全部月份</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="events-panel-department" className="block text-sm font-medium text-gray-700 mb-1">负责部门</label>
              <CustomSelect
                value={eventsFilter.responsible_department}
                onChange={(value) => setEventsFilter(prev => ({ ...prev, responsible_department: value }))}
                options={[
                  { value: '', label: '全部部门' },
                  ...departments.filter(d => !d.name.includes('公司')).map(dept => ({
                    value: dept.name,
                    label: dept.name
                  }))
                ]}
                className="focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="events-panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select id="events-panel-status" name="status"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 text-sm"
                value={eventsFilter.status}
                onChange={(e) => setEventsFilter(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">全部状态</option>
                <option value="planning">规划中</option>
                <option value="preparing">准备中</option>
                <option value="executing">执行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {renderDynamicTable('events', getFilteredEvents(), eventsErrors)}
      {/* 
      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl table-excel-borders table-compact min-w-[2000px]">
        <thead>
          <tr>
            <th className="px-4 py-2 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <FileText className="w-4 h-4 text-green-600" />
                <span>{head('事件名称')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Tag className="w-4 h-4 text-green-600" />
                <span>{head('事件类型')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Star className="w-4 h-4 text-yellow-600" />
                <span>{head('重要性')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <span>{head('计划日期')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>{head('实际日期')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{head('负责部门')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{head('负责人')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span>{head('预算（万元）')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span>{head('实际成本（万元）')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-gray-100/80 to-gray-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Flag className="w-4 h-4 text-gray-600" />
                <span>{head('状态')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>{head('进度')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-gray-100/80 to-gray-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <FileText className="w-4 h-4 text-gray-600" />
                <span>{head('事件描述')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Target className="w-4 h-4 text-yellow-600" />
                <span>{head('关键要点')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <CheckSquare className="w-4 h-4 text-yellow-600" />
                <span>{head('成功标准')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-red-100/80 to-red-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{head('风险因素')}</span>
              </div>
            </th>
            <th className="px-4 py-2 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>{head('经验教训')}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {getFilteredEvents().map(({ item, index }) => (
            <tr key={index} className={`group transition-all duration-300 border-b border-gray-100/50 ${eventsErrors[index] ? 'bg-red-50' : 'hover:bg-gradient-to-r hover:from-purple-50/80 hover:to-pink-50/80'}`}>
              <td className="px-4 py-2 font-semibold border-r border-gray-200/30 group-hover:bg-white/50 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="event_name"
                  value={item.event_name}
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="event_type"
                  value={item.event_type}
                  type="select"
                  options={[
                    { value: 'strategic', label: '战略性事件' },
                    { value: 'operational', label: '运营性事件' },
                    { value: 'risk', label: '风险性事件' },
                    { value: 'opportunity', label: '机会性事件' }
                  ]}
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="importance"
                  value={item.importance}
                  type="select"
                  options={[
                    { value: 'critical', label: '非常重要' },
                    { value: 'high', label: '重要' },
                    { value: 'medium', label: '一般' },
                    { value: 'low', label: '较低' }
                  ]}
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="planned_date"
                  value={item.planned_date}
                  type="date"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="actual_date"
                  value={item.actual_date}
                  type="date"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="responsible_department"
                  value={item.responsible_department}
                  type="select"
                  options={departments.filter(d => !d.name.includes('公司')).map(d => ({ value: d.name, label: d.name }))}
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="responsible_person"
                  value={item.responsible_person}
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="budget"
                  value={item.budget}
                  type="number"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="actual_cost"
                  value={item.actual_cost}
                  type="number"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="status"
                  value={item.status}
                  type="select"
                  options={[
                    { value: 'planning', label: '规划中' },
                    { value: 'preparing', label: '准备中' },
                    { value: 'executing', label: '执行中' },
                    { value: 'completed', label: '已完成' },
                    { value: 'cancelled', label: '已取消' }
                  ]}
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="progress"
                  value={item.progress}
                  type="number"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="description"
                  value={item.description}
                  type="textarea"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="key_points"
                  value={item.key_points}
                  type="textarea"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="success_criteria"
                  value={item.success_criteria}
                  type="textarea"
                />
              </td>
              <td className="px-4 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="risks"
                  value={item.risks}
                  type="textarea"
                />
              </td>
              <td className="px-4 py-2 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="lessons_learned"
                  value={item.lessons_learned}
                  type="textarea"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      */}
      {showExtractModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-[800px] bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">从年度规划表提炼</div>
              <button onClick={() => setShowExtractModal(false)} className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">关闭</button>
            </div>
            <div className="max-h-[420px] overflow-y-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">选择</th>
                    <th className="px-3 py-2 text-left">月份</th>
                    <th className="px-3 py-2 text-left">主题</th>
                    <th className="px-3 py-2 text-left">目标</th>
                    <th className="px-3 py-2 text-left">主要任务</th>
                  </tr>
                </thead>
                <tbody>
                  {planningData.data.map((p, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selectedExtractIndices.includes(idx)} onChange={() => toggleSelectExtract(idx)} />
                      </td>
                      <td className="px-3 py-2">{p.month}</td>
                      <td className="px-3 py-2">{p.theme}</td>
                      <td className="px-3 py-2">{p.goals}</td>
                      <td className="px-3 py-2">{p.tasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button onClick={confirmExtract} className="btn-primary">提炼到大事件</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderMonthlySheet = () => (
    <div id="monthly-table" className="overflow-x-auto">
      {/* 月度推进计划表 - 与 MonthlyProgress.jsx 字段一致 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/30">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-r from-yellow-500/90 to-orange-600/90 rounded-2xl shadow-xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">月度推进计划表</h3>
            <p className="text-sm text-gray-600 mt-1">月度目标分解与执行计划</p>
          </div>
        </div>
        <div className={floatingButtonClass}>
          <span className="text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full border border-gray-200/30">
            共 {monthlyPlans.plans.length} 条记录
          </span>
          
          {renderColumnVisibilityToggle('monthly')}

          <button
            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 relative"
            onClick={() => setShowFilterOpen(prev => !prev)}
          >
            <Filter size={14} />
            <span>筛选</span>
            {getMonthlyFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white">
                {getMonthlyFilterCount()}
              </span>
            )}
          </button>
          <button
            className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-2 ${!(monthlyFilter.month || monthlyFilter.department || monthlyFilter.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleResetMonthlyFilter}
            title="重置筛选"
            disabled={!(monthlyFilter.month || monthlyFilter.department || monthlyFilter.status)}
          >
            <RefreshCcw size={14} />
            <span>重置</span>
          </button>
          <button
            onClick={() => handleSave('monthly')}
            className="btn-primary"
          >
            <Save className="w-5 h-5" />
            <span>保存</span>
          </button>
          <button
            onClick={cleanupMonthlyDuplicates}
            className="btn-danger"
          >
            <Trash2 className="w-5 h-5" />
            <span>清理重复</span>
          </button>
        </div>
      </div>

      {showFilterOpen && (
        <div className="card p-6 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="monthly-panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份</label>
              <select id="monthly-panel-month" name="month"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                value={monthlyFilter.month}
                onChange={(e) => setMonthlyFilter(prev => ({ ...prev, month: e.target.value }))}
              >
                <option value="">全部月份</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="monthly-panel-department" className="block text-sm font-medium text-gray-700 mb-1">部门</label>
              <CustomSelect
                value={monthlyFilter.department}
                onChange={(value) => setMonthlyFilter(prev => ({ ...prev, department: value }))}
                options={[
                  { value: '', label: '全部部门' },
                  ...departments.filter(d => !d.name.includes('公司')).map(dept => ({
                    value: dept.name,
                    label: dept.name
                  }))
                ]}
                className="focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="monthly-panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select id="monthly-panel-status" name="status"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 text-sm"
                value={monthlyFilter.status}
                onChange={(e) => setMonthlyFilter(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">全部状态</option>
                <option value="ahead">超前</option>
                <option value="on_track">正常</option>
                <option value="delayed">延迟</option>
                <option value="at_risk">风险</option>
                <option value="not_started">未开始</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {renderDynamicTable('monthly', getFilteredMonthly(), monthlyErrors)}
      {/*
      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl table-excel-borders table-compact min-w-[2400px]">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-gradient-to-r from-blue-100/80 to-blue-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{head('月份')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100/80 to-green-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Target className="w-4 h-4 text-green-600" />
                <span>{head('任务名称')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100/80 to-green-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Users className="w-4 h-4 text-green-600" />
                <span>{head('负责部门')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Users className="w-4 h-4 text-yellow-600" />
                <span>{head('负责人')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Target className="w-4 h-4 text-yellow-600" />
                <span>{head('目标值')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100/80 to-purple-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>{head('实际值')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100/80 to-purple-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>{head('完成率')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-red-100/80 to-red-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Flag className="w-4 h-4 text-red-600" />
                <span>{head('状态')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <span>{head('开始日期')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <span>{head('结束日期')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-red-100/80 to-red-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <List className="w-4 h-4 text-red-600" />
                <span>{head('关键活动')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-red-100/80 to-red-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <CheckSquare className="w-4 h-4 text-red-600" />
                <span>{head('主要成果')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-red-100/80 to-red-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{head('遇到的挑战')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-red-100/80 to-red-200/80 text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <FileText className="w-4 h-4 text-red-600" />
                <span>{head('下月计划')}</span>
              </div>
            </th>
            <th className="px-4 py-3 bg-gradient-to-r from-red-100/80 to-red-200/80 text-sm font-semibold text-gray-800 text-center">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Flag className="w-4 h-4 text-red-600" />
                <span>{head('需要支持')}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {getFilteredMonthly().map(({ item, index }) => (
            <tr key={index} className="group border-b border-gray-200/30 hover:bg-gradient-to-r from-yellow-50/50 to-orange-50/50 transition-all duration-300 hover:shadow-md">
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center px-3 h-7 rounded-full bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mr-1 ring-2 ring-white shadow-md">
                      {item.month}
                    </div>
                    <span className="text-xs font-medium text-gray-700">月</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="task_name" value={item.task_name} type="textarea" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="department" value={item.department} type="select" options={departments.filter(d => !d.name.includes('公司')).map(d => ({ value: d.name, label: d.name }))} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="responsible_person" value={item.responsible_person} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="target_value" value={item.target_value} type="number" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="actual_value" value={item.actual_value} type="number" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  (item.actual_value && item.target_value && (item.actual_value / item.target_value * 100) >= 100) ? 'bg-green-100 text-green-800' :
                  (item.actual_value && item.target_value && (item.actual_value / item.target_value * 100) >= 80) ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {item.actual_value && item.target_value ? `${(item.actual_value / item.target_value * 100).toFixed(1)}%` : '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="status" value={item.status} type="select" options={[
                  { value: 'on_track', label: '按计划进行' },
                  { value: 'delayed', label: '延期' },
                  { value: 'ahead', label: '提前完成' },
                  { value: 'at_risk', label: '有风险' }
                ]} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="start_date" value={item.start_date} type="date" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="end_date" value={item.end_date} type="date" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="key_activities" value={item.key_activities} type="textarea" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="achievements" value={item.achievements} type="textarea" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="challenges" value={item.challenges} type="textarea" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200/30">
                <EditableCell sheet="monthly" index={index} field="next_month_plan" value={item.next_month_plan} type="textarea" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <EditableCell sheet="monthly" index={index} field="support_needed" value={item.support_needed} type="textarea" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      */}
    </div>
  )

  const renderActionSheet = () => {
    const floatingButtonClass = "flex flex-wrap items-center gap-2"
    return (
    <div id="action-table" className="overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
            <Target size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">5W2H行动计划表</h3>
            <p className="text-gray-600 text-sm">运用5W2H方法制定具体行动计划，确保目标达成</p>
          </div>
        </div>
        <div className={floatingButtonClass}>
          <span className="text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full border border-gray-200/30 mr-2">
            共 {actionPlans.actions.length} 条记录
          </span>
          
          {renderColumnVisibilityToggle('action')}

          <button
            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 relative"
            onClick={() => setShowFilterOpen(prev => !prev)}
          >
            <Filter size={14} />
            <span>筛选</span>
            {getActionFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white">
                {getActionFilterCount()}
              </span>
            )}
          </button>
          <button
            className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-2 ${!(actionFilter.month || actionFilter.department || actionFilter.priority || actionFilter.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleResetActionFilter}
            title="重置筛选"
            disabled={!(actionFilter.month || actionFilter.department || actionFilter.priority || actionFilter.status)}
          >
            <RefreshCcw size={14} />
            <span>重置</span>
          </button>
          <button
            onClick={addActionRow}
            className="btn-primary"
          >
            <Plus size={18} />
            <span>新增计划</span>
          </button>
          <button
            onClick={() => handleSave('action')}
            className="btn-primary"
          >
            <Save size={18} />
            <span>保存</span>
          </button>
          <button
            onClick={cleanupActionDuplicates}
            className="btn-danger"
          >
            <Trash2 size={18} />
            <span>清理重复</span>
          </button>
        </div>
      </div>

      {showFilterOpen && (
        <div className="card p-6 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="action-panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份</label>
              <CustomSelect
                id="action-panel-month"
                value={actionFilter.month}
                onChange={(value) => setActionFilter(prev => ({ ...prev, month: value }))}
                placeholder="全部月份"
                options={[
                  { value: '', label: '全部月份' },
                  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}月` }))
                ]}
                className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label htmlFor="action-panel-department" className="block text-sm font-medium text-gray-700 mb-1">负责部门</label>
              <CustomSelect
                id="action-panel-department"
                value={actionFilter.department}
                onChange={(value) => setActionFilter(prev => ({ ...prev, department: value }))}
                placeholder="全部部门"
                options={[
                  { value: '', label: '全部部门' },
                  ...departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name }))
                ]}
                className="focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="action-panel-priority" className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <CustomSelect
                id="action-panel-priority"
                value={actionFilter.priority}
                onChange={(value) => setActionFilter(prev => ({ ...prev, priority: value }))}
                placeholder="全部优先级"
                options={[
                  { value: '', label: '全部优先级' },
                  { value: 'high', label: '高' },
                  { value: 'medium', label: '中' },
                  { value: 'low', label: '低' }
                ]}
                className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label htmlFor="action-panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <CustomSelect
                id="action-panel-status"
                value={actionFilter.status}
                onChange={(value) => setActionFilter(prev => ({ ...prev, status: value }))}
                placeholder="全部状态"
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'completed', label: '已完成' },
                  { value: 'in_progress', label: '进行中' },
                  { value: 'delayed', label: '延迟' },
                  { value: 'not_started', label: '未开始' }
                ]}
                className="focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      )}

      {renderDynamicTable('action', getFilteredActions(), actionErrors)}
      {/*
      <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg table-excel-borders min-w-[1800px]">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">目标<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-yellow-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">开始日期<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-yellow-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">结束日期<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">事项<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">执行人/协同人<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">策略方法/执行步骤/行动方案<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">价值<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">投入预算/程度/数量<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-indigo-100 to-indigo-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">部门<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-orange-100 to-orange-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">优先级<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">状态</th>
            <th className="px-4 py-3 bg-gradient-to-r from-teal-100 to-teal-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">进度（%）</th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">实际结果</th>
            <th className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">备注</th>
            <th className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap no-print">操作</th>
          </tr>
        </thead>
        <tbody>
          {getFilteredActions().map(({ item, index }) => (
            <tr key={index} className={`transition-all duration-200 border-b border-gray-100 ${actionErrors[index] ? 'bg-red-50' : 'hover:bg-gradient-to-r from-blue-50/50 to-indigo-50/50'}`}>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="goal"
                  value={item.goal}
                  type="textarea"
                  error={actionErrors[index]?.goal}
                />
                {actionErrors[index]?.goal && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].goal}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="start_date"
                  value={item.start_date}
                  type="date"
                  error={actionErrors[index]?.start_date}
                />
                {actionErrors[index]?.start_date && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].start_date}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="end_date"
                  value={item.end_date}
                  type="date"
                  error={actionErrors[index]?.end_date}
                />
                {actionErrors[index]?.end_date && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].end_date}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="what"
                  value={item.what}
                  type="textarea"
                  error={actionErrors[index]?.what}
                />
                {actionErrors[index]?.what && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].what}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="who"
                  value={item.who}
                  error={actionErrors[index]?.who}
                />
                {actionErrors[index]?.who && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].who}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="how"
                  value={item.how}
                  type="textarea"
                  error={actionErrors[index]?.how}
                />
                {actionErrors[index]?.how && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].how}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="why"
                  value={item.why}
                  type="textarea"
                  error={actionErrors[index]?.why}
                />
                {actionErrors[index]?.why && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].why}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="how_much"
                  value={item.how_much}
                  error={actionErrors[index]?.how_much}
                />
                {actionErrors[index]?.how_much && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].how_much}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="department"
                  value={item.department}
                  type="select"
                  options={departments.filter(d => !d.name.includes('公司')).map(d => d.name)}
                  error={actionErrors[index]?.department}
                />
                {actionErrors[index]?.department && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].department}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="priority"
                  value={item.priority}
                  type="select"
                  options={[{ value: 'high', label: '高' }, { value: 'medium', label: '中' }, { value: 'low', label: '低' }]}
                  error={actionErrors[index]?.priority}
                />
                {actionErrors[index]?.priority && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].priority}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="status"
                  value={item.status}
                  type="select"
                  options={[
                    { value: 'not_started', label: '未开始' },
                    { value: 'in_progress', label: '进行中' },
                    { value: 'completed', label: '已完成' },
                    { value: 'delayed', label: '延期' }
                  ]}
                  error={actionErrors[index]?.status}
                />
                {actionErrors[index]?.status && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].status}</span>}
              </td>
              <td className="px-3 py-1 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="progress"
                  value={item.progress}
                  type="number"
                  error={actionErrors[index]?.progress}
                />
                {actionErrors[index]?.progress && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].progress}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="actual_result"
                  value={item.actual_result}
                  type="number"
                  error={actionErrors[index]?.actual_result}
                />
                {actionErrors[index]?.actual_result && <span className="text-red-500 text-xs mt-1 block">{actionErrors[index].actual_result}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="remarks"
                  value={item.remarks}
                  type="textarea"
                />
              </td>
              <td className="px-6 py-3 border border-gray-200 no-print">
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => deleteActionRow(index)}
                    className="p-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full hover:from-red-600 hover:to-pink-700 shadow-sm hover:shadow-md transition-all duration-200"
                    title="删除"
                    aria-label="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      */}
    </div>
  )
}

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <PageHeaderBanner
        title="年度规划表"
        subTitle={`年度工作落地规划（泉州太禾服饰有限公司·${selectedYear}年）`}
        year={selectedYear}
        onYearChange={(y) => { setYearChangeByUser(true); setGlobalYear(y) }}
        years={years}
        compact
        className="min-h-[72px]"
        right={(
          <div className="flex space-x-3 items-center">
            <button
              onClick={() => setShowYearModal(true)}
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
      <div className="flex-1 px-6 py-6">


        {/* 标签页 - 现代化设计 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 mb-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Layers size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">数据表格</h3>
                <p className="text-gray-600 text-sm">选择要查看和编辑的表格类型</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              当前选择: {sheets.find(s => s.key === currentSheet)?.label}
            </div>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap flex-nowrap">
            <nav className="flex space-x-4">
              {sheets.map((sheet) => {
                const Icon = sheet.icon
                const isActive = currentSheet === sheet.key
                return (
                  <button
                    key={sheet.key}
                    onClick={() => setCurrentSheet(sheet.key)}
                    className={`py-3 px-6 rounded-xl font-medium text-sm flex items-center space-x-3 transition-all duration-300 transform ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                        : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-gray-800 border border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{sheet.label}</span>
                  </button>
                )
              })}
            </nav>
            <div className="flex items-center gap-3 relative">
              <button
                onClick={() => handleExport(currentSheet)}
                className={`px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl hover:from-green-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 flex-shrink-0 ${getCurrentSheetData().length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="导出Excel"
                aria-label="导出Excel"
                disabled={getCurrentSheetData().length === 0}
              >
                <Download size={18} />
                <span>导出Excel</span>
              </button>
              <button
                onClick={() => setShowPrintPreview(true)}
                className={`px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 flex-shrink-0 ${getCurrentSheetData().length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="导出PDF"
                aria-label="导出PDF"
                disabled={getCurrentSheetData().length === 0}
              >
                <FileText size={18} />
                <span>导出PDF</span>
              </button>
              <label htmlFor="import-events-annual" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg flex items-center space-x-2 relative z-50 pointer-events-auto flex-shrink-0 cursor-pointer" title="导入Excel" aria-label="导入Excel">
                <Upload size={18} />
                <span>导入Excel</span>
                <input id="import-events-annual" name="import-events-annual" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportEvents(e.target.files[0])} />
              </label>

              <button
                onClick={handleNotifyStatus}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 flex-shrink-0"
                title="通知"
                aria-label="通知"
              >
                <AlertTriangle size={18} />
                <span>通知</span>
              </button>

            </div>
          </div>
        </div>

        {/* 提示信息 - 现代化设计 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
              <Calculator size={20} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-blue-800 font-medium">操作提示</p>
              <p className="text-blue-600 text-sm">点击表格单元格可直接编辑数据，支持多行文本输入</p>
            </div>
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-200"></div>
            </div>
          </div>
        </div>

        {/* 表格内容 */}
        <div className="space-y-6">
          {currentSheet === 'planning' && renderPlanningSheet()}
          {currentSheet === 'events' && renderEventsSheet()}
          {currentSheet === 'monthly' && renderMonthlySheet()}
          {currentSheet === 'action' && renderActionSheet()}
        </div>
      </div>

      {/* 打印预览组件 */}
      {showPrintPreview && (
        <PrintPreview
          isOpen={showPrintPreview}
          title={
            `${sheets.find(s => s.key === currentSheet)?.label} (${selectedYear}年)`
          }
          data={getCurrentSheetData()}
          columns={getCurrentSheetColumns()}
          filename={
            currentSheet === 'planning'
              ? `泉州太禾服饰有限公司_年度规划表_${selectedYear}`
              : `${sheets.find(s => s.key === currentSheet)?.label}_${selectedYear}`
          }
          contentId={`${currentSheet}-table`}
          onClose={() => setShowPrintPreview(false)}
          pageType={
            currentSheet === 'planning' ? 'annualPlanning' :
            currentSheet === 'events' ? 'majorEvents' :
            currentSheet === 'monthly' ? 'monthlyProgress' :
            currentSheet === 'action' ? 'actionPlans' : 'default'
          }
          year={selectedYear}
        />
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
                      if (years.includes(n)) { setYearError('年份已存在'); setSelectedYear(n); return }
                      const next = [...years, n].sort((a,b)=>a-b)
                      setYears(next); persistYears(next); setSelectedYear(n)
                      setNewYear(''); setYearError('')
                      toast.success('已添加年份')
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
                        : <button className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => setSelectedYear(y)}>设为当前</button>}
                      <button
                        onClick={() => {
                          const next = years.filter(v=>v!==y)
                          const fallback = next[next.length-1] || new Date().getFullYear()
                          if (next.length === 0) { setYears([fallback]); persistYears([fallback]) }
                          else { setYears(next); persistYears(next) }
                          if (selectedYear===y) { setSelectedYear(fallback) }
                          toast.success('已删除年份')
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

    </div>
  )
}

export default AnnualPlanning
