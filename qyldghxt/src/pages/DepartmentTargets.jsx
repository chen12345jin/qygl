import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useFormValidation } from '../contexts/FormValidationContext'

import { useData } from '../contexts/DataContext'
import { exportToExcel } from '../utils/export'
import { TrendingUp, Filter, Download, Upload, Building, Award, Target, Calendar, RefreshCcw, Plus, X, Trash2, FileText, Eye, Edit, List, Package, Clock, User, Layers, Tag, Hash, Percent, Activity } from 'lucide-react'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog'
import Pagination from '../components/Pagination'
import * as XLSX from 'xlsx'
import PageHeaderBanner from '../components/PageHeaderBanner'
import PrintPreview from '../components/PrintPreview'
import toast from 'react-hot-toast'
import { loadLocalePrefs, formatDateTime } from '../utils/locale.js'
import { normalizeProgress, computeActionPlanStatus } from '../utils/status'
import InlineAlert from '../components/InlineAlert'
 

const DepartmentTargets = () => {
  // Force refresh version check
  useEffect(() => {
    console.log('DepartmentTargets Component Loaded - Version: Direct Edit Fix Applied')
  }, [])

  const { 
    globalYear, setGlobalYear,
    getDepartmentTargets, addDepartmentTarget, updateDepartmentTarget, deleteDepartmentTarget, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting 
  } = useData()
  const [targets, setTargets] = useState([])
  const [departments, setDepartments] = useState([])
 
  const [filters, setFilters] = useState({
    year: globalYear,
    department: '',
    targetType: '',
    target_level: '',
    month: '',
    status: ''
  })

  const [sortConfig, setSortConfig] = useState({
    key: '',
    direction: 'asc'
  })

  // Sync globalYear to filters.year
  useEffect(() => {
    setFilters(prev => ({ ...prev, year: globalYear }))
  }, [globalYear])

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [responsibleOwner, setResponsibleOwner] = useState('')
  const [responsibleManager, setResponsibleManager] = useState('')
  const [responsibleVice, setResponsibleVice] = useState('')
  const [selfCheckText, setSelfCheckText] = useState('')
  const [years, setYears] = useState([2024, 2025, 2026])
  const [newYear, setNewYear] = useState('')
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [showYearModal, setShowYearModal] = useState(false)

  const pdfColumns = [
    { key: 'department', label: '部门', minWidth: '100px' },
    { key: 'target_level', label: '级别', minWidth: '60px' },
    { key: 'target_type', label: '类型', minWidth: '80px', render: (val) => {
        const map = { sales: '销售', profit: '利润', project: '项目', efficiency: '效率', quality: '质量', cost: '成本' };
        return map[val] || val;
      } 
    },
    { key: 'target_name', label: '目标名称', minWidth: '150px' },
    { key: 'unit', label: '单位', minWidth: '60px' },
    { key: 'target_value', label: '目标值', minWidth: '80px' },
    { key: 'quarter', label: '季度', minWidth: '60px' },
    { key: 'month', label: '月份', minWidth: '60px' },
    { key: 'current_value', label: '当前值', minWidth: '80px' },
    { key: 'completion_rate', label: '进度（%）', minWidth: '80px', render: (_, item) => {
        const rate = item.current_value && item.target_value 
          ? (Number(item.current_value) / Number(item.target_value) * 100).toFixed(1)
          : 0;
        return `${rate}%`;
      }
    },
    { key: 'status', label: '状态', minWidth: '80px', render: (val) => {
        const statusMap = { completed: '已完成', in_progress: '进行中', not_started: '未开始', delayed: '延期' };
        return statusMap[val] || val;
      }
    },
    { key: 'responsible_person', label: '负责人', minWidth: '80px' },
    { key: 'description', label: '描述', minWidth: '200px' }
  ]
  const [yearError, setYearError] = useState('')
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showAddTarget2025Modal, setShowAddTarget2025Modal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [newTarget, setNewTarget] = useState({ 
    department: '', 
    target_level: '', 
    target_type: '', 
    target_name: '', 
    target_value: '', 
    unit: '', 
    quarter: '', 
    month: '', 
    current_value: '', 
    status: '',
    completion_rate: '0%', 
    responsible_person: '', 
    description: '' 
  })
  const [annualTotal, setAnnualTotal] = useState('')
  const [distributionMode, setDistributionMode] = useState('equal')
  const [monthlyValues, setMonthlyValues] = useState(Array.from({ length: 12 }, () => ''))
  const { errors, validateField, validateForm, clearErrors, setFieldError, clearFieldError } = useFormValidation('departmentTargets')
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' })
  const [alertTimeout, setAlertTimeout] = useState(null)
  const location = useLocation()
  
  // 自定义目标类型管理
  const [customTargetTypes, setCustomTargetTypes] = useState([])
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false)
  const [customTypeInput, setCustomTypeInput] = useState('')
  const [customTypeError, setCustomTypeError] = useState('')
  
  // 加载自定义目标类型
  useEffect(() => {
    const savedTypes = localStorage.getItem('customTargetTypes')
    if (savedTypes) {
      try {
        setCustomTargetTypes(JSON.parse(savedTypes))
      } catch (e) {
        console.error('Failed to parse custom target types:', e)
      }
    }
  }, [])
  
  // 保存自定义目标类型
  const saveCustomTargetTypes = (types) => {
    localStorage.setItem('customTargetTypes', JSON.stringify(types))
    setCustomTargetTypes(types)
  }
  
  // 处理目标类型变化
  const handleTargetTypeChange = (e) => {
    const value = e.target.value
    setNewTarget(prev => ({ ...prev, target_type: value }))
    
    if (value === 'custom') {
      setShowCustomTypeInput(true)
      setCustomTypeError('')
    } else {
      setShowCustomTypeInput(false)
      setCustomTypeInput('')
    }
  }
  
  // 处理自定义类型输入
  const handleCustomTypeInput = (e) => {
    setCustomTypeInput(e.target.value)
    setCustomTypeError('')
  }
  
  // 确认自定义类型
  const confirmCustomType = () => {
    const type = customTypeInput.trim()
    if (!type) {
      setCustomTypeError('请输入目标类型名称')
      return
    }
    
    if (type.length > 20) {
      setCustomTypeError('目标类型名称不能超过20个字符')
      return
    }
    
    // 检查是否已存在
    const existingTypes = ['sales', 'profit', 'project', 'efficiency', 'quality', 'cost']
    const existingCustomTypes = customTargetTypes.map(t => t.value)
    
    if (existingTypes.includes(type) || existingCustomTypes.includes(type)) {
      setNewTarget(prev => ({ ...prev, target_type: type }))
      setShowCustomTypeInput(false)
      setCustomTypeInput('')
      return
    }
    
    // 添加新的自定义类型
    const newCustomType = { value: type, label: type }
    const updatedTypes = [...customTargetTypes, newCustomType]
    saveCustomTargetTypes(updatedTypes)
    
    setNewTarget(prev => ({ ...prev, target_type: type }))
    setShowCustomTypeInput(false)
    setCustomTypeInput('')
  }

  const filterBtnRef = useRef(null)
  const dropdownRef = useRef(null)

  // Clear alert timeout on unmount
  useEffect(() => {
    return () => {
      if (alertTimeout) {
        clearTimeout(alertTimeout)
      }
    }
  }, [alertTimeout])

  const showAlertMessage = (message, type = 'success') => {
    if (alertTimeout) clearTimeout(alertTimeout)
    setAlert({ show: true, message, type })
    const timeoutId = setTimeout(() => {
      setAlert({ show: false, message: '', type: 'info' })
      setAlertTimeout(null)
    }, 3000)
    setAlertTimeout(timeoutId)
  }


 

  useEffect(() => {
    loadTargets()
    loadDepartments()
  }, [filters])

  useEffect(() => { setPage(1) }, [filters, targets.length])

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

  useEffect(() => {
    loadLocalePrefs()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('add2025') === '1') {
      setShowAddTarget2025Modal(true)
    }
  }, [location.search])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isFilterOpen) return
      const btnEl = filterBtnRef.current
      const ddEl = dropdownRef.current
      if (ddEl && !ddEl.contains(e.target) && btnEl && !btnEl.contains(e.target)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isFilterOpen])

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

  useEffect(() => { if (filters?.year) { persistSelectedYear(filters.year, yearChangeByUser); if (yearChangeByUser) setYearChangeByUser(false) } }, [filters.year, yearChangeByUser])

  const loadTargets = async () => {
    try {
      const result = await getDepartmentTargets(filters)
      console.log('getDepartmentTargets result:', result)
      let data = result && Array.isArray(result.data) ? result.data.map(t => ({
        ...t,
        target_value: t.target_value !== null && t.target_value !== undefined ? Number(t.target_value) : null,
        current_value: t.current_value !== null && t.current_value !== undefined ? Number(t.current_value) : null,
        month: t.month ? Number(t.month) : null,
        year: t.year ? Number(t.year) : null,
        department: t.department || (t.department_id ? departments.find(d => d.id === t.department_id)?.name : '未分配部门')
      })) : []
      
      console.log('Processed data:', data)
      
      // 计算每个目标的进度和状态
      const corrected = data.map(t => {
        let p = 0
        if (t.target_value !== null && t.target_value !== undefined && t.target_value !== 0 && t.current_value !== null && t.current_value !== undefined) {
          p = (t.current_value / t.target_value) * 100
        }
        // 确保进度值不是NaN
        p = isNaN(p) ? 0 : parseFloat(p.toFixed(2))
        const normalizedP = normalizeProgress(p)
        // 使用当前日期作为状态计算依据
        const currentDate = new Date()
        const s = computeActionPlanStatus(normalizedP, currentDate)
        return {
          ...t,
          completion_rate: `${normalizedP}%`,
          status: s
        }
      })
      
      console.log('Corrected data:', corrected)
      setTargets(corrected)
    } catch (error) {
      console.error('Error loading targets:', error)
      setTargets([])
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

 

  const handleExportToExcel = () => {
    if (!targets || targets.length === 0) {
      toast('当前没有可导出的数据', { icon: 'ℹ️' })
      return
    }

    const toastId = toast.loading('正在导出数据...', { duration: 0 })

    setTimeout(() => {
      try {
        const exportData = targets.map(target => ({
          year: target.year,
          department: target.department,
          target_level: target.target_level ? `${target.target_level}-${levelLabels[target.target_level] || ''}` : '',
          target_type: targetTypeLabelMap[target.target_type] || target.target_type,
          target_name: target.target_name,
          target_value: target.target_value,
          unit: target.unit,
          quarter: target.quarter,
          month: target.month,
          current_value: target.current_value,
          completion_rate: target.completion_rate || (target.current_value && target.target_value 
            ? ((target.current_value / target.target_value) * 100).toFixed(1) + '%'
            : '0%'),
          responsible_person: target.responsible_person,
          description: target.description,
          created_at: target.created_at
        }))

        exportToExcel(exportData, `部门目标分解_${filters.year}年`, '部门目标', 'departmentTargets')
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
      for (const row of rows) {
        const dept = departments.find(d => d.name === (row['部门'] || row['部门名称']))
        const payload = {
          year: Number(row['年度'] || filters.year),
          department_id: dept ? dept.id : undefined,
          target_level: row['级别'] || 'A',
          target_type: row['目标类型'] || '',
          target_name: row['目标名称'] || '',
          target_value: row['目标值'] ? Number(row['目标值']) : null,
          unit: row['单位'] || '',
          month: row['月份'] ? Number(row['月份']) : null,
          current_value: row['当前值'] ? Number(row['当前值']) : 0,
          status: row['状态'] || '',
          responsible_person: row['负责人'] || '',
          description: row['描述'] || ''
        }
        await addDepartmentTarget(payload)
      }
      await loadTargets()
      toast.success('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      toast.error('导入失败，请检查文件格式')
    }
  }

 

  const generateTableData = () => {
    console.log('Generating table data with targets:', targets)
    console.log('Current filters:', filters)
    console.log('Available departments:', departments)
    
    // Helper to resolve department name
    const getDeptName = (t) => {
      if (t.department) return t.department
      if (t.department_id) {
        const d = departments.find(dep => dep.id === t.department_id)
        if (d) return d.name
      }
      return '未分配部门'
    }

    const safeTargets = Array.isArray(targets) ? targets.filter(t => {
      if (!t) return false
      // 移除年份过滤，因为数据已经在loadTargets中处理过
      // if (filters.year && String(t.year) !== String(filters.year)) return false
      
      const deptName = getDeptName(t)
      if (filters.department && deptName !== filters.department) return false
      
      if (filters.targetType && t.target_type !== filters.targetType) return false
      if (filters.target_level && t.target_level !== filters.target_level) return false
      if (filters.month && String(t.month) !== String(filters.month)) return false
      if (filters.status && t.status !== filters.status) return false
      return true
    }) : []

    console.log('Filtered safeTargets:', safeTargets)

    const deptNames = [...new Set(safeTargets.map(t => getDeptName(t)))]
    const levels = ['A', 'B', 'C', 'D']
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const data = {}

    deptNames.forEach(dept => {
      data[dept] = {}
      levels.forEach(level => {
        data[dept][level] = {}
        months.forEach(month => {
          data[dept][level][month] = []
        })
      })
    })

    safeTargets.forEach(target => {
      const dept = getDeptName(target)
      const level = (target && target.target_level) || 'A'
      const month = (target && target.month) || 1
      
      if (data[dept] && data[dept][level]) {
        if (!data[dept][level][month]) data[dept][level][month] = []
        data[dept][level][month].push(target)
      }
    })

    const result = { departments: deptNames, levels, months, data }
    console.log('Generated table data:', result)
    return result
  }

  const tableData = generateTableData()
  const [detailModal, setDetailModal] = useState({ open: false, department: '', level: '' })

  const [deleteDialog, setDeleteDialog] = useState({ open: false, department: '', level: '' })
  const [editingSeries, setEditingSeries] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const levelLabels = {
    'A': '保底',
    'B': '平衡', 
    'C': '突破',
    'D': '冲刺'
  }

  const targetTypeLabelMap = {
    sales: '销售目标',
    profit: '利润目标',
    project: '项目目标',
    efficiency: '效率目标',
    quality: '质量目标',
    cost: '成本目标'
  }

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  const fieldClassMap2025 = {
    部门: 'field-department',
    类别: 'field-category',
    级别: 'field-level',
    目标名称: 'field-target-name',
    单位: 'field-unit',
    季度: 'field-quarter',
    负责人: 'field-owner',
    年度全年目标: 'field-annual',
    合计: 'field-total',
    当前值: 'field-current-value',
    状态: 'field-status',
    '进度（%）': 'field-completion-rate',
    描述: 'field-desc',
    操作: 'field-actions'
  }

  const headerTextClass = (label) => (fieldClassMap2025[label] || 'text-gray-700')
  const cellTextClass = (label) => (fieldClassMap2025[label] || '')
  const headBgClass = (label) => ({
    部门: 'head-bg-department',
    类别: 'head-bg-category',
    级别: 'head-bg-level',
    目标名称: 'head-bg-target-name',
    单位: 'head-bg-unit',
    季度: 'head-bg-quarter',
    负责人: 'head-bg-owner',
    年度全年目标: 'head-bg-annual',
    合计: 'head-bg-total',
    当前值: 'head-bg-current-value',
    状态: 'head-bg-status',
    '进度（%）': 'head-bg-completion-rate',
    描述: 'head-bg-desc',
    操作: 'head-bg-actions'
  }[label] || '')
  const monthHeadBgClass = (m) => `head-bg-month-${m}`

  const monthHeaderTextMap = {
    1: 'text-gray-900',
    2: 'text-gray-900',
    3: 'text-gray-900',
    4: 'text-gray-900',
    5: 'text-gray-900',
    6: 'text-gray-900',
    7: 'text-gray-900',
    8: 'text-gray-900',
    9: 'text-gray-900',
    10: 'text-gray-900',
    11: 'text-gray-900',
    12: 'text-gray-900'
  }

  const monthValueClassMap = {
    1: 'bg-blue-100 text-blue-900 border border-blue-300 ring-1 ring-blue-300/50',
    2: 'bg-cyan-100 text-cyan-900 border border-cyan-300 ring-1 ring-cyan-300/50',
    3: 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-1 ring-emerald-300/50',
    4: 'bg-teal-100 text-teal-900 border border-teal-300 ring-1 ring-teal-300/50',
    5: 'bg-green-100 text-green-900 border border-green-300 ring-1 ring-green-300/50',
    6: 'bg-lime-100 text-lime-900 border border-lime-300 ring-1 ring-lime-300/50',
    7: 'bg-yellow-100 text-yellow-900 border border-yellow-300 ring-1 ring-yellow-300/50',
    8: 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-300/50',
    9: 'bg-orange-100 text-orange-900 border border-orange-300 ring-1 ring-orange-300/50',
    10: 'bg-red-100 text-red-900 border border-red-300 ring-1 ring-red-300/50',
    11: 'bg-rose-100 text-rose-900 border border-rose-300 ring-1 ring-rose-300/50',
    12: 'bg-purple-100 text-purple-900 border border-purple-300 ring-1 ring-purple-300/50'
  }

  const truncate = (s, n = 4) => {
    if (typeof s !== 'string') return s
    return s.length > n ? s.slice(0, n) + '...' : s
  }

  const truncateLabel = (s, n = 6) => {
    if (typeof s !== 'string') return s
    return s.length > n ? s.slice(0, n) + '...' : s
  }






  const computeStatus = (progress, when) => computeActionPlanStatus(progress, when)

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="ml-1 opacity-30">↕</span>;
    }
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  }

  const renderStatusBadge = (progress, when) => {
    const safeProgress = isNaN(progress) ? 0 : progress
    const v = computeStatus(safeProgress, when)
    const p = normalizeProgress(safeProgress)
    
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

  return (
    <div className="space-y-8">
      <PageHeaderBanner
        title="部门目标分解"
        subTitle="设定和管理各部门的年度目标和完成情况"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setGlobalYear(y) }}
        years={years}
        yearSelectClass="year-select"
        right={(
          <button
            onClick={() => setShowYearModal(true)}
            className="year-add-btn"
            title="添加年份"
            aria-label="添加年份"
          >
            <Plus size={16} />
            <span>添加年份</span>
          </button>
        )}
      />




      

      

      

      

      

      { 
        <div className="card rounded-2xl overflow-hidden">
          <div className="p-6">
            <PageHeaderBanner
              title={`${filters.year}年度目标分解`}
              subTitle="按部门和时间维度展示目标详情"
              right={(
                <div className="flex items-center gap-2 flex-wrap self-center min-h-[40px]">
                  <div className="relative">
                    <button
                      ref={filterBtnRef}
                      className="btn-primary inline-flex items-center"
                      onClick={() => setIsFilterOpen(prev => !prev)}
                      aria-haspopup="menu"
                      aria-expanded={isFilterOpen}
                    >
                      <Filter className="mr-2" size={18} />
                      筛选
                    </button>
                    
                  </div>
                  <button 
                    className={`btn-secondary inline-flex items-center ${filters.department === '' && filters.targetType === '' && filters.target_level === '' && filters.month === '' && filters.status === '' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      setFilters(prev => ({ ...prev, department: '', targetType: '', target_level: '', month: '', status: '' }))
                    }}
                    disabled={filters.department === '' && filters.targetType === '' && filters.target_level === '' && filters.month === '' && filters.status === ''}
                  >
                    <RefreshCcw className="mr-2" size={18} />
                    重置
                  </button>
                  <button
                    className={`h-10 px-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold ${targets.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleExportToExcel}
                    disabled={targets.length===0}
                  >
                    <Download className="mr-2" size={18} />
                    导出Excel
                  </button>
                  <button
                    className={`h-10 px-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all duration-300 shadow-md flex items-center space-x-2 ${targets.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setShowPrintPreview(true)}
                    disabled={targets.length===0}
                  >
                    <FileText className="mr-2" size={18} />
                    导出PDF
                  </button>
                  <label htmlFor="import-dept-targets-banner" className="h-10 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold cursor-pointer relative z-10">
                    <Upload className="mr-2" size={18} />
                    导入Excel
                    <input id="import-dept-targets-banner" name="import-dept-targets-banner" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
                  </label>
                  <button 
                  type="button"
                  className="h-10 px-3 ml-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md inline-flex items-center font-semibold relative z-50 pointer-events-auto"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingSeries([]);
                    setNewTarget({ year: filters.year, department: '', target_level: '', target_type: '', target_name: '', target_value: '', unit: '', quarter: '', month: '', current_value: '', status: '', completion_rate: '0%', responsible_person: '', description: '' });
                    setIsEditMode(false);
                    setShowAddTarget2025Modal(true) 
                  }}
                  title={`${filters.year}年度目标分解`}
                  aria-label={`${filters.year}年度目标分解`}
                >
                  新增{filters.year}年度目标分解
                </button>
                  
                </div>
          )}
        />
        {isFilterOpen && (
          <div className="card p-6 mt-3">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-2">
                <Filter size={16} className="text-white" />
              </div>
              <div className="text-sm text-gray-700">筛选条件</div>
            </div>
            {/* 调整布局，确保部门选择框有足够空间向下展开 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  value={filters.department || ''}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                  <option value="">全部部门</option>
                  {departments.filter(d => !d.name.includes('公司')).map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">级别</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                  value={filters.target_level || ''}
                  onChange={(e) => setFilters({ ...filters, target_level: e.target.value })}
                >
                  <option value="">全部级别</option>
                  {['A','B','C','D'].map(l => (<option key={l} value={l}>{l}-{levelLabels[l]}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                  value={filters.targetType || ''}
                  onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                >
                  <option value="">全部类型</option>
                  <option value="sales">销售</option>
                  <option value="profit">利润</option>
                  <option value="project">项目</option>
                  <option value="efficiency">效率</option>
                  <option value="quality">质量</option>
                  <option value="cost">成本</option>
                  {customTargetTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                  value={filters.month || ''}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                >
                  <option value="">全部月份</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                  value={filters.status || ''}
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
      </div>
          
          
          <div className="unified-table-container">
            <div className="unified-table-scroll">
            <table className="unified-data-table min-w-full text-sm table-fixed">
              <colgroup>
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-20" />
                <col className="w-36" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-28" />
                {[...Array(12)].map((_, i) => (<col key={`m-${i}`} className="w-16" />))}
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-36" />
                <col className="w-40" />
              </colgroup>
              <thead>
                <tr className={`backdrop-blur-sm shadow-sm bg-white`}>
                  <th 
                    className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-28 ${headBgClass('部门')} cursor-pointer hover:bg-gray-50 transition-colors`}
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-indigo-500" />
                      <span className={`${headerTextClass('部门')} whitespace-nowrap`}>部门</span>
                      {renderSortIcon('department')}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-28 ${headBgClass('类别')} cursor-pointer hover:bg-gray-50 transition-colors`}
                    onClick={() => handleSort('target_type')}
                  >
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-purple-500" />
                      <span className={`${headerTextClass('类别')} whitespace-nowrap`}>{truncateLabel('类别')}</span>
                      {renderSortIcon('target_type')}
                    </div>
                  </th>
                  <th 
                    className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-20 ${headBgClass('级别')} cursor-pointer hover:bg-gray-50 transition-colors`}
                    onClick={() => handleSort('level')}
                  >
                    <div className="flex items-center">
                      <Award size={16} className="mr-2 text-green-500" />
                      <span className={`${headerTextClass('级别')} whitespace-nowrap`}>{truncateLabel('级别')}</span>
                      {renderSortIcon('level')}
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-36 ${headBgClass('目标名称')}`}>
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-blue-500" />
                      <span className={`${headerTextClass('目标名称')} whitespace-nowrap`}>{truncateLabel('目标名称')}</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-20 ${headBgClass('单位')}`}>
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-teal-500" />
                      <span className={`${headerTextClass('单位')} whitespace-nowrap`}>{truncateLabel('单位')}</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-20 ${headBgClass('季度')}`}>
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-orange-500" />
                      <span className={`${headerTextClass('季度')} whitespace-nowrap`}>{truncateLabel('季度')}</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-28 ${headBgClass('负责人')}`}>
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-indigo-500" />
                      <span className={`${headerTextClass('负责人')} whitespace-nowrap`}>{truncateLabel('负责人')}</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-28 ${headBgClass('年度全年目标')}`}>
                    <div className="flex items-center justify-center">
                      <Calendar size={16} className="mr-2 text-orange-500" />
                      <span className={`${headerTextClass('年度全年目标')} whitespace-nowrap`}>{truncateLabel('年度全年目标')}</span>
                    </div>
                  </th>
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <th key={month} className={`px-4 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16 ${monthHeadBgClass(month)}`}>
                      <div className="flex flex-col items-center">
                        <span className={`text-xs ${monthHeaderTextMap[month] || 'text-gray-500'}`}>{month}月</span>
                        <div className="w-8 h-1 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mt-1"></div>
                      </div>
                    </th>
                  ))}
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-24 ${headBgClass('合计')}`}><span className={`${headerTextClass('合计')} whitespace-nowrap`}>{truncateLabel('合计')}</span></th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-24 ${headBgClass('当前值')}`}><span className={`${headerTextClass('当前值')} whitespace-nowrap`}>当前值</span></th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-24 ${headBgClass('进度（%）')}`}><span className={`${headerTextClass('进度（%）')} whitespace-nowrap`}>进度（%）</span></th>
                  <th 
                    className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-24 ${headBgClass('状态')} cursor-pointer hover:bg-gray-50 transition-colors`}
                    onClick={() => handleSort('status')}
                  >
                    <span className={`${headerTextClass('状态')} whitespace-nowrap`}>状态</span>
                    {renderSortIcon('status')}
                  </th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-36 ${headBgClass('描述')}`}><span className={`${headerTextClass('描述')} whitespace-nowrap`}>{truncateLabel('描述')}</span></th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-40 ${headBgClass('操作')}`}><span className={`${headerTextClass('操作')} whitespace-nowrap`}>操作</span></th>
                  
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  try {
                    const rows = []
                    console.log('Rendering tbody with tableData:', tableData)
                    tableData.departments.forEach((department) => {
                      tableData.levels.forEach((level) => {
                        const monthData = tableData.data[department]?.[level] || {}
                        const allTargets = Object.values(monthData).flat()
                        console.log(`Processing ${department} - ${level}: ${allTargets.length} targets`)
                        const uniqueMap = new Map()
                        allTargets.forEach(t => {
                          if (!t) return
                          const key = `${t.target_name}-${t.target_type}`
                          if (!uniqueMap.has(key)) {
                            uniqueMap.set(key, {
                              department,
                              level,
                              target_name: t.target_name,
                              target_type: t.target_type,
                              unit: t.unit,
                              responsible_person: t.responsible_person,
                              description: t.description,
                              records: []
                            })
                          }
                          uniqueMap.get(key).records.push(t)
                        })
                        console.log(`Generated ${uniqueMap.size} unique rows for ${department} - ${level}`)
                        uniqueMap.forEach(row => rows.push(row))
                  })
                })
                
                // 排序逻辑
                if (sortConfig.key) {
                  rows.sort((a, b) => {
                    let aVal, bVal;
                    
                    switch (sortConfig.key) {
                      case 'department':
                        aVal = a.department;
                        bVal = b.department;
                        break;
                      case 'level':
                        aVal = a.level;
                        bVal = b.level;
                        break;
                      case 'target_type':
                        aVal = a.target_type;
                        bVal = b.target_type;
                        break;
                      case 'month':
                        // 取第一个记录的月份作为排序依据
                        aVal = a.records[0]?.month || 0;
                        bVal = b.records[0]?.month || 0;
                        break;
                      case 'status':
                        // 计算整体状态作为排序依据
                        const getStatus = (recs) => {
                          const totalTarget = recs.reduce((sum, t) => sum + Number(t.target_value || 0), 0);
                          const totalCurrent = recs.reduce((sum, t) => sum + Number(t.current_value || 0), 0);
                          const rate = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
                          return computeActionPlanStatus(normalizeProgress(rate), new Date());
                        };
                        aVal = getStatus(a.records);
                        bVal = getStatus(b.records);
                        break;
                      default:
                        return 0;
                    }
                    
                    // 字符串比较
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                      aVal = aVal.toLowerCase();
                      bVal = bVal.toLowerCase();
                    }
                    
                    if (aVal < bVal) {
                      return sortConfig.direction === 'asc' ? -1 : 1;
                    }
                    if (aVal > bVal) {
                      return sortConfig.direction === 'asc' ? 1 : -1;
                    }
                    return 0;
                  });
                }
                
                console.log(`Total rows generated: ${rows.length}`)
                const start = (page - 1) * pageSize
                const visible = rows.slice(start, start + pageSize)
                    console.log(`Visible rows: ${visible.length} (page ${page}, pageSize ${pageSize})`)
                    
                    if (visible.length === 0) {
                      return (
                        <tr>
                          <td colSpan={22} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <Target size={48} className="text-gray-300 mb-4" />
                              <h3 className="text-lg font-medium text-gray-500 mb-2">暂无数据</h3>
                              <p className="text-sm text-gray-400">
                                当前筛选条件下没有找到部门目标分解数据，请调整筛选条件或新增数据
                              </p>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    
                    return visible.map((row, idx) => (
                      <tr key={`${row.department}-${row.level}-${row.target_name}-${idx}`} className="odd:bg-white even:bg-gray-50 hover:bg-gradient-to-r from-blue-50/30 to-purple-50/30 transition-all duration-200 group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 group-hover:border-purple-100">
                              <span className={`text-ellipsis cell-limit ${cellTextClass('部门')}`} title={row.department}>{truncate(row.department)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 group-hover:border-purple-100">
                              <span className={`text-ellipsis cell-limit ${cellTextClass('类别')}`} title={targetTypeLabelMap[row.target_type] || row.target_type}>
                                {truncate(targetTypeLabelMap[row.target_type] || row.target_type, 4)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 group-hover:border-green-100">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {row.level}-{levelLabels[row.level]}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100">
                              <span className={`text-ellipsis cell-limit ${cellTextClass('目标名称')}`} title={row.target_name}>{truncate(row.target_name, 4)}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100">
                              <span className={`text-ellipsis cell-limit ${cellTextClass('单位')}`} title={row.unit}>{truncate(row.unit)}</span>
                            </td>
                            {(() => {
                              const uniqueQuarters = [...new Set(row.records.map(r => r.quarter).filter(Boolean))]
                              // Sort quarters naturally if possible (Q1, Q2, Q3, Q4)
                              uniqueQuarters.sort()
                              const qs = uniqueQuarters.join(', ') || '-'
                              return (
                                <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100">
                                  <span className={`text-ellipsis cell-limit ${cellTextClass('季度')}`} title={qs}>{truncate(qs)}</span>
                                </td>
                              )
                            })()}
                            <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100">
                              <span className={`text-ellipsis cell-limit ${cellTextClass('负责人')}`} title={row.responsible_person}>{truncate(row.responsible_person)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center border-b border-gray-100 group-hover:border-orange-100">
                              <span className={cellTextClass('年度全年目标')}>
                                {row.records.reduce((sum, t) => sum + Number(t.target_value || 0), 0)}
                              </span>
                            </td>
                            {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                              const rec = row.records.find(r => r.month === month)
                              const val = rec ? Number(rec.target_value) : 0
                              return (
                                <td key={month} className="px-4 py-4 text-center text-sm text-gray-600 border-b border-gray-100 group-hover:border-gray-200">
                                  <div className={`inline-flex items-center px-2 py-1 rounded-lg font-medium ${
                                    val > 0 
                                      ? (monthValueClassMap[month] || 'bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-200/50') 
                                      : 'bg-gray-50 text-gray-500 border border-gray-200 ring-1 ring-gray-200/50'
                                  }`}>
                                    {val > 0 ? val : '-'}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-bold border-b border-gray-100 group-hover:border-orange-100">
                              <span className={cellTextClass('合计')}>
                                {row.records.reduce((sum, t) => sum + Number(t.target_value || 0), 0)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              <span className={cellTextClass('当前值')}>
                                {row.records.reduce((sum, t) => sum + (t.current_value !== null ? Number(t.current_value) : 0), 0)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              <span className={cellTextClass('进度（%）')}>
                                {(() => {
                                  const totalTarget = row.records.reduce((sum, t) => sum + (t.target_value !== null ? Number(t.target_value) : 0), 0)
                                  const totalCurrent = row.records.reduce((sum, t) => sum + (t.current_value !== null ? Number(t.current_value) : 0), 0)
                                  const rate = totalTarget > 0 ? ((totalCurrent / totalTarget) * 100).toFixed(1) + '%' : '0%'
                                  return rate
                                })()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              {(() => {
                                const tar = row.records.reduce((sum, t) => sum + (t.target_value !== null ? Number(t.target_value) : 0), 0)
                                const cur = row.records.reduce((sum, t) => sum + (t.current_value !== null ? Number(t.current_value) : 0), 0)
                                const rate = tar > 0 ? (cur / tar) * 100 : 0
                                return renderStatusBadge(isNaN(rate) ? 0 : rate, null)
                              })()}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              <span className={`text-ellipsis cell-limit ${cellTextClass('描述')}`} title={row.description}>{truncate(row.description, 4)}</span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-sm"
                                  onClick={() => setDetailModal({ open: true, department: row.department, level: row.level })}
                                  title="查看"
                                  aria-label="查看"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-sm"
                                  onClick={() => {
                                    const currentMonth = new Date().getMonth() + 1;
                                    // 优先查找当前月份记录，如果没有则使用最近有数据的月份
                                    const sortedRecords = [...row.records].sort((a, b) => b.month - a.month);
                                    const existingRec = row.records.find(r => Number(r.month) === currentMonth) || sortedRecords[0];
                                    
                                    setEditingSeries(row.records);
                                    
                                    if (existingRec) {
                                      setNewTarget({ ...existingRec });
                                      setIsEditMode(true);
                                    } else {
                                      setNewTarget({ 
                                        department: row.department, 
                                        target_level: row.level, 
                                        target_type: row.target_type, 
                                        target_name: row.target_name, 
                                        target_value: '', 
                                        unit: row.unit, 
                                        quarter: '', 
                                        month: currentMonth, 
                                        current_value: '', 
                                        status: '',
                                        completion_rate: '0%', 
                                        responsible_person: row.responsible_person, 
                                        description: row.description 
                                      });
                                      setIsEditMode(false);
                                    }
                                    setShowAddTarget2025Modal(true);
                                  }}
                                  title="修改"
                                  aria-label="修改"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="p-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-sm"
                                  onClick={() => setDeleteDialog({ open: true, department: row.department, level: row.level })}
                                  title="删除"
                                  aria-label="删除"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                            
                          </tr>
                        ))
                  } catch (e) {
                    console.error('渲染表格失败:', e)
                    return []
                  }
                })()}
              </tbody>
            </table>
            </div>
            {(() => {
              try {
                const pairsCount = (() => {
                  let c = 0
                  tableData.departments.forEach((department) => {
                    tableData.levels.forEach((level) => {
                       const monthData = tableData.data[department]?.[level] || {}
                       const allTargets = Object.values(monthData).flat()
                       const uniqueKeys = new Set()
                       allTargets.forEach(t => {
                         if(t) uniqueKeys.add(`${t.target_name}-${t.target_type}`)
                       })
                       c += uniqueKeys.size
                    })
                  })
                  return c
                })()
                return (
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={pairsCount}
                    onChange={({ page: p, pageSize: s }) => { setPage(p); setPageSize(s) }}
                    pageSizeOptions={[10, 20, 50]}
                  />
                )
              } catch (e) {
                return null
              }
            })()}
          </div>
          <div className="p-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">总经办:</label>
                <input type="text" value={responsibleOwner} onChange={(e)=>setResponsibleOwner(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="填写总经办姓名" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">部门主管:</label>
                <input type="text" value={responsibleManager} onChange={(e)=>setResponsibleManager(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="填写部门主管姓名" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">制表:</label>
                <input type="text" value={responsibleVice} onChange={(e)=>setResponsibleVice(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="填写制表人姓名" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-gray-700 mb-1">本表年中各项指标需完成情况制作一次自我检核（本表年中会根据实际完成情况作一次目标调整）</label>
              <textarea value={selfCheckText} onChange={(e)=>setSelfCheckText(e.target.value)} className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="填写自我检核说明" />
            </div>
          </div>
          
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>部门目标</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>级别标识</span>
                </div>
              </div>
              <div>
                共 {Array.isArray(targets) ? targets.length : 0} 条记录 • 更新时间: {formatDateTime(new Date())}
              </div>
            </div>
          </div>
          
        </div>
      }

      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title={`${filters.year}年度部门目标分解`}
        data={targets}
        columns={pdfColumns}
        filename={`部门目标分解_${filters.year}年`}
        pageType="departmentTargets"
        year={filters.year}
      />

      {detailModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">详细目标</div>
                  <div className="text-sm text-white/80 mt-1 font-medium">{detailModal.department} • {detailModal.level}-{levelLabels[detailModal.level]}</div>
                </div>
              </div>
              <button 
                onClick={() => setDetailModal({ open: false, department: '', level: '' })} 
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-hidden flex flex-col flex-1 bg-gray-50/50">
              <div className="unified-table-container flex flex-col flex-1">
                <div className="unified-table-scroll flex-1">
                  <table className="unified-data-table w-full">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-5 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Hash size={16} className="text-blue-600" />
                            <span>ID</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Calendar size={16} className="text-blue-600" />
                            <span>年度</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-blue-100 to-blue-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Building size={16} className="text-blue-600" />
                            <span>部门</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-green-100 to-green-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Layers size={16} className="text-green-600" />
                            <span>级别</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-green-100 to-green-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Tag size={16} className="text-green-600" />
                            <span>类型</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-green-100 to-green-200 text-sm font-bold text-gray-800 text-left border-b border-gray-200 whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center space-x-2">
                            <Target size={16} className="text-green-600" />
                            <span>目标名称</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Package size={16} className="text-yellow-600" />
                            <span>单位</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <TrendingUp size={16} className="text-yellow-600" />
                            <span>目标值</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-indigo-100 to-purple-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Clock size={16} className="text-indigo-600" />
                            <span>季度</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-purple-100 to-indigo-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Calendar size={16} className="text-purple-600" />
                            <span>月份</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-teal-100 to-green-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Activity size={16} className="text-teal-600" />
                            <span>当前值</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-red-100 to-red-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <User size={16} className="text-red-600" />
                            <span>负责人</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-green-100 to-emerald-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <Percent size={16} className="text-green-600" />
                            <span>完成率</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-yellow-100 to-amber-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <List size={16} className="text-yellow-600" />
                            <span>状态</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-red-100 to-red-200 text-sm font-bold text-gray-800 text-center border-b border-gray-200 whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center justify-center space-x-2">
                            <FileText size={16} className="text-red-600" />
                            <span>描述</span>
                          </div>
                        </th>
                        <th className="px-6 py-5 bg-gradient-to-r from-gray-100 to-gray-200 text-sm font-bold text-gray-800 text-center whitespace-nowrap border-b border-gray-200">
                          <div className="flex items-center justify-center space-x-2">
                            <Clock size={16} className="text-gray-600" />
                            <span>创建时间</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const flat = tableData.data[detailModal.department] && tableData.data[detailModal.department][detailModal.level]
                          ? Object.values(tableData.data[detailModal.department][detailModal.level]).flat()
                          : []
                        return flat.map((t, i) => {
                          const tar = t?.target_value || 0
                          const cur = t?.current_value || 0
                          const rate = t?.completion_rate || (tar > 0 ? ((cur / tar) * 100).toFixed(1) + '%' : '0%')
                          return (
                            <tr key={t?.id ?? i} className="group transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-purple-50/80">
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-600">{t?.id ?? '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-700 font-medium">{t?.year ?? '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-700">{t?.department || detailModal.department || '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-700">{t?.target_level || detailModal.level ? `${t?.target_level || detailModal.level}-${levelLabels[t?.target_level || detailModal.level]}` : '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm">
                                  {targetTypeLabelMap[t?.target_type] || t?.target_type || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-1 text-left whitespace-nowrap text-gray-800 font-semibold">{t?.target_name || '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-600">{t?.unit || '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-900 font-bold">{t?.target_value ?? '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-600">{t?.quarter || '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-600">{t?.month ?? '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-900 font-medium">{t?.current_value ?? '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-700">{t?.responsible_person || '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap font-bold text-blue-600">{rate}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap">
                                {(() => {
                                  const tar = t?.target_value || 0
                                  const cur = t?.current_value || 0
                                  const progress = tar > 0 ? (cur / tar) * 100 : 0
                                  return renderStatusBadge(progress, null)
                                })()}
                              </td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-500 italic max-w-[200px] truncate" title={t?.description}>{t?.description || '-'}</td>
                              <td className="px-6 py-1 text-center whitespace-nowrap text-gray-400">{formatDateTime(t?.created_at)}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end shrink-0 z-10">
              <button 
                onClick={() => setDetailModal({ open: false, department: '', level: '' })} 
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium shadow-sm transition-all duration-200 hover:shadow"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}



      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, department: '', level: '' })}
        onConfirm={async () => {
          try {
            const flat = tableData.data[deleteDialog.department] && tableData.data[deleteDialog.department][deleteDialog.level]
              ? Object.values(tableData.data[deleteDialog.department][deleteDialog.level]).flat()
              : []
            const ids = flat.map(t => t?.id).filter(Boolean)
            if (!ids.length) {
              toast.error('没有可删除的记录')
              await loadTargets()
              return
            }
            const results = await Promise.all(ids.map(id => deleteDepartmentTarget(id)))
            const allOk = results.every(r => r && r.success)
            if (allOk) {
              setTargets(prev => prev.filter(t => !ids.includes(t.id)))
              toast.success('已删除该组目标')
              await loadTargets()
            } else {
              toast.error('部分或全部删除失败')
            }
          } catch (e) {
            toast.error('删除失败')
          }
        }}
        title="确认删除该组目标"
        message={`将删除 ${deleteDialog.department} • ${deleteDialog.level}-${levelLabels[deleteDialog.level]} 的所有目标记录，操作不可恢复。`}
        itemName={`${deleteDialog.department}（${deleteDialog.level}-${levelLabels[deleteDialog.level]}）`}
      />
      
      
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
                      {filters.year === y ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">当前</span>
                      ) : (
                        <button
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                          onClick={() => { setGlobalYear(y); persistSelectedYear(y, true) }}
                        >设为当前</button>
                      )}
                      <button
                        onClick={() => {
                          const next = years.filter(v=>v!==y)
                          const fallback = next[next.length-1] || new Date().getFullYear()
                          if (next.length === 0) {
                            setYears([fallback])
                            persistYears([fallback])
                          } else {
                            setYears(next)
                            persistYears(next)
                          }
                          if (filters.year===y) {
                            setGlobalYear(fallback)
                            persistSelectedYear(fallback, true)
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

      {showAddTarget2025Modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
            <div className="relative p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 shrink-0 z-10 flex items-center justify-between">
              <div className="flex items-center justify-between gap-3 w-full mr-8">
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-white truncate">{isEditMode ? '编辑' : '新增'}{newTarget.year || filters.year}年度目标分解</div>
                  <div className="text-white/80 mt-1 text-sm truncate">请填写必填项（*），确保目标信息准确</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                   <div className="bg-white/20 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">{newTarget.year || filters.year}年</div>
                </div>
              </div>
              <button onClick={() => { setShowAddTarget2025Modal(false); setIsEditMode(false); }} className="absolute right-4 top-6 text-white/80 hover:text-white transition-colors" title="关闭">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {alert.show && (
                <InlineAlert
                  message={alert.message}
                  type={alert.type}
                  onClose={() => setAlert({ ...alert, show: false })}
                  className="mb-4"
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-field-container">
                  <label className="form-field-label">部门<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <select value={newTarget.department || ''} onChange={(e)=>setNewTarget(prev=>({ ...prev, department: e.target.value }))} onBlur={() => validateField('department', newTarget.department)} className={`w-full px-3 py-2 border rounded-xl transition-all duration-200 placeholder-gray-400 pr-10 h-10 shadow-sm appearance-none bg-white focus:outline-none ${errors.department ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}>
                      <option value="">请选择</option>
                      {departments.filter(d => !d.name.includes('公司')).map(d => (<option key={d.id} value={d.name}>{d.name}</option>))}
                    </select>
                  </div>
                  {errors.department && <div className="form-field-error">{errors.department}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">级别<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <select value={newTarget.target_level || ''} onChange={(e)=>setNewTarget(prev=>({ ...prev, target_level: e.target.value }))} onBlur={() => validateField('target_level', newTarget.target_level)} className={`w-full px-3 py-2 border rounded-xl transition-all duration-200 placeholder-gray-400 pr-10 h-10 shadow-sm appearance-none bg-white focus:outline-none ${errors.target_level ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}>
                      <option value="">请选择</option>
                      {['A','B','C','D'].map(l => (<option key={l} value={l}>{l}-{levelLabels[l]}</option>))}
                    </select>
                  </div>
                  {errors.target_level && <div className="form-field-error">{errors.target_level}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">目标类型<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <select value={newTarget.target_type || ''} onChange={handleTargetTypeChange} onBlur={() => validateField('target_type', newTarget.target_type)} className={`w-full px-3 py-2 border rounded-xl transition-all duration-200 placeholder-gray-400 pr-10 h-10 shadow-sm appearance-none bg-white focus:outline-none ${errors.target_type ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}`}>
                      <option value="">请选择</option>
                      <option value="sales">销售</option>
                      <option value="profit">利润</option>
                      <option value="project">项目</option>
                      <option value="efficiency">效率</option>
                      <option value="quality">质量</option>
                      <option value="cost">成本</option>
                      {customTargetTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                      <option value="custom">+ 自定义类型</option>
                    </select>
                  </div>
                  {errors.target_type && <div className="form-field-error">{errors.target_type}</div>}
                  
                  {showCustomTypeInput && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={customTypeInput}
                        onChange={handleCustomTypeInput}
                        placeholder="请输入自定义目标类型"
                        className={`flex-1 px-3 py-2 border rounded-xl transition-all duration-200 placeholder-gray-400 h-10 shadow-sm bg-white focus:outline-none ${customTypeError ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            confirmCustomType()
                          }
                        }}
                      />
                      <button
                        onClick={confirmCustomType}
                        className="h-10 px-4 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
                      >
                        确认
                      </button>
                      {customTypeError && <span className="text-red-500 text-xs whitespace-nowrap">{customTypeError}</span>}
                    </div>
                  )}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">目标名称</label>
                  <div className="form-field-input-wrapper">
                    <input value={newTarget.target_name} onChange={(e)=>setNewTarget(prev=>({ ...prev, target_name: e.target.value }))} className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 focus:outline-none ${errors.target_name ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`} />
                  </div>
                  {errors.target_name && <div className="form-field-error">{errors.target_name}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">目标值<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <input value={newTarget.target_value} onChange={(e)=>{
                      const expected = parseFloat(e.target.value)
                      const actual = parseFloat(newTarget.current_value)
                      let p = 0
                      if (!isNaN(expected) && !isNaN(actual) && expected !== 0) {
                        p = (actual / expected) * 100
                      }
                      p = parseFloat(p.toFixed(2))
                      const normalizedP = normalizeProgress(p)
                      // 使用当前日期作为状态计算依据
                      const currentDate = new Date()
                      const s = computeStatus(normalizedP, currentDate)
                      setNewTarget(prev=>({ ...prev, target_value: e.target.value, completion_rate: `${normalizedP}%`, status: s }))
                    }} onBlur={() => validateField('target_value', newTarget.target_value)} className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 focus:outline-none ${errors.target_value ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`} />
                  </div>
                  {errors.target_value && <div className="form-field-error">{errors.target_value}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">单位<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <input value={newTarget.unit} onChange={(e)=>setNewTarget(prev=>({ ...prev, unit: e.target.value }))} onBlur={() => validateField('unit', newTarget.unit)} className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 focus:outline-none ${errors.unit ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'}`} />
                  </div>
                  {errors.unit && <div className="form-field-error">{errors.unit}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">季度<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <select value={newTarget.quarter || ''} onChange={(e)=>setNewTarget(prev=>({ ...prev, quarter: e.target.value, month: '' }))} onBlur={() => validateField('quarter', newTarget.quarter)} className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 pr-10 h-10 shadow-sm appearance-none bg-white focus:outline-none ${errors.quarter ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}>
                      <option value="">请选择</option>
                      <option value="Q1">第一季度</option>
                      <option value="Q2">第二季度</option>
                      <option value="Q3">第三季度</option>
                      <option value="Q4">第四季度</option>
                    </select>
                  </div>
                  {errors.quarter && <div className="form-field-error">{errors.quarter}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">月份<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <select value={newTarget.month || ''} onChange={(e)=>{
                      const m = Number(e.target.value);
                      if (editingSeries && editingSeries.length > 0) {
                        const found = editingSeries.find(r => Number(r.month) === m);
                        if (found) {
                          setNewTarget({ ...found });
                          setIsEditMode(true);
                        } else {
                          setNewTarget(prev => ({
                            ...prev,
                            id: undefined,
                            month: m,
                            target_value: '',
                            current_value: '',
                            status: '',
                            completion_rate: '0%'
                          }));
                          setIsEditMode(false);
                        }
                      } else {
                        setNewTarget(prev => ({ ...prev, month: m }));
                      }
                    }} onBlur={() => validateField('month', newTarget.month)} className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 pr-10 h-10 shadow-sm appearance-none bg-white focus:outline-none ${errors.month ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}>
                      <option value="">请选择</option>
                      {(newTarget.quarter ? (
                        newTarget.quarter === 'Q1' ? [1, 2, 3] :
                        newTarget.quarter === 'Q2' ? [4, 5, 6] :
                        newTarget.quarter === 'Q3' ? [7, 8, 9] :
                        [10, 11, 12]
                      ) : Array.from({length: 12}, (_, i) => i + 1)).map(m => (
                        <option key={m} value={m}>{m}月</option>
                      ))}
                    </select>
                  </div>
                  {errors.month && <div className="form-field-error">{errors.month}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">
                    当前值
                    {/* 移除2026年的红色星号 */}
                  </label>
                  <div className="form-field-input-wrapper">
                    <input value={newTarget.current_value} onChange={(e)=>{
                      const actual = parseFloat(e.target.value)
                      const expected = parseFloat(newTarget.target_value)
                      let p = 0
                      if (!isNaN(expected) && !isNaN(actual) && expected !== 0) {
                        p = (actual / expected) * 100
                      }
                      p = parseFloat(p.toFixed(2))
                      const normalizedP = normalizeProgress(p)
                      // 使用当前日期作为状态计算依据
                      const currentDate = new Date()
                      const s = computeStatus(normalizedP, currentDate)
                      setNewTarget(prev=>({ ...prev, current_value: e.target.value, completion_rate: `${normalizedP}%`, status: s }))
                    }} onBlur={() => {
                      // 2026年不验证当前值
                      clearFieldError('current_value');
                    }} className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 focus:outline-none ${errors.current_value ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`} />
                  </div>
                  {errors.current_value && <div className="form-field-error">{errors.current_value}</div>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">进度（%）</label>
                  <div className="form-field-input-wrapper">
                    <input value={newTarget.completion_rate} disabled className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 focus:outline-none bg-gray-50 text-gray-700 border-gray-200 cursor-not-allowed`} />
                  </div>
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">状态</label>
                  <div className="form-field-input-wrapper flex items-center">
                    {renderStatusBadge(parseFloat(newTarget.completion_rate) || 0, null)}
                  </div>
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">负责人<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span></label>
                  <div className="form-field-input-wrapper">
                    <input value={newTarget.responsible_person} onChange={(e)=>setNewTarget(prev=>({ ...prev, responsible_person: e.target.value }))} onBlur={() => validateField('responsible_person', newTarget.responsible_person)} className={`w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 focus:outline-none ${errors.responsible_person ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'}`} />
                  </div>
                  {errors.responsible_person && <div className="form-field-error">{errors.responsible_person}</div>}
                </div>
              </div>
              <div className="form-field-container">
                <label className="form-field-label">描述</label>
                <div className="form-field-input-wrapper">
                  <textarea value={newTarget.description} onChange={(e)=>setNewTarget(prev=>({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 focus:outline-none border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" rows={4} />
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => { setShowAddTarget2025Modal(false); setIsEditMode(false); clearErrors(); }} className="h-10 px-4 bg-white border border-gray-300 rounded-xl">取消</button>
              <button onClick={async () => {
                const year = newTarget.year || filters.year;
                let isValid = true;
                clearErrors();
                const requiredFields = [
                  { key: 'department', label: '部门' },
                  { key: 'target_level', label: '级别' },
                  { key: 'target_type', label: '目标类型' },
                  { key: 'target_value', label: '目标值' },
                  { key: 'unit', label: '单位' },
                  { key: 'quarter', label: '季度' },
                  { key: 'month', label: '月份' },
                  { key: 'responsible_person', label: '负责人' }
                ];
                requiredFields.forEach(({ key, label }) => {
                  const value = newTarget[key];
                  const empty = value === undefined || value === null || value.toString().trim() === '';
                  if (empty) {
                    if (setFieldError) {
                      setFieldError(key, `${label}不能为空`);
                    }
                    isValid = false;
                  } else if (clearFieldError) {
                    clearFieldError(key);
                  }
                });
                if (!isValid) {
                  showAlertMessage('请检查表单，有字段需要修正', 'error');
                  return;
                }
                
                // 计算进度和状态
                const actual = parseFloat(newTarget.current_value)
                const expected = parseFloat(newTarget.target_value)
                let p = 0
                if (!isNaN(expected) && !isNaN(actual) && expected !== 0) {
                  p = (actual / expected) * 100
                }
                p = parseFloat(p.toFixed(2))
                const normalizedP = normalizeProgress(p)
                // 使用当前日期作为状态计算依据
                const currentDate = new Date()
                const computedStatus = computeStatus(normalizedP, currentDate)
                
                const dept = departments.find(d => d.name === newTarget.department)        
                const payload = {
                  year: year,
                  department_id: dept ? dept.id : undefined,
                  target_level: newTarget.target_level,
                  target_type: newTarget.target_type,
                  target_name: newTarget.target_name,
                  target_value: Number(newTarget.target_value),
                  unit: newTarget.unit,
                  quarter: newTarget.quarter,
                  month: Number(newTarget.month),
                  current_value: year === 2025 ? (newTarget.current_value ? Number(newTarget.current_value) : null) : (newTarget.current_value ? Number(newTarget.current_value) : 0),
                  status: computedStatus,
                  completion_rate: `${normalizedP}%`,
                  responsible_person: newTarget.responsible_person,
                  description: newTarget.description || ''
                }
                
                if (isEditMode && newTarget.id) {
                  await updateDepartmentTarget(newTarget.id, payload)
                  toast.success(`已更新 ${newTarget.year || filters.year} 年度目标分解`)
                } else {
                  await addDepartmentTarget(payload)
                  toast.success(`已新增 ${newTarget.year || filters.year} 年度目标分解`)
                }
                
                await loadTargets()
                setShowAddTarget2025Modal(false)
                setIsEditMode(false)
                setNewTarget({ department: '', target_level: '', target_type: '', target_name: '', target_value: '', unit: '', quarter: '', month: '', current_value: '', completion_rate: '', responsible_person: '', description: '' })
              }} className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700">保存</button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}

export default DepartmentTargets
