import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { Plus, Edit, Trash2, Save, X, Download, Printer, Calculator, FileText, Layers, Calendar, Target, List, Package, Clock, User, MessageSquare, AlertTriangle, Tag, Star, AlignLeft, TrendingUp, BookOpen, CheckSquare, Flag, Users, BarChart3, Upload, Filter, RotateCcw } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import { exportToExcel, exportToPDF } from '../utils/export'
import * as XLSX from 'xlsx'
import PrintPreview from '../components/PrintPreview'
import toast from 'react-hot-toast'
import FormField from '../components/FormField'
import InlineAlert from '../components/InlineAlert'
import { computeActionPlanStatus, normalizeProgress } from '../utils/status'

const AnnualPlanning = () => {
  const navigate = useNavigate()
  const { getAnnualPlans, addAnnualPlan, updateAnnualPlan, deleteAnnualPlan, getSystemSettings, addSystemSetting, updateSystemSetting, getMajorEvents, addMajorEvent, updateMajorEvent, deleteMajorEvent, getMonthlyProgress, addMonthlyProgress, updateMonthlyProgress, deleteMonthlyProgress, getActionPlans, addActionPlan, updateActionPlan, deleteActionPlan, getDepartments, getCompanyInfo } = useData()
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [editingCell, setEditingCell] = useState({ row: null, col: null, sheet: null })
  const [currentSheet, setCurrentSheet] = useState('planning')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
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
    year: new Date().getFullYear(),
    title: '年度规划表',
    data: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      theme: ['规划导航月', '招聘月', '人才引备战月', '产品月', '产品月', '年中总结月', 
              '学习月', '备战月', '抢战月', '丰收月', '冲刺月', '总结月'][i],
      goals: '',
      tasks: '',
      resources: '',
      timeline: '',
      responsible: '',
      notes: ''
    }))
  })

  // 年度工作落地规划数据
  const [eventsData, setEventsData] = useState({
    year: new Date().getFullYear(),
    title: '大事件提炼',
    events: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      event_name: '',
      event_type: '',
      importance: '高', // '高', '中', '低'
      description: '',
      impact: '',
      lessons: ''
    }))
  })

  // 月度推进计划
  const [monthlyPlans, setMonthlyPlans] = useState({
    year: new Date().getFullYear(),
    title: '月度推进计划表',
    plans: Array.from({length: 12}, (_, i) => ({
      month: i + 1,
      objectives: '',
      key_tasks: '',
      deliverables: '',
      milestones: '',
      resources_needed: '',
      risks: '',
      success_metrics: ''
    }))
  })

  // 5W2H行动计划
  const [actionPlans, setActionPlans] = useState({
    year: new Date().getFullYear(),
    title: '5W2H行动计划表',
    actions: []
  })
  const [actionErrors, setActionErrors] = useState({})
  const [eventsErrors, setEventsErrors] = useState({})
  const [planningErrors, setPlanningErrors] = useState({})
  const [eventsFilter, setEventsFilter] = useState({ event_type: '', importance: '' })
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [selectedExtractIndices, setSelectedExtractIndices] = useState([])
  const [showFilterOpen, setShowFilterOpen] = useState(false)
  const importInputRef = useRef(null)

  const [departments, setDepartments] = useState([])

  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const floatingButtonClass = isScrolled
    ? "fixed top-24 right-8 z-50 flex items-center space-x-3 bg-white/90 backdrop-blur-md shadow-2xl p-2 rounded-2xl border border-indigo-100 transition-all duration-500 animate-in fade-in slide-in-from-top-4"
    : "flex items-center space-x-3 transition-all duration-300"

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
      const requiredFields = ['goal','when','what','who','how','why','how_much','department','priority','status','progress','expected_result','actual_result']
      const nextErrors = {}
      dataToSave.actions.forEach((item, idx) => {
        const rowErrors = {}
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
      const requiredFields = ['month','theme','goals','tasks','resources','timeline','responsible']
      const nextErrors = {}
      // 仅校验有填写内容的行；若整表无任何内容则不拦截
      const hasAnyRow = dataToSave.data.some(it => {
        const keys = ['theme','goals','tasks','resources','timeline','responsible','notes']
        return keys.some(k => (it[k] || '').toString().trim())
      })
      dataToSave.data.forEach((item, idx) => {
        const rowErrors = {}
        const rowHasData = ['goals','tasks','resources','timeline','responsible','notes'].some(k => (item[k] || '').toString().trim())
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
      const requiredFields = ['event_name','event_type','importance','description','impact','lessons']
      const nextErrors = {}
      const hasAnyRow = dataToSave.events.some(it => {
        const keys = ['event_name','event_type','importance','description','impact','lessons']
        return keys.some(k => (it[k] || '').toString().trim())
      })
      dataToSave.events.forEach((item, idx) => {
        const rowErrors = {}
        const rowHasData = ['event_name','event_type','description','impact','lessons'].some(k => (item[k] || '').toString().trim())
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
      const requiredFields = ['task_name','department','responsible_person','status']
      const hasAnyRow = dataToSave.plans.some(it => {
        const keys = ['task_name','objectives','department','responsible_person','target_value','actual_value','completion_rate','status','start_date','end_date']
        return keys.some(k => (it[k] || '').toString().trim())
      })
      if (!hasAnyRow) return true
      const nextErrors = {}
      dataToSave.plans.forEach((item, idx) => {
        const rowHasData = ['task_name','objectives','department','responsible_person','target_value','actual_value','completion_rate','status','start_date','end_date'].some(k => (item[k] || '').toString().trim())
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

  const head = (s) => {
    const t = String(s || '')
    return t.length > 5 ? `${t.slice(0,5)}...` : t
  }

  

  useEffect(() => {
    loadData()
  }, [selectedYear])

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      if (d.room === 'actionPlans') {
        if (!d.year || d.year === selectedYear) {
          loadData()
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => window.removeEventListener('dataUpdated', handler)
  }, [selectedYear])

  useEffect(() => {
    if (selectedYear !== 2025) {
      setYearChangeByUser(true)
      setSelectedYear(2025)
    }
  }, [])

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
            setSelectedYear(y)
            setCurrentYearSettingId(currentFound.id)
          }
        }
      } catch (e) {}
    }
    loadYears()
  }, [])

  useEffect(() => {
    (async () => {
      const result = await getCompanyInfo()
      if (result && result.success) {
        setCompanyName(result.data?.name || '泉州太禾服饰有限公司')
      }
    })()
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

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      const room = d.room || ''
      if (room === 'annualWorkPlans') {
        if (!d.year || d.year === selectedYear) {
          loadData()
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => window.removeEventListener('dataUpdated', handler)
  }, [selectedYear])

  const loadData = async () => {
    try {
      // 从数据库加载所有类型的数据
      const [planningResult, eventsResult, monthlyResult, actionResult, deptResult] = await Promise.all([
        getAnnualPlans({ sheet_type: 'planning', year: selectedYear }),
        getMajorEvents({ year: selectedYear }),
        getMonthlyProgress({ year: selectedYear }),
        getActionPlans({ year: selectedYear }),
        getDepartments()
      ])

      if (planningResult.success && planningResult.data) {
        const loaded = Array.isArray(planningResult.data) ? planningResult.data : []
        const themes = ['规划导航月', '招聘月', '人才引备战月', '产品月', '产品月', '年中总结月', '学习月', '备战月', '抢战月', '丰收月', '冲刺月', '总结月']
        const normalizedPlanning = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const found = loaded.find(e => Number(e?.month) === m)
          return found ? { ...found, month: m, theme: found.theme || themes[i] } : {
            month: m,
            theme: themes[i],
            goals: '',
            tasks: '',
            resources: '',
            timeline: '',
            responsible: '',
            notes: ''
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
          if (!v) return '高'
          const map = { critical: '高', high: '高', medium: '中', low: '低' }
          return map[v] || v
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
          const found = loadedEvents.find(e => getMonth(e) === m)
          if (found) {
            return {
              id: found.id,
              month: m,
              event_name: found.event_name || '',
              event_type: found.event_type || '',
              importance: toCnImportance(found.importance),
              description: found.description || '',
              impact: (found.actual_cost ?? found.budget ?? '') || '',
              lessons: found.lessons_learned || ''
            }
          }
          return { month: m, event_name: '', event_type: '', importance: '高', description: '', impact: '', lessons: '' }
        })
        setEventsData(prev => ({ ...prev, year: selectedYear, events: normalized }))
      }

      if (monthlyResult.success && monthlyResult.data) {
        const loadedMonthly = Array.isArray(monthlyResult.data) ? monthlyResult.data : []
        const normalizedMonthly = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const found = loadedMonthly.find(e => Number(e?.month) === m)
          return found ? { ...found, month: m } : { month: m }
        })
        setMonthlyPlans(prev => ({ ...prev, year: selectedYear, plans: normalizedMonthly }))
      }

      if (actionResult.success && actionResult.data) {
        setActionPlans(prev => ({
          ...prev,
          year: selectedYear,
          actions: Array.isArray(actionResult.data) ? actionResult.data : []
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
        const requiredFields = ['goal','when','what','who','how','why','how_much','department','priority','status','progress','expected_result','actual_result']
        const nextErrors = {}
        dataToSave.actions.forEach((item, idx) => {
          const rowErrors = {}
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
        if (sheet === 'planning') return ['goals','tasks','resources','timeline','responsible','notes'].some(k => (item[k] || '').toString().trim())
        if (sheet === 'events') return ['event_name','event_type','description','impact','lessons'].some(k => (item[k] || '').toString().trim())
        if (sheet === 'monthly') return ['task_name','objectives','department','responsible_person','target_value','actual_value','completion_rate','status','start_date','end_date'].some(k => (item[k] || '').toString().trim())
        return true
      }
      const dataArray = (Array.isArray(dataArrayAll) ? dataArrayAll : []).filter(it => rowHasData(sheet, it))

      // 批量保存数据到数据库
      const savePromises = dataArray.map(async (item) => {
        if (sheet === 'events') {
          const toEnImportance = (v) => {
            const map = { '高': 'high', '中': 'medium', '低': 'low' }
            return map[v] || v || 'high'
          }
          const payload = {
            year: dataToSave.year,
            event_name: item.event_name || '',
            event_type: item.event_type || '',
            importance: toEnImportance(item.importance),
            planned_date: `${dataToSave.year}-${String(item.month || 1).padStart(2,'0')}-01`,
            description: item.description || '',
            budget: item.impact || null,
            lessons_learned: item.lessons || ''
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
            department: item.department || '',
            task_name: item.task_name || item.objectives || '',
            target_value: item.target_value || null,
            actual_value: item.actual_value || null,
            completion_rate: item.completion_rate || item.success_metrics || '',
            status: item.status || '',
            start_date: item.start_date || '',
            end_date: item.end_date || '',
            responsible_person: item.responsible_person || ''
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
            when: item.when || '',
            how: item.how || '',
            how_much: item.how_much || null,
            department: item.department || '',
            priority: item.priority || '',
            progress: normalizeProgress(item.progress || 0),
            status: computeActionPlanStatus(normalizeProgress(item.progress || 0), item.when || ''),
            expected_result: item.expected_result || '',
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
          const payload = { ...item, sheet_type: sheet, year: dataToSave.year }
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
        const key = `${(item.what || '').trim()}-${(item.when || '').trim()}`
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
          const key = `${(item.what || '').trim()}-${(item.when || '').trim()}`
          const firstIdx = prev.actions.findIndex(a => `${(a.what || '').trim()}-${(a.when || '').trim()}` === key)
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

  const handleCellEdit = (sheet, index, field, value) => {
    const setters = {
      planning: setPlanningData,
      events: setEventsData,
      monthly: setMonthlyPlans,
      action: setActionPlans
    }

    const setter = setters[sheet]
    if (!setter) return

    setter(prev => {
      const newData = { ...prev }
      const arrayKey = {
        planning: 'data',
        events: 'events',
        monthly: 'plans',
        action: 'actions'
      }[sheet]

      if (newData[arrayKey] && newData[arrayKey][index]) {
        const currentRow = { ...newData[arrayKey][index] }
        let nextValue = value
        if (sheet === 'action' && field === 'progress') nextValue = normalizeProgress(value)
        const updatedRow = { ...currentRow, [field]: nextValue }
        if (sheet === 'action' && (field === 'progress' || field === 'when')) {
          const p = normalizeProgress(updatedRow.progress)
          const s = computeActionPlanStatus(p, updatedRow.when)
          newData[arrayKey][index] = { ...updatedRow, progress: p, status: s }
        } else {
          newData[arrayKey][index] = updatedRow
        }
      }
      return newData
    })

    if (sheet === 'action') {
      setActionErrors(prev => {
        const next = { ...prev }
        if (next[index]) {
          const row = { ...next[index] }
          delete row[field]
          if (!Object.keys(row).length) delete next[index]
          else next[index] = row
        }
        return next
      })
    }
    if (sheet === 'planning') {
      setPlanningErrors(prev => {
        const next = { ...prev }
        if (next[index]) {
          const row = { ...next[index] }
          delete row[field]
          if (!Object.keys(row).length) delete next[index]
          else next[index] = row
        }
        return next
      })
    }

    setEditingCell({ row: null, col: null, sheet: null })
    toast.success('数据已更新')
  }

  const EditableCell = ({ sheet, index, field, value, type = 'text', options = [] }) => {
    const cellKey = `${sheet}-${index}-${field}`
    const isEditing = editingCell.row === index && 
                     editingCell.col === field && 
                     editingCell.sheet === sheet
    
    if (isEditing) {
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
            className="w-full border-0 bg-yellow-100 text-sm p-1 resize-none"
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
            className="w-full border-0 bg-yellow-100 text-center text-sm p-2"
          >
            {options.map(opt => {
              const o = typeof opt === 'string' ? { value: opt, label: opt } : opt
              return (
                <option key={`${field}-${o.value}`} value={o.value}>{o.label}</option>
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
          className="w-full border-0 bg-yellow-100 text-center text-sm p-1"
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
        const txt = value==='high'?'高':value==='medium'?'中':value==='low'?'低':(value||'')
        const cls = value==='high'?'bg-red-100 text-red-800':value==='medium'?'bg-yellow-100 text-yellow-800':value==='low'?'bg-green-100 text-green-800':''
        return cls ? (<span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{txt}</span>) : txt
      }
      if (field === 'status') {
        const txt = value==='completed'?'已完成':value==='in_progress'?'进行中':value==='delayed'?'延期':value==='not_started'?'未开始':(value||'')
        const cls = value==='completed'?'bg-green-100 text-green-800':value==='in_progress'?'bg-blue-100 text-blue-800':value==='delayed'?'bg-red-100 text-red-800':value==='not_started'?'bg-gray-100 text-gray-800':''
        return cls ? (<span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{txt}</span>) : txt
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

    const actionEllipsisFields = ['goal','when','what','who','how','why','how_much','department','priority','status','progress','expected_result','actual_result','remarks']
    const monthlyEllipsisFields = ['task_name','department','responsible_person','target_value','actual_value','completion_rate','objectives','key_tasks','deliverables','milestones','resources_needed','risks','success_metrics']
    const planningEllipsisFields = ['theme','goals','tasks','resources','timeline','responsible','notes']
    const eventsEllipsisFields = ['event_name','event_type','importance','description','impact','lessons']
    const useEllipsis = (sheet === 'action' && actionEllipsisFields.includes(field)) || (sheet === 'monthly' && monthlyEllipsisFields.includes(field)) || (sheet === 'planning' && planningEllipsisFields.includes(field)) || (sheet === 'events' && eventsEllipsisFields.includes(field))
    const cellClass = useEllipsis ? 'text-ellipsis cell-limit' : 'text-break whitespace-pre-wrap leading-relaxed'
    const content = renderValue()
    const display = (useEllipsis && typeof content === 'string')
      ? (content.length > 3 ? `${content.slice(0,3)}...` : content)
      : content

    return (
      <div
        onClick={() => setEditingCell({ row: index, col: field, sheet })}
        className={`cursor-pointer hover:bg-blue-50 ${sheet==='action' ? 'p-1 min-h-8' : sheet==='events' ? 'p-1 min-h-8' : 'p-2 min-h-12'} flex items-center justify-start text-left`}
        title={typeof content === 'string' ? content : '点击编辑'}
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
    
    const data = dataMap[sheet]
    if (!data || data.length === 0) {
      toast.error('没有数据可以导出')
      return
    }
    
    try {
      const name = sheet === 'planning' 
        ? `${companyName} ${selectedYear}年 年度规划表`
        : `${sheets.find(s => s.key === sheet)?.label}_${selectedYear}`
      exportToExcel(data, name)
      toast.success('导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败: ' + error.message)
    }
  }

  const handleExportPDF = (sheet) => {
    const name = sheet === 'planning' 
      ? `${companyName} ${selectedYear}年 年度规划表`
      : `${sheets.find(s => s.key === sheet)?.label}_${selectedYear}`
    exportToPDF(`${sheet}-table`, name)
  }

  const getFilteredEvents = () => {
    const list = eventsData.events.map((item, idx) => ({ item, index: idx }))
    return list.filter(({ item }) => {
      const typeOk = !eventsFilter.event_type || (item.event_type || '').includes(eventsFilter.event_type)
      const impOk = !eventsFilter.importance || (item.importance || '') === eventsFilter.importance
      return typeOk && impOk
    })
  }

  const handleResetEventsFilter = async () => {
    try {
      setEventsFilter({ event_type: '', importance: '' })
      setShowFilterOpen(false)
      await loadData()
      toast.success('已重置筛选')
    } catch (e) {}
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
          importance: (r['重要程度'] ?? r['importance'] ?? r.importance ?? '中').toString().trim(),
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

  // 获取当前表格的列定义（与实际数据结构一致）
  const getCurrentSheetColumns = () => {
    const columnsMap = {
      planning: [
        { key: 'month', label: '月份' },
        { key: 'theme', label: '主题' },
        { key: 'goals', label: '目标' },
        { key: 'tasks', label: '主要任务' },
        { key: 'resources', label: '资源需求' },
        { key: 'timeline', label: '时间安排' },
        { key: 'responsible', label: '负责人' },
        { key: 'notes', label: '备注' }
      ],
      events: [
        { key: 'month', label: '月份' },
        { key: 'event_name', label: '事件名称' },
        { key: 'event_type', label: '事件类型', render: (v) => ({
          strategic: '战略性事件',
          strateg: '战略性事件',
          operational: '运营性事件',
          operation: '运营性事件',
          risk: '风险性事件',
          opportunity: '机会性事件',
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
          summary: '总结'
        })[String(v || '').toLowerCase()] || v },
        { key: 'importance', label: '重要程度' },
        { key: 'description', label: '事件描述' },
        { key: 'impact', label: '影响分析' },
        { key: 'lessons', label: '经验教训' }
      ],
      monthly: [
        { key: 'month', label: '月份' },
        { key: 'objectives', label: '目标' },
        { key: 'key_tasks', label: '关键任务' },
        { key: 'deliverables', label: '交付成果' },
        { key: 'milestones', label: '里程碑' },
        { key: 'resources_needed', label: '资源需求' },
        { key: 'risks', label: '风险点' },
        { key: 'success_metrics', label: '成功指标' }
      ],
      action: [
        { key: 'goal', label: '目标' },
        { key: 'when', label: '日期' },
        { key: 'what', label: '事项' },
        { key: 'who', label: '执行人/协同人' },
        { key: 'how', label: '策略方法/执行步骤/行动方案' },
        { key: 'why', label: '价值' },
        { key: 'how_much', label: '投入预算/程度/数量' },
        { key: 'department', label: '部门' },
        { key: 'priority', label: '优先级' },
        { key: 'status', label: '状态' },
        { key: 'progress', label: '进度（%）' },
        { key: 'expected_result', label: '预期结果' },
        { key: 'actual_result', label: '实际结果' },
        { key: 'remarks', label: '备注' }
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
          when: '',
          what: '',
          who: '',
          how: '',
          why: '',
          how_much: ''
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
      <div className="flex items-center justify-between mb-6 p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100">
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

      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl table-excel-borders table-compact min-w-[1200px]">
        <thead>
          <tr>
            <th className="px-6 py-4 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50 whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar size={16} />
                <span>{head('月份')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50 whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <FileText size={16} />
                <span>{head('主题')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50 whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Target size={16} />
                <span>{head('目标')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50 whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <List size={16} />
                <span>{head('主要任务')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50 whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Package size={16} />
                <span>{head('资源需求')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50 whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Clock size={16} />
                <span>{head('时间安排')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/50 whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <User size={16} />
                <span>{head('负责人')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center whitespace-nowrap">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <MessageSquare size={16} />
                <span>{head('备注')}</span>
              </div>
            </th>
            
          </tr>
        </thead>
        <tbody>
          {planningData.data.map((item, index) => (
            <tr key={index} className={[
              'group',
              getThemeRowClasses(item.theme),
              'transition-all','duration-300','border-b','border-gray-100/50'
            ].join(' ')}>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center px-3 h-8 rounded-full bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mr-1 ring-2 ring-white shadow-md">
                      {item.month}
                    </div>
                    <span className="text-xs font-medium text-gray-700">月</span>
                  </div>
                </div>
              </td>
              <td className={`px-6 py-4 font-semibold text-center border-r border-gray-200/30 transition-colors duration-300 ${getThemeCellClasses(item.theme)}`}>
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="theme"
                  value={item.theme}
                  type="select"
                  options={Object.keys(monthThemeColors)}
                />
                {planningErrors[index]?.theme && <span className="text-red-500 text-xs mt-1 block">{planningErrors[index].theme}</span>}
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="goals"
                  value={item.goals}
                  type="textarea"
                />
                {planningErrors[index]?.goals && <span className="text-red-500 text-xs mt-1 block">{planningErrors[index].goals}</span>}
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="tasks"
                  value={item.tasks}
                  type="textarea"
                />
                {planningErrors[index]?.tasks && <span className="text-red-500 text-xs mt-1 block">{planningErrors[index].tasks}</span>}
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="resources"
                  value={item.resources}
                  type="textarea"
                />
                {planningErrors[index]?.resources && <span className="text-red-500 text-xs mt-1 block">{planningErrors[index].resources}</span>}
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="timeline"
                  value={item.timeline}
                />
                {planningErrors[index]?.timeline && <span className="text-red-500 text-xs mt-1 block">{planningErrors[index].timeline}</span>}
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="responsible"
                  value={item.responsible}
                />
                {planningErrors[index]?.responsible && <span className="text-red-500 text-xs mt-1 block">{planningErrors[index].responsible}</span>}
              </td>
              <td className="px-6 py-4 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="planning"
                  index={index}
                  field="notes"
                  value={item.notes}
                  type="textarea"
                />
              </td>
              
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderEventsSheet = () => (
    <div id="events-table" className="overflow-x-auto">
      {/* 大事件提炼 - 现代化设计 */}
      <div className="flex items-center justify-between mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/30 relative">
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

      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl table-excel-borders table-compact min-w-[1800px]">
        <thead>
          <tr>
            <th className="px-6 py-2 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{head('月份')}</span>
              </div>
            </th>
            <th className="px-6 py-2 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <FileText className="w-4 h-4 text-green-600" />
                <span>{head('事件名称')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-2 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Tag className="w-4 h-4 text-green-600" />
                <span>{head('事件类型')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-2 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Star className="w-4 h-4 text-yellow-600" />
                <span>{head('重要程度')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-2 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <AlignLeft className="w-4 h-4 text-yellow-600" />
                <span>{head('事件描述')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-2 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>{head('影响分析')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            <th className="px-6 py-2 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>{head('经验教训')}</span><span className="ml-1 text-red-500">*</span>
              </div>
            </th>
            
          </tr>
        </thead>
        <tbody>
          {getFilteredEvents().map(({ item, index }) => (
            <tr key={index} className={`group transition-all duration-300 border-b border-gray-100/50 ${eventsErrors[index] ? 'bg-red-50' : 'hover:bg-gradient-to-r hover:from-purple-50/80 hover:to-pink-50/80'}`}>
              <td className="px-6 py-2 font-bold text-center bg-gradient-to-r from-blue-50/60 to-blue-100/60 border-r border-gray-200/30 group-hover:from-blue-100/80 group-hover:to-blue-200/80 transition-colors duration-300">
                <div className="inline-flex items-center px-3 h-7 rounded-full bg-white ring-1 ring-gray-200 shadow-sm justify-center">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mr-1 ring-2 ring-white shadow-md">
                    {item.month}
                  </div>
                  <span className="text-xs font-medium text-gray-700">月</span>
                </div>
              </td>
              <td className="px-6 py-2 font-semibold border-r border-gray-200/30 group-hover:bg-white/50 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="event_name"
                  value={item.event_name}
                />
                {eventsErrors[index]?.event_name && <span className="text-red-500 text-xs mt-1 block">{eventsErrors[index].event_name}</span>}
              </td>
              <td className="px-6 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
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
                {eventsErrors[index]?.event_type && <span className="text-red-500 text-xs mt-1 block">{eventsErrors[index].event_type}</span>}
              </td>
              <td className="px-6 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="importance"
                  value={item.importance}
                  type="select"
                  options={["高","中","低"]}
                />
                {eventsErrors[index]?.importance && <span className="text-red-500 text-xs mt-1 block">{eventsErrors[index].importance}</span>}
              </td>
              <td className="px-6 py-2 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="description"
                  value={item.description}
                  type="textarea"
                />
                {eventsErrors[index]?.description && <span className="text-red-500 text-xs mt-1 block">{eventsErrors[index].description}</span>}
              </td>
              <td className="px-6 py-4 border-r border-gray-200/30 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="impact"
                  value={item.impact}
                  type="textarea"
                />
                {eventsErrors[index]?.impact && <span className="text-red-500 text-xs mt-1 block">{eventsErrors[index].impact}</span>}
              </td>
              <td className="px-6 py-2 group-hover:bg-white/30 transition-colors duration-300">
                <EditableCell
                  sheet="events"
                  index={index}
                  field="lessons"
                  value={item.lessons}
                  type="textarea"
                />
                {eventsErrors[index]?.lessons && <span className="text-red-500 text-xs mt-1 block">{eventsErrors[index].lessons}</span>}
              </td>
              
            </tr>
          ))}
        </tbody>
      </table>
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
      {/* 月度推进计划表 - 现代化设计 */}
      <div className="flex items-center justify-between mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/30">
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

      <table className="w-full border-collapse rounded-3xl overflow-hidden shadow-2xl table-excel-borders table-compact min-w-[1200px]">
        <thead>
          <tr>
            <th className="px-6 py-4 bg-gradient-to-r from-blue-100/80 to-blue-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{head('月份')}</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Target className="w-4 h-4 text-green-600" />
                <span>{head('任务名称')}</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-green-100/80 to-green-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <CheckSquare className="w-4 h-4 text-green-600" />
                <span>{head('负责部门')}</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Package className="w-4 h-4 text-yellow-600" />
                <span>{head('负责人')}</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-yellow-100/80 to-yellow-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Flag className="w-4 h-4 text-yellow-600" />
                <span>{head('目标值')}</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{head('实际值')}</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-purple-100/80 to-purple-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center border-r border-gray-200/30">
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span>{head('完成率')}</span>
              </div>
            </th>
            <th className="px-6 py-4 bg-gradient-to-r from-red-100/80 to-red-200/80 backdrop-blur-sm text-sm font-semibold text-gray-800 text-center">
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="w-4 h-4 text-red-600" />
                <span>{head('状态 / 时间 / 内容')}</span>
              </div>
            </th>
            
          </tr>
        </thead>
        <tbody>
          {monthlyPlans.plans.map((item, index) => (
            <tr key={index} className="group border-b border-gray-200/30 hover:bg-gradient-to-r from-yellow-50/50 to-orange-50/50 transition-all duration-300 hover:shadow-md">
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <div className="flex items-center justify-start">
                  <div className="inline-flex items-center px-3 h-8 rounded-full bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mr-1 ring-2 ring-white shadow-md">
                      {item.month}
                    </div>
                    <span className="text-xs font-medium text-gray-700">月</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell sheet="monthly" index={index} field="task_name" value={item.task_name} type="textarea" />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell sheet="monthly" index={index} field="department" value={item.department} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell sheet="monthly" index={index} field="responsible_person" value={item.responsible_person} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell sheet="monthly" index={index} field="target_value" value={item.target_value} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell sheet="monthly" index={index} field="actual_value" value={item.actual_value} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200/30 group-hover:border-gray-200/50 transition-colors">
                <EditableCell sheet="monthly" index={index} field="completion_rate" value={item.completion_rate} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 group-hover:border-gray-200/50 transition-colors">
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.status === 'ahead' ? 'bg-green-100 text-green-800' :
                    item.status === 'on_track' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'delayed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {head(item.status === 'ahead' ? '提前完成' :
                     item.status === 'on_track' ? '按计划进行' :
                     item.status === 'delayed' ? '延期' : '有风险')}
                  </span>
                  <span className="text-xs text-gray-600">
                    {item.start_date ? item.start_date : '-'}
                    {item.end_date ? ` ~ ${item.end_date}` : ''}
                  </span>
                  <span className="text-xs text-gray-800 max-w-[240px] overflow-hidden text-ellipsis">
                    {(() => { const c = (item.key_activities || item.next_month_plan || item.achievements || '-').toString(); return c.length>3?`${c.slice(0,3)}...`:c })()}
                  </span>
                </div>
              </td>
              
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderActionSheet = () => (
    <div id="action-table" className="overflow-x-auto">
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-gray-200">
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

      <table className="w-full border-collapse rounded-xl overflow-hidden shadow-lg table-excel-borders min-w-[1800px]">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">目标<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-yellow-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">日期<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">事项<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">执行人/协同人<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">策略方法/执行步骤/行动方案<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">价值<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">投入预算/程度/数量<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-indigo-100 to-indigo-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">部门<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-orange-100 to-orange-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">优先级<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">状态<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-teal-100 to-teal-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">进度（%）<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">预期结果<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">实际结果<span className="ml-1 text-red-500">*</span></th>
            <th className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap">备注</th>
            <th className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-semibold text-gray-800 text-center border border-gray-200 whitespace-nowrap no-print">操作</th>
          </tr>
        </thead>
        <tbody>
          {actionPlans.actions.map((item, index) => (
            <tr key={index} className={`transition-all duration-200 border-b border-gray-100 ${actionErrors[index] ? 'bg-red-50' : 'hover:bg-gradient-to-r from-blue-50/50 to-indigo-50/50'}`}>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="goal"
                  value={item.goal}
                  type="textarea"
                />
                {actionErrors[index]?.goal && <span className="hidden">{actionErrors[index].goal}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="when"
                  value={item.when}
                />
                {actionErrors[index]?.when && <span className="hidden">{actionErrors[index].when}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="what"
                  value={item.what}
                  type="textarea"
                />
                {actionErrors[index]?.what && <span className="hidden">{actionErrors[index].what}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="who"
                  value={item.who}
                />
                {actionErrors[index]?.who && <span className="hidden">{actionErrors[index].who}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="how"
                  value={item.how}
                  type="textarea"
                />
                {actionErrors[index]?.how && <span className="hidden">{actionErrors[index].how}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="why"
                  value={item.why}
                  type="textarea"
                />
                {actionErrors[index]?.why && <span className="hidden">{actionErrors[index].why}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="how_much"
                  value={item.how_much}
                />
                {actionErrors[index]?.how_much && <span className="hidden">{actionErrors[index].how_much}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="department"
                  value={item.department}
                  type="select"
                  options={departments.map(d => d.name)}
                />
                {actionErrors[index]?.department && <span className="hidden">{actionErrors[index].department}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="priority"
                  value={item.priority}
                  type="select"
                  options={[{ value: 'high', label: '高' }, { value: 'medium', label: '中' }, { value: 'low', label: '低' }]}
                />
                {actionErrors[index]?.priority && <span className="hidden">{actionErrors[index].priority}</span>}
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
                />
                {actionErrors[index]?.status && <span className="hidden">{actionErrors[index].status}</span>}
              </td>
              <td className="px-3 py-1 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="progress"
                  value={item.progress}
                  type="number"
                />
                {actionErrors[index]?.progress && <span className="hidden">{actionErrors[index].progress}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="expected_result"
                  value={item.expected_result}
                  type="textarea"
                />
                {actionErrors[index]?.expected_result && <span className="hidden">{actionErrors[index].expected_result}</span>}
              </td>
              <td className="px-6 py-3 border border-gray-200">
                <EditableCell
                  sheet="action"
                  index={index}
                  field="actual_result"
                  value={item.actual_result}
                  type="textarea"
                />
                {actionErrors[index]?.actual_result && <span className="hidden">{actionErrors[index].actual_result}</span>}
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
    </div>
  )

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <PageHeaderBanner
        title="年度规划表"
        subTitle={`年度工作落地规划（泉州太禾服饰有限公司·${selectedYear}年）`}
        year={selectedYear}
        onYearChange={(y) => { setYearChangeByUser(true); setSelectedYear(y) }}
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
                onClick={() => setShowPrintPreview(true)}
                className="btn-brand-print group px-6 py-3 flex-shrink-0"
                title="打印预览"
                aria-label="打印预览"
              >
                <div className="p-0 bg-white/20 rounded-lg mr-2 group-hover:bg-white/30">
                  <Printer size={18} className="text-white" />
                </div>
                <span>打印预览</span>
              </button>
              <button
                onClick={() => handleExportPDF(currentSheet)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl hover:from-green-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 flex-shrink-0"
                title="导出PDF"
                aria-label="导出PDF"
              >
                <Download size={18} />
                <span>导出PDF</span>
              </button>
              <label htmlFor="import-events-annual" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg flex items-center space-x-2 relative z-50 pointer-events-auto flex-shrink-0 cursor-pointer" title="导入Excel" aria-label="导入Excel">
                <Upload size={18} />
                <span>导入Excel</span>
                <input id="import-events-annual" name="import-events-annual" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportEvents(e.target.files[0])} />
              </label>

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
