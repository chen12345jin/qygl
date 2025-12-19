import React, { useState, useEffect, useRef } from 'react'
import TableManager from '../components/TableManager'
import { useData } from '../contexts/DataContext'
import { TrendingUp, Filter, RefreshCcw, Download, Upload, Calendar, Plus, X, Trash2, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/export'
import toast from 'react-hot-toast'
import PrintPreview from '../components/PrintPreview'
import { normalizeProgress, computeActionPlanStatus } from '../utils/status'
import { useDropzone } from 'react-dropzone'
import { getLeafDepartments, getBusinessDepartments, getDescendantDepartmentNames } from '../utils/orgSync'

const MonthlyProgress = () => {
  const { globalYear, setGlobalYear, getMonthlyProgress, addMonthlyProgress, updateMonthlyProgress, deleteMonthlyProgress, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [progress, setProgress] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [filters, setFilters] = useState({
    year: globalYear,
    month: '',
    department: '',
    status: ''
  })

  // Filter Popover State
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)

  // Close filter popover when clicking outside
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
    setFilters(prev => ({ ...prev, year: globalYear }))
  }, [globalYear])
  const [years, setYears] = useState([2024, 2025, 2026])
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      if (d.room === 'monthlyProgress') {
        if (!d.year || d.year === filters.year) {
          loadProgress()
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => window.removeEventListener('dataUpdated', handler)
  }, [filters.year])

  useEffect(() => {
    loadProgress()
    loadDepartments()
  }, [filters])

  useEffect(() => { setPage(1) }, [filters, progress.length])

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

  const persistMPFilters = async (f) => {
    try {
      // 保存当前月度推进计划筛选到系统设置，供其他页面读取实现数据一致性
      await addSystemSetting({ key: 'currentMonthlyProgressFilters', value: f }, false)
    } catch (e) {}
  }

  useEffect(() => {
    persistMPFilters(filters)
  }, [filters])

  useEffect(() => { if (filters?.year) { persistSelectedYear(filters.year, yearChangeByUser); if (yearChangeByUser) setYearChangeByUser(false) } }, [filters.year, yearChangeByUser])

  const computeStatus = (progress, when) => computeActionPlanStatus(progress, when)

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

  const loadProgress = async () => {
    const result = await getMonthlyProgress({ year: filters.year })
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
          
          // 兼容旧数据格式，检查月份字段
          if (p.month) {
            return parseInt(p.month) === m
          }
          return false
        })
      }
      if (filters.department) {
        const names = getDescendantDepartmentNames(departments, filters.department)
        if (names.length > 0) {
          data = data.filter(p => names.includes(p.department))
        }
      }
      if (filters.status) {
        const statusMap = {
          not_started: '待开始',
          in_progress: '进行中',
          completed: '已完成',
          delayed: '已延期'
        }
        const target = statusMap[filters.status] || ''
        if (target) {
          data = data.filter(p => {
            const computed = computeStatus(p.completion_rate || 0, p.end_date)
            return computed === target
          })
        }
      }
      const processedData = data.map(item => ({
        ...item,
        completion_rate: normalizeProgress(item.completion_rate || 0)
      }))
      setProgress(processedData)
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

  const handleAdd = async (data) => {
    const progressData = {
      ...data,
      year: filters.year,
      target_value: data.target_value ? parseFloat(data.target_value) : null,
      actual_value: data.actual_value ? parseFloat(data.actual_value) : null,
      completion_rate: normalizeProgress(data.completion_rate || 0)
    }
    const existing = progress.find(p => Number(p.year) === Number(progressData.year) && Number(p.month) === Number(progressData.month))
    if (existing && existing.id) {
      const upd = await updateMonthlyProgress(existing.id, { ...existing, ...progressData })
      if (upd.success) { await loadProgress(); return true } else { return false }
    } else {
      const result = await addMonthlyProgress(progressData)
      if (result.success) { await loadProgress(); return true } else { return false }
    }
  }

  const handleEdit = async (id, data) => {
    const updateData = {
      ...data,
      target_value: data.target_value ? parseFloat(data.target_value) : null,
      actual_value: data.actual_value ? parseFloat(data.actual_value) : null,
      completion_rate: normalizeProgress(data.completion_rate || 0)
    }
    const result = await updateMonthlyProgress(id, updateData)
    if (result.success) {
      loadProgress()
      setEditingId(null)
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteMonthlyProgress(id)
    if (result.success) {
      loadProgress()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.task_name = `${newData.task_name}_副本`
    newData.year = filters.year
    handleAdd(newData)
  }

  const getFilterCount = () => {
    let count = 0
    if (filters.month) count++
    if (filters.department) count++
    if (filters.status) count++
    return count
  }
  const filterCount = getFilterCount()

  const handleExportToExcel = () => {
    if (!progress || progress.length === 0) {
      toast('当前没有可导出的数据', { icon: 'ℹ️' })
      return
    }

    const toastId = toast.loading('正在导出数据...', { duration: 0 })

    setTimeout(() => {
      try {
        const exportData = progress.map(p => ({
          year: p.year,
          month: p.month,
          department: p.department,
          task_name: p.task_name,
          key_activities: p.key_activities,
          achievements: p.achievements,
          challenges: p.challenges,
          next_month_plan: p.next_month_plan,
          support_needed: p.support_needed,
          target_value: p.target_value,
          actual_value: p.actual_value,
          completion_rate: p.completion_rate,
          status: p.status,
          start_date: p.start_date,
          end_date: p.end_date,
          responsible_person: p.responsible_person
        }))
        exportToExcel(exportData, `月度推进计划_${filters.year}年`, '月度推进', 'monthlyProgress')
        toast.success(`已导出 ${exportData.length} 条到 Excel`, { id: toastId })
      } catch (error) {
        console.error('导出Excel失败:', error)
        toast.error('导出失败，请稍后重试', { id: toastId })
      }
    }, 100)
  }

  const handleImportFromExcel = async (file) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)
      const departmentNames = Array.isArray(departments) ? departments.map(d => d.name).filter(Boolean) : []
      const invalidRows = []
      for (const row of rows) {
        const rawDepartment = row['部门'] || ''
        if (rawDepartment && departmentNames.length > 0 && !departmentNames.includes(rawDepartment)) {
          invalidRows.push(rawDepartment)
          continue
        }
        const payload = {
          year: Number(row['年度'] || filters.year),
          month: row['月份'] ? Number(row['月份']) : null,
          department: rawDepartment,
          task_name: row['任务名称'] || '',
          key_activities: row['核心动作'] || '',
          achievements: row['达成成果'] || '',
          challenges: row['存在问题'] || '',
          next_month_plan: row['下月规划'] || '',
          support_needed: row['所需支持'] || '',
          target_value: row['目标值'] ? Number(row['目标值']) : null,
          actual_value: row['实际值'] ? Number(row['实际值']) : null,
          completion_rate: normalizeProgress(row['完成率'] || row['进度'] || row['进度（%）']),
          status: row['状态'] || '',
          responsible_person: row['负责人'] || ''
        }
        const existing = progress.find(p => Number(p.year) === Number(payload.year) && Number(p.month) === Number(payload.month))
        if (existing && existing.id) {
          await updateMonthlyProgress(existing.id, { ...existing, ...payload })
        } else {
          await addMonthlyProgress(payload)
        }
      }
      await loadProgress()
      if (invalidRows.length > 0) {
        const uniqueInvalid = [...new Set(invalidRows)]
        toast.error(`导入完成，但有 ${uniqueInvalid.length} 个部门在系统中不存在，相关行已跳过：${uniqueInvalid.join('、')}`)
      } else {
        toast.success('导入完成')
      }
    } catch (e) {
      console.error('导入失败:', e)
      toast.error('导入失败，请检查文件格式')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleImportFromExcel(acceptedFiles[0])
      }
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  })

  const determineStatus = (rate, endDate) => {
    if (rate >= 100) return 'ahead'
    if (endDate) {
      const end = new Date(endDate)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      if (end < now) return 'delayed'
    }
    return rate < 50 ? 'at_risk' : 'on_track'
  }

  const columns = [
    { 
      key: 'year', 
      label: '年度', 
      type: 'select',
      options: years.map(y => ({ value: y, label: `${y}年` })),
      required: true,
      onChange: (value, setFormData, formData) => {
        const year = parseInt(value)
        const month = formData.month
        if (year && month) {
          const startDate = new Date(year, month - 1, 1)
          const endDate = new Date(year, month, 0)
          const formatDate = (d) => {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const da = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${da}`
          }
          setFormData({
            ...formData,
            year: value,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate)
          })
        } else {
          setFormData({ ...formData, year: value })
        }
      },
      headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200 sticky top-0 z-10'
    },
    { 
      key: 'month', 
      label: '月份', 
      type: 'select',
      options: Array.from({ length: 12 }, (_, i) => ({ 
        value: i + 1, 
        label: `${i + 1}月` 
      })),
      required: true,
      onChange: (value, setFormData, formData) => {
        const year = formData.year || filters.year
        const month = parseInt(value)
        if (year && month) {
          const startDate = new Date(year, month - 1, 1)
          const endDate = new Date(year, month, 0)
          const formatDate = (d) => {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const da = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${da}`
          }
          setFormData({
            ...formData,
            month: value,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate)
          })
        } else {
          setFormData({ ...formData, month: value })
        }
      },
      headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200 sticky top-0 z-10',
      render: (value) => {
        if (!value) return '-'
        return (
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-gray-200">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-black flex items-center justify-center text-sm font-bold mr-1">
              {value}
            </div>
            <span className="text-sm font-medium text-gray-700">月</span>
          </div>
        )
      }
    },
    { key: 'task_name', label: '任务名称', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200 sticky top-0 z-10' },
    { 
      key: 'department', 
      label: '负责部门', 
      type: 'select',
      options: getLeafDepartments(departments).map(dept => ({ value: dept.name, label: dept.name })),
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200 sticky top-0 z-10'
    },
    { key: 'responsible_person', label: '负责人', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'key_activities', label: '关键活动', type: 'textarea', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'start_date', label: '开始日期', type: 'date', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'end_date', label: '结束日期', type: 'date', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10' },
    { 
      key: 'target_value', 
      label: '目标值', 
      type: 'number', 
      headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10',
      onChange: (value, setFormData, formData) => {
        const target = parseFloat(value)
        const actual = parseFloat(formData.actual_value)
        let rate = 0
        if (!isNaN(target) && !isNaN(actual) && target !== 0) {
          rate = (actual / target) * 100
        }
        const normalizedRate = normalizeProgress(rate)
        const newStatus = determineStatus(normalizedRate, formData.end_date)
        setFormData({
          ...formData,
          target_value: value,
          completion_rate: normalizedRate,
          status: newStatus
        })
      }
    },
    { 
      key: 'actual_value', 
      label: '实际值', 
      type: 'number', 
      headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200 sticky top-0 z-10',
      onChange: (value, setFormData, formData) => {
        const actual = parseFloat(value)
        const target = parseFloat(formData.target_value)
        let rate = 0
        if (!isNaN(target) && !isNaN(actual) && target !== 0) {
          rate = (actual / target) * 100
        }
        const normalizedRate = normalizeProgress(rate)
        const newStatus = determineStatus(normalizedRate, formData.end_date)
        setFormData({
          ...formData,
          actual_value: value,
          completion_rate: normalizedRate,
          status: newStatus
        })
      }
    },
    { 
      key: 'completion_rate', 
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
      render: (value, item) => renderStatusBadge(item?.completion_rate, item?.end_date),
      customField: ({ formData }) => (
        <div className="flex flex-col space-y-1">
          <div className="h-10 flex items-center">
            {renderStatusBadge(formData?.completion_rate, formData?.end_date)}
          </div>
        </div>
      ),
      disabled: true
    },
    { key: 'achievements', label: '主要成果', type: 'textarea', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'challenges', label: '遇到的挑战', type: 'textarea', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'next_month_plan', label: '下月计划', type: 'textarea', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'support_needed', label: '需要支持', type: 'textarea', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' }
  ]

  const finalColumns = columns.map(c => {
    // 所有年份，实际相关字段非必填：实际值、完成率、主要成果、遇到的挑战、下月计划、需要支持、状态
    const optionalKeys = ['actual_value', 'completion_rate', 'achievements', 'challenges', 'next_month_plan', 'support_needed', 'status']
    if (optionalKeys.includes(c.key)) {
      return { ...c, required: false }
    }
    return { ...c, required: true }
  })

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="月度推进计划"
        subTitle="跟踪和管理各项工作的月度执行进展情况"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setGlobalYear(y) }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
        
      />

      {/* 顶部右侧筛选面板 */}
      <div className="relative">
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
                        {filters.year === y
                          ? <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">当前</span>
                          : <button className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => { setGlobalYear(y); persistSelectedYear(y, true) }}>设为当前</button>}
                        <button
                          onClick={() => {
                            const next = years.filter(v=>v!==y)
                            const fallback = next[next.length-1] || new Date().getFullYear()
                            if (next.length === 0) { setYears([fallback]); persistYears([fallback]) }
                            else { setYears(next); persistYears(next) }
                            if (filters.year===y) { setGlobalYear(fallback); persistSelectedYear(fallback, true) }
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

      <div className="unified-table-wrapper">
      <TableManager
        title={`${filters.year}年度月度推进计划表`}
        data={progress}
        columns={finalColumns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
        editingId={editingId}
        onEditingChange={setEditingId}
        addHeader={`新增${filters.year}年月度推进计划`}
        addSubHeader="请填写月份与目标实际值，完成率实时预览"
        addBadge={String(filters.year)}
        addTheme="from-blue-600 to-purple-600"
        prefill={{ year: filters.year, status: 'on_track', completion_rate: 0 }}
        ellipsisAll={filters.year !== 2025}
        headerEllipsis={filters.year === 2025}
        singleLineNoEllipsis={filters.year === 2025}
        tableClassName="unified-data-table"
        tableContainerClassName="unified-table-scroll"
        stickyHeader={true}
        stickyHeaderBgClass="bg-white"
        compact={filters.year === 2025}
        ultraCompact={false}
        actionsHeaderClassName="text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200"
        rowColorBy="status"
        rowColorMap={{
          ahead: 'bg-green-50',
          on_track: 'bg-blue-50',
          delayed: 'bg-red-50',
          at_risk: 'bg-yellow-50'
        }}
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
              className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-2 ${!(filters.month || filters.department || filters.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                setFilters(prev => ({ ...prev, department: '', status: '', month: '' }))
              }}
              title="重置筛选"
              disabled={!(filters.month || filters.department || filters.status)}
            >
              <RefreshCcw size={14} />
              <span>重置</span>
            </button>
            
            <button 
              className={`px-3 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 ${progress.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleExportToExcel}
              disabled={progress.length===0}
            >
              <Download size={14} />
              <span>导出</span>
            </button>
            <button 
              className={`px-3 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 ${progress.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => setShowPrintPreview(true)}
              disabled={progress.length===0}
            >
              <FileText size={14} />
              <span>PDF</span>
            </button>
            <div 
              {...getRootProps()} 
              className={`px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 cursor-pointer ${isDragActive ? 'ring-2 ring-blue-300 scale-105' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={14} />
              <span>{isDragActive ? '释放导入' : '导入'}</span>
            </div>
          </div>
        )}
        pagination={{
          page,
          pageSize,
          total: progress.length,
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
                <select id="panel-month" name="month"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
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
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                  <option value="">全部部门</option>
                  {getBusinessDepartments(departments).map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select id="panel-status" name="status"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">全部状态</option>
                  <option value="not_started">未开始</option>
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="delayed">延期</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </TableManager>
      </div>

      {/* PDF打印预览 */}
      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title={`${filters.year}年度月度推进计划`}
        data={progress}
        columns={finalColumns}
        filename={`月度推进计划_${filters.year}年`}
        pageType="monthlyProgress"
        year={filters.year}
      />
    </div>
  )
}

export default MonthlyProgress
