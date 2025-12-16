import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TableManager from '../components/TableManager'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog'
import { useData } from '../contexts/DataContext'
import { 
  CheckSquare, 
  Filter, 
  Target, 
  Calendar, 
  Users, 
  MapPin, 
  Settings, 
  DollarSign,
  BarChart3,
  TrendingUp,
  FileText,
  Building,
  ShoppingBag,
  Cloud,
  RefreshCcw,
  Download,
  Upload,
  X,
  Trash2,
  Info,
  HelpCircle
} from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import { exportToExcel } from '../utils/export'
import { api } from '../utils/api'
import * as XLSX from 'xlsx'
import { computeActionPlanStatus, normalizeProgress } from '../utils/status'
import toast from 'react-hot-toast'
import PrintPreview from '../components/PrintPreview'
import CustomSelect from '../components/CustomSelect'

const validActionPlanStatuses = ['not_started', 'in_progress', 'completed', 'delayed']

const ActionPlans = () => {
  const navigate = useNavigate()
  const { globalYear, setGlobalYear, getActionPlans, addActionPlan, updateActionPlan, deleteActionPlan, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [plans, setPlans] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [filters, setFilters] = useState({
    year: globalYear,
    department: '',
    priority: '',
    status: '',
    month: ''
  })

  useEffect(() => {
    setFilters(prev => ({ ...prev, year: globalYear }))
  }, [globalYear])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const [years, setYears] = useState([2024, 2025, 2026])
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  

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
    loadPlans()
    loadDepartments()
  }, [filters])

  useEffect(() => { setPage(1) }, [filters, plans.length])

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      if (d.room === 'actionPlans') {
        if (!d.year || d.year === filters.year) {
          loadPlans()
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => window.removeEventListener('dataUpdated', handler)
  }, [filters.year])

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
    if (filters?.year && yearChangeByUser) {
      persistSelectedYear(filters.year, true)
      setYearChangeByUser(false)
    }
  }, [filters.year, yearChangeByUser])

  const persistAPFilters = async (f) => {
    try {
      // 保存当前行动计划筛选到系统设置，供其他页面读取实现数据一致性
      await addSystemSetting({ key: 'currentActionPlansFilters', value: f }, false)
    } catch (e) {}
  }

  useEffect(() => {
    persistAPFilters(filters)
  }, [filters])

  const loadPlans = async () => {
    const result = await getActionPlans(filters)
    if (result.success) {
      let data = result.data || []
      if (filters.month) {
        const m = parseInt(filters.month)
        data = data.filter(p => {
          // 检查开始日期或结束日期是否在指定月份
          const startDate = p.start_date ? new Date(p.start_date) : null
          const endDate = p.end_date ? new Date(p.end_date) : null
          
          // 如果有开始日期，检查是否在指定月份
          if (startDate && !isNaN(startDate)) {
            if ((startDate.getMonth() + 1) === m) return true
          }
          // 如果有结束日期，检查是否在指定月份
          if (endDate && !isNaN(endDate)) {
            if ((endDate.getMonth() + 1) === m) return true
          }
          
          // 兼容旧数据格式
          const w = p.when
          if (!w) return false
          const d = new Date(w)
          if (!isNaN(d)) return (d.getMonth() + 1) === m
          if (typeof w === 'string') {
            const parts = w.split(/[-\/]/)
            if (parts.length >= 2) {
              const mm = parseInt(parts[1])
              if (!isNaN(mm)) return mm === m
            }
          }
          return false
        })
      }
      
      // 优先级筛选
      if (filters.priority) {
        data = data.filter(p => p.priority === filters.priority)
      }
      const corrected = (data || []).map(p => {
        const processedP = {
          ...p,
          start_date: p.start_date || p.when,
          end_date: p.end_date || p.when
        }
        const actual = parseFloat(processedP.actual_result) || 0
        const budget = parseFloat(processedP.how_much) || 0
        const originalProgressNumber = Number(p.progress)
        const hasValidOriginalProgress = !isNaN(originalProgressNumber) && originalProgressNumber >= 0 && originalProgressNumber <= 100
        let progress = hasValidOriginalProgress ? originalProgressNumber : 0
        if (!hasValidOriginalProgress && budget > 0 && !isNaN(actual)) {
          progress = (actual / budget) * 100
        }
        progress = parseFloat(progress.toFixed(2))
        const normalizedProgress = normalizeProgress(progress)
        const dateToUse = processedP.end_date || processedP.start_date || processedP.when
        const hasValidOriginalStatus = validActionPlanStatuses.includes(p.status)
        const status = hasValidOriginalStatus ? p.status : computeStatus(normalizedProgress, dateToUse)
        
        return { ...processedP, progress: normalizedProgress, status }
      })
      setPlans(corrected)
      const toUpdate = []
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const original = data[i]
          const next = corrected[i]
          if (!original || !next || !next.id) continue
          const originalProgressNumber = Number(original.progress)
          const hasValidOriginalProgress = !isNaN(originalProgressNumber) && originalProgressNumber >= 0 && originalProgressNumber <= 100
          const originalProgress = hasValidOriginalProgress ? normalizeProgress(originalProgressNumber) : 0
          const nextProgress = parseFloat(next.progress) || 0
          const hasValidOriginalStatus = validActionPlanStatuses.includes(original.status)
          const originalStatus = hasValidOriginalStatus ? original.status : ''
          const nextStatus = next.status || ''
          const originalYear = original.year
          const isLegacy = !hasValidOriginalProgress || !hasValidOriginalStatus
          if (!isLegacy) continue
          if (nextProgress !== originalProgress || nextStatus !== originalStatus || next.year !== originalYear) {
            toUpdate.push({
              id: next.id,
              progress: next.progress,
              status: next.status,
              year: next.year
            })
          }
        }
      }
      if (toUpdate.length > 0) {
        try {
          await Promise.all(
            toUpdate.map(p =>
              updateActionPlan(
                p.id,
                {
                  progress: p.progress,
                  status: p.status,
                  year: p.year
                },
                false
              )
            )
          )
        } catch (e) {
          console.error('更新进度和状态失败:', e)
        }
      }
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const computeStatus = (progress, when) => computeActionPlanStatus(progress, when)

  const handleAdd = async (data) => {
    const planData = {
      ...data,
      year: filters.year
    }
    
    // 自动计算进度：实际结果 / 投入预算 * 100%
    const actual = parseFloat(planData.actual_result) || 0
    const budget = parseFloat(planData.how_much) || 0
    let progress = 0
    if (budget > 0 && !isNaN(actual)) {
      progress = (actual / budget) * 100
    }
    progress = parseFloat(progress.toFixed(2))
    planData.progress = normalizeProgress(progress)
    
    // 使用结束日期作为状态计算的依据，否则使用开始日期
    const dateToUse = planData.end_date || planData.start_date
    planData.status = computeStatus(planData.progress, dateToUse)
    
    const result = await addActionPlan(planData)
    if (result.success) {
      loadPlans()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    const current = plans.find(p => p.id === id)
    
    // 获取当前的开始日期和结束日期
    const start_date = data.start_date !== undefined ? data.start_date : current?.start_date
    const end_date = data.end_date !== undefined ? data.end_date : current?.end_date
    
    // 获取当前的投入预算和实际结果
    const how_much = data.how_much !== undefined ? data.how_much : current?.how_much
    const actual_result = data.actual_result !== undefined ? data.actual_result : current?.actual_result
    
    // 自动计算进度：实际结果 / 投入预算 * 100%
    const actual = parseFloat(actual_result) || 0
    const budget = parseFloat(how_much) || 0
    let progress = 0
    if (budget > 0 && !isNaN(actual)) {
      progress = (actual / budget) * 100
    }
    progress = parseFloat(progress.toFixed(2))
    const nextProgress = normalizeProgress(progress)
    
    // 使用结束日期作为状态计算的依据，否则使用开始日期
    const dateToUse = end_date || start_date
    const status = computeStatus(nextProgress, dateToUse)
    
    const next = { ...data, progress: nextProgress, status, start_date, end_date, how_much, actual_result }
    
    // 更新keys数组，添加start_date和end_date，移除when
    const keys = ['year','goal','start_date','end_date','what','who','how','why','how_much','department','priority','status','progress','actual_result','remarks']
    const changed = keys.some(k => String(current?.[k] ?? '') !== String(next?.[k] ?? ''))
    if (!changed) {
      return false
    }
    const result = await updateActionPlan(id, next)
    if (result.success) {
      loadPlans()
      setEditingId(null)
      return true
    } else {
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteActionPlan(id)
    if (result.success) {
      loadPlans()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.what = `${newData.what}_副本`
    newData.year = filters.year
    // 确保复制时使用正确的日期字段
    if (newData.when && !newData.start_date) {
      newData.start_date = newData.when
      newData.end_date = newData.when
      delete newData.when
    }
    handleAdd(newData)
  }

  const handleExportToExcel = () => {
    if (!plans || plans.length === 0) {
      toast('当前没有可导出的数据', { icon: 'ℹ️' })
      return
    }

    const toastId = toast.loading('正在导出数据...', { duration: 0 })

    setTimeout(() => {
      try {
        const exportData = plans.map(p => ({
          year: p.year,
          goal: p.goal,
          '开始日期': p.start_date || p.when,
          '结束日期': p.end_date || p.when,
          what: p.what,
          who: p.who,
          how: p.how,
          why: p.why,
          how_much: p.how_much,
          department: p.department,
          priority: p.priority,
          actual_result: p.actual_result,
          progress: p.progress,
          status: p.status,
          remarks: p.remarks
        }))
        exportToExcel(exportData, `5W2H行动计划_${filters.year}年`, '行动计划', 'actionPlans')
        toast.success(`已导出 ${exportData.length} 条到 Excel`, { id: toastId })
      } catch (error) {
        console.error('导出Excel失败:', error)
        toast.error('导出失败，请稍后重试', { id: toastId })
      }
    }, 100)
  }

  const getFilterCount = () => {
    let count = 0
    if (filters.department) count++
    if (filters.priority) count++
    if (filters.status) count++
    if (filters.month) count++
    return count
  }
  const filterCount = getFilterCount()

  const handleAddYear = async () => {
    const next = (years && years.length ? Math.max(...years) + 1 : new Date().getFullYear())
    const updated = Array.from(new Set([...(years || []), next])).sort((a,b)=>a-b)
    setYears(updated)
    setYearChangeByUser(true)
    setGlobalYear(next)
    await persistYears(updated)
  }

  const handleImportFromExcel = async (file) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      
      // 先读取原始数据，检查是否有提示行
      let rows = XLSX.utils.sheet_to_json(sheet)
      
      // 检查第一行是否是提示行
      if (rows.length > 0) {
        const firstRowKeys = Object.keys(rows[0])
        const firstRowValues = Object.values(rows[0]).map(v => String(v || ''))
        const isHintRow = firstRowKeys.some(k => k.includes('提示') || k.includes('必填') || k.includes('红色')) ||
                          firstRowValues.some(v => v.includes('提示') || v.includes('必填') || v.includes('红色'))
        if (isHintRow) {
          rows = XLSX.utils.sheet_to_json(sheet, { range: 1 })
        }
      }
      
      // 获取字段值（支持带星号的列名）
      const getField = (row, ...keys) => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]
          if (row[key + '*'] !== undefined && row[key + '*'] !== null && row[key + '*'] !== '') return row[key + '*']
        }
        return ''
      }
      
      // 数值解析
      const parseNumericValue = (val) => {
        if (val === null || val === undefined || val === '') return null
        const str = String(val).replace(/[,，%％]/g, '').trim()
        const num = parseFloat(str)
        return isNaN(num) ? null : num
      }
      
      const seen = new Set()
      let importedCount = 0
      let skippedCount = 0
      
      for (const row of rows) {
        const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')
        if (!hasData) {
          skippedCount++
          continue
        }
        
        const goal = getField(row, '目标', '目标（Smart）', '目标（SMART）', 'goal')
        const what = getField(row, '事项', '事项（做什么What）', 'What（做什么）', 'what')
        const dept = getField(row, '部门', 'department')
        
        // 跳过没有关键数据的行
        if (!goal && !what) {
          skippedCount++
          continue
        }
        
        const key = `${goal}|${what}|${dept}`
        if (seen.has(key)) {
          skippedCount++
          continue
        }
        seen.add(key)
        
        // 尝试获取开始日期和结束日期
        const when = getField(row, '日期', '日期（何时做When）', 'When（什么时候做）', 'when')
        const start_date = getField(row, '开始日期', '开始时间', 'start_date') || when
        const end_date = getField(row, '结束日期', '结束时间', 'end_date') || when
        
        // 获取投入预算和实际结果
        const how_much = parseNumericValue(getField(row, '投入预算/程度/数量', '投入预算/程度/数量（做多少How much）', 'How Much（多少成本）', 'how_much'))
        const actual_result = getField(row, '实际结果', '实际达成', 'actual_result')
        const expected_result = getField(row, '预期结果', '预期达成', 'expected_result')
        
        // 优先使用导入的进度值
        let progress = parseNumericValue(getField(row, '进度（%）', '进度', 'progress'))
        
        // 如果没有进度值，尝试自动计算
        if (progress === null && how_much && actual_result) {
          const actual = parseFloat(actual_result) || 0
          const budget = parseFloat(how_much) || 0
          if (budget > 0 && !isNaN(actual)) {
            progress = (actual / budget) * 100
          }
        }
        
        progress = progress !== null ? parseFloat(progress.toFixed(2)) : 0
        const normalizedProgress = normalizeProgress(progress)
        
        const payload = {
          year: Number(getField(row, '年度', 'year')) || filters.year,
          goal: goal,
          start_date: start_date,
          end_date: end_date,
          what: what,
          who: getField(row, '执行人/协同人', '执行人/协同人（谁来做Who）', 'Who（谁来做）', 'who'),
          how: getField(row, '策略方法/执行步骤/行动方案', '策略方法/执行步骤/行动方案（如何做How）', 'How（如何做）', 'how'),
          why: getField(row, '价值', '价值（为什么Why）', 'Why（为什么做）', 'why'),
          how_much: how_much,
          department: dept,
          priority: getField(row, '优先级', 'priority'),
          expected_result: expected_result,
          actual_result: actual_result,
          remarks: getField(row, '备注', 'remarks'),
          progress: normalizedProgress
        }
        // 使用结束日期作为状态计算的依据
        payload.status = computeStatus(normalizedProgress, end_date)
        
        try {
          await addActionPlan(payload)
          importedCount++
        } catch (err) {
          console.error('导入单条记录失败:', err)
          skippedCount++
        }
      }
      
      await loadPlans()
      
      if (importedCount > 0) {
        toast.success(`导入完成：成功 ${importedCount} 条${skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''}`)
      } else {
        toast.error(`导入失败：跳过 ${skippedCount} 条。请检查Excel列名是否正确`)
      }
    } catch (e) {
      console.error('导入失败:', e)
      toast.error('导入失败，请检查文件格式')
    }
  }

  const renderStatusBadge = (progress, when) => {
    const v = computeStatus(progress, when)
    const p = normalizeProgress(progress)
    
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
    
    // 如果延期且未完成，在文本后添加提示，但保持进度颜色
    if (v === 'delayed') {
       statusText += ' (延期)'
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${colorClass}`}>
        {statusText}
      </span>
    )
  }

  const columns = [
    { 
      key: 'year', 
      label: '年份', 
      type: 'select',
      options: years.map(y => ({ value: y, label: `${y}年` })),
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200 sticky top-0 z-10'
    },
    { key: 'goal', label: '目标', required: true, type: 'textarea', hint: '明确目标，符合可衡量、可达成、相关、时限', headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'start_date', label: '开始日期', type: 'date', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10', onChange: (value, setFormData, prev) => { const next = { ...prev, start_date: value }; const p = normalizeProgress(next.progress); const s = computeStatus(p, value); setFormData({ ...next, progress: p, status: s }); } },
    { key: 'end_date', label: '结束日期', type: 'date', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10', onChange: (value, setFormData, prev) => { const next = { ...prev, end_date: value }; const p = normalizeProgress(next.progress); const s = computeStatus(p, value); setFormData({ ...next, progress: p, status: s }); } },
    { key: 'what', label: '事项', required: true, type: 'textarea', hint: '明确要做的具体事项', headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'who', label: '执行人/协同人', required: true, hint: '填写负责人或团队', headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'how', label: '策略方法/执行步骤/行动方案', type: 'textarea', hint: '关键步骤与方法', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'why', label: '价值', required: true, type: 'textarea', hint: '说明目的与预期价值', headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'how_much', label: '投入预算/程度/数量', type: 'number', hint: '预算或资源投入', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200 sticky top-0 z-10', onChange: (value, setFormData, formData) => { const budget = parseFloat(value) || 0; const actual = parseFloat(formData.actual_result) || 0; let p = 0; if (!isNaN(actual) && budget > 0) { p = (actual / budget) * 100; } p = parseFloat(p.toFixed(2)); const normalizedP = normalizeProgress(p); const next = { ...formData, how_much: value, progress: normalizedP }; const dateToUse = next.end_date || next.start_date; const s = computeStatus(normalizedP, dateToUse); setFormData({ ...next, status: s }); } },
    { 
      key: 'department', 
      label: '负责部门', 
      type: 'select',
      options: departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name })),
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-indigo-100 to-indigo-200 border-b border-gray-200 sticky top-0 z-10'
    },
    { 
      key: 'priority', 
      label: '优先级', 
      type: 'select',
      options: [
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' }
      ],
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-orange-100 to-orange-200 border-b border-gray-200 sticky top-0 z-10',
      render: (value) => (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          value === 'high' ? 'bg-red-100 text-red-800' :
          value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value === 'high' ? '高' : value === 'medium' ? '中' : '低'}
        </span>
      )
    },

    { 
      key: 'actual_result', 
      label: '实际结果', 
      type: 'number', 
      required: false, 
      headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200 sticky top-0 z-10',
      onChange: (value, setFormData, formData) => {
        const actual = parseFloat(value)
        const budget = parseFloat(formData.how_much) || 0
        let p = 0
        if (!isNaN(actual) && budget > 0) {
          // 进度 = 实际结果 / 投入预算 * 100%
          p = (actual / budget) * 100
        }
        p = parseFloat(p.toFixed(2))
        const normalizedP = normalizeProgress(p)
        const next = { ...formData, actual_result: value, progress: normalizedP }
        // 使用结束日期作为状态计算的依据
        const dateToUse = next.end_date || next.start_date
        const s = computeStatus(normalizedP, dateToUse)
        setFormData({ ...next, status: s })
      }
    },
    { 
      key: 'progress', 
      label: '进度（%）', 
      type: 'number', 
      required: filters.year !== 2025, 
      disabled: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-teal-100 to-teal-200 border-b border-gray-200 sticky top-0 z-10'
    },
    { 
      key: 'status', 
      label: '状态', 
      type: 'custom',
      required: false,
      options: [
        { value: 'not_started', label: '未开始' },
        { value: 'in_progress', label: '进行中' },
        { value: 'completed', label: '已完成' },
        { value: 'delayed', label: '延期' }
      ],
      headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200 sticky top-0 z-10',
      render: (value, item) => {
        // 使用结束日期作为状态计算的依据，否则使用开始日期
        const dateToUse = item?.end_date || item?.start_date || item?.when;
        return renderStatusBadge(item?.progress, dateToUse);
      },
      customField: ({ formData }) => {
        // 使用结束日期作为状态计算的依据，否则使用开始日期
        const dateToUse = formData?.end_date || formData?.start_date;
        return (
          <div className="flex flex-col space-y-1">
            <div className="h-10 flex items-center">
              {renderStatusBadge(formData?.progress, dateToUse)}
            </div>
          </div>
        );
      },
      disabled: true
    },
    { key: 'remarks', label: '备注', type: 'textarea', required: false, headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200 sticky top-0 z-10' }
  ]

  return (
    <div className="space-y-8">
      <PageHeaderBanner
        title="5W2H行动计划"
        subTitle="年度行动方案制定与落地"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setGlobalYear(y) }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
        
      />

      {/* 5W2H分析法说明 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mx-1">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
            <Info size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">5W2H 分析法指南</h3>
            <p className="text-xs text-gray-500 mt-0.5">七何分析法 · 结构化思考模型</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* What */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target size={40} className="text-blue-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Target size={18} />
              </div>
              <div className="font-bold text-gray-800 text-base">What</div>
            </div>
            <div className="text-xs font-semibold text-blue-600 mb-1">做什么</div>
            <div className="text-xs text-gray-500 leading-relaxed">明确要做的具体事情</div>
          </div>
          
          {/* Why */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 hover:shadow-lg hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <HelpCircle size={40} className="text-indigo-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <HelpCircle size={18} />
              </div>
              <div className="font-bold text-gray-800 text-base">Why</div>
            </div>
            <div className="text-xs font-semibold text-indigo-600 mb-1">为什么做</div>
            <div className="text-xs text-gray-500 leading-relaxed">明确做这件事的目的和意义</div>
          </div>

          {/* Who */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 hover:shadow-lg hover:shadow-purple-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users size={40} className="text-purple-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Users size={18} />
              </div>
              <div className="font-bold text-gray-800 text-base">Who</div>
            </div>
            <div className="text-xs font-semibold text-purple-600 mb-1">谁来做</div>
            <div className="text-xs text-gray-500 leading-relaxed">明确负责人和参与者</div>
          </div>

          {/* When */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-pink-50 to-white rounded-xl border border-pink-100 hover:shadow-lg hover:shadow-pink-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar size={40} className="text-pink-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-100 rounded-lg text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                <Calendar size={18} />
              </div>
              <div className="font-bold text-gray-800 text-base">When</div>
            </div>
            <div className="text-xs font-semibold text-pink-600 mb-1">什么时候做</div>
            <div className="text-xs text-gray-500 leading-relaxed">明确时间节点和期限</div>
          </div>

          {/* Where */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-orange-50 to-white rounded-xl border border-orange-100 hover:shadow-lg hover:shadow-orange-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <MapPin size={40} className="text-orange-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <MapPin size={18} />
              </div>
              <div className="font-bold text-gray-800 text-base">Where</div>
            </div>
            <div className="text-xs font-semibold text-orange-600 mb-1">在哪里做</div>
            <div className="text-xs text-gray-500 leading-relaxed">明确地点和场所</div>
          </div>

          {/* How */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-teal-50 to-white rounded-xl border border-teal-100 hover:shadow-lg hover:shadow-teal-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Settings size={40} className="text-teal-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-100 rounded-lg text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Settings size={18} />
              </div>
              <div className="font-bold text-gray-800 text-base">How</div>
            </div>
            <div className="text-xs font-semibold text-teal-600 mb-1">如何做</div>
            <div className="text-xs text-gray-500 leading-relaxed">明确实施方法和步骤</div>
          </div>

          {/* How Much */}
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 hover:shadow-lg hover:shadow-emerald-100/50 hover:-translate-y-1 transition-all duration-300 group col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign size={40} className="text-emerald-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <DollarSign size={18} />
              </div>
              <div className="font-bold text-gray-800 text-base">How Much</div>
            </div>
            <div className="text-xs font-semibold text-emerald-600 mb-1">多少成本</div>
            <div className="text-xs text-gray-500 leading-relaxed">明确所需资源和成本</div>
          </div>
        </div>
      </div>

      <div className="unified-table-wrapper">
      <TableManager
        title={`${filters.year}年度5W2H行动计划表`}
        data={plans}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onView={(item) => navigate(`/action-plans/${item.id}`)}
        editingId={editingId}
        onEditingChange={setEditingId}
        addHeader={`新增${filters.year}年5W2H行动计划`}
        addSubHeader="完善必填项，支持内联提示与实时进度预览"
        addBadge={String(filters.year)}
        addTheme="from-blue-600 to-purple-600"
        prefill={{ 
          year: filters.year, 
          status: 'not_started', 
          priority: '', 
          progress: 0,
          start_date: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`,
          end_date: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`
        }}
        tableClassName="unified-data-table"
        tableContainerClassName="unified-table-scroll"
        stickyHeader={true}
        stickyHeaderBgClass="bg-white"
        compact={filters.year === 2025}
        ultraCompact={false}
        ellipsisAll={filters.year !== 2025}
        headerEllipsis={filters.year === 2025}
        singleLineNoEllipsis={filters.year === 2025}
        rowColorBy="status"
        rowColorMap={{
          completed: 'bg-green-50',
          in_progress: 'bg-blue-50',
          delayed: 'bg-red-50',
          not_started: 'bg-gray-50'
        }}
        actionsHeaderClassName="text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200"
        headerActionsLeft={(
          <div className="flex flex-wrap items-center gap-2 mr-2">
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
              className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-2 ${!(filters.month || filters.department || filters.priority || filters.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                setFilters(prev => ({ ...prev, department: '', priority: '', status: '', month: '' }))
              }}
              title="重置筛选"
              disabled={!(filters.month || filters.department || filters.priority || filters.status)}
            >
              <RefreshCcw size={14} />
              <span>重置</span>
            </button>
            <button 
              className={`px-3 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 ${plans.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleExportToExcel}
              disabled={plans.length === 0}
            >
              <Download size={14} />
              <span>导出Excel</span>
            </button>
            <button 
              className={`px-3 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 ${plans.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => setShowPrintPreview(true)}
              disabled={plans.length === 0}
            >
              <FileText size={14} />
              <span>导出PDF</span>
            </button>
            <label htmlFor="ap-import-input" className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 cursor-pointer">
              <Upload size={14} />
              <span>导入Excel</span>
              <input id="ap-import-input" name="ap-import-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => { const f = e.target.files && e.target.files[0]; if (f) { await handleImportFromExcel(f); e.target.value = '' } }} />
            </label>
          </div>
        )}
        pagination={{
          page,
          pageSize,
          total: plans.length,
          onChange: ({ page: p, pageSize: s }) => { setPage(p); setPageSize(s) },
          pageSizeOptions: [10, 20, 50]
        }}
      >
        {isFilterOpen && (
          <div className="card p-6" ref={filterRef}>
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
                <label htmlFor="panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份</label>
                <CustomSelect
                  id="panel-month"
                  value={filters.month}
                  onChange={(value) => setFilters({ ...filters, month: value })}
                  placeholder="全部月份"
                  options={[
                    { value: '', label: '全部月份' },
                    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}月` }))
                  ]}
                  className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="panel-department" className="block text-sm font-medium text-gray-700 mb-1">负责部门</label>
                <CustomSelect
                  id="panel-department"
                  value={filters.department}
                  onChange={(value) => setFilters({ ...filters, department: value })}
                  placeholder="全部部门"
                  options={[
                    { value: '', label: '全部部门' },
                    ...departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name }))
                  ]}
                  className="focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label htmlFor="panel-priority" className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                <CustomSelect
                  id="panel-priority"
                  value={filters.priority}
                  onChange={(value) => setFilters({ ...filters, priority: value })}
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
                <label htmlFor="panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <CustomSelect
                  id="panel-status"
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  placeholder="全部状态"
                  options={[
                    { value: '', label: '全部状态' },
                    { value: 'not_started', label: '未开始' },
                    { value: 'in_progress', label: '进行中' },
                    { value: 'completed', label: '已完成' },
                    { value: 'delayed', label: '延期' }
                  ]}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </TableManager>
      </div>

      {/* 年度管理弹窗 */}
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
                    onClick={async () => {
                      const v = String(newYear || '').trim()
                      if (!v) { setYearError('请输入有效年份（1900-2100）'); return }
                      const n = parseInt(v)
                      if (isNaN(n) || n < 1900 || n > 2100) { setYearError('请输入有效年份（1900-2100）'); return }
                      if (years.includes(n)) { setYearError('年份已存在'); setGlobalYear(n); return }
                      const updated = [...years, n].sort((a,b)=>a-b)
                      setYears(updated)
                      await persistYears(updated)
                      setYearChangeByUser(true)
                      setGlobalYear(n)
                      setNewYear('')
                      setYearError('')
                      setShowYearModal(false)
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
                      {filters.year === y ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">当前</span>
                      ) : (
                        <button
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                          onClick={() => { setYearChangeByUser(true); setGlobalYear(y) }}
                        >设为当前</button>
                      )}
                      <button
                        onClick={async () => {
                          const next = years.filter(v=>v!==y)
                          const fallback = next[next.length-1] || new Date().getFullYear()
                          if (next.length === 0) {
                            setYears([fallback])
                            await persistYears([fallback])
                          } else {
                            setYears(next)
                            await persistYears(next)
                          }
                          if (filters.year===y) {
                            setYearChangeByUser(true)
                            setGlobalYear(fallback)
                          }
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

      {/* PDF打印预览 */}
      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title={`${filters.year}年度5W2H行动计划`}
        data={plans}
        columns={columns}
        filename={`5W2H行动计划_${filters.year}年`}
        pageType="actionPlans"
        year={filters.year}
      />
    </div>
  )
}

export default ActionPlans
