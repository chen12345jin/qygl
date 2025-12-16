import React, { useState, useEffect, useMemo } from 'react'
import TableManager from '../components/TableManager'
import FormField from '../components/FormField'
import { useData } from '../contexts/DataContext'
import { Calendar, Filter, Plus, X, Trash2, Download, Upload, RefreshCcw, FileText } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/export'
import PrintPreview from '../components/PrintPreview'
import { normalizeProgress, computeActionPlanStatus } from '../utils/status'
import toast from 'react-hot-toast'
import CustomSelect from '../components/CustomSelect'

const AnnualWorkPlan = () => {
  const { 
    globalYear, setGlobalYear,
    getAnnualWorkPlans, addAnnualWorkPlan, updateAnnualWorkPlan, deleteAnnualWorkPlan, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting 
  } = useData()
  
  const head = (s) => s

  const [plans, setPlans] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [years, setYears] = useState([2024, 2025, 2026])
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  
  const [filters, setFilters] = useState({
    year: globalYear,
    department: '',
    category: '',
    status: '',
    month: '',
    priority: ''
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  // Sync globalYear to filters.year
  useEffect(() => {
    setFilters(prev => ({ ...prev, year: globalYear }))
  }, [globalYear])

  useEffect(() => {
    loadPlans()
    loadDepartments()
  }, [filters])

  useEffect(() => { setPage(1) }, [filters, plans.length])

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      if (d.room === 'annualWorkPlans') {
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
    if (filters.year && yearChangeByUser) {
      persistSelectedYear(filters.year, true)
      setYearChangeByUser(false)
    }
  }, [filters.year, yearChangeByUser])

  const loadPlans = async () => {
    const result = await getAnnualWorkPlans(filters)
    if (result.success) {
      const processed = (result.data || []).map(item => {
        let remarks = item.remarks || ''
        // Try to parse JSON remarks if it looks like JSON
        if (remarks && typeof remarks === 'string' && (remarks.startsWith('{') || remarks.startsWith('['))) {
          try {
            const parsed = JSON.parse(remarks)
            if (parsed && typeof parsed === 'object') {
              // If it has a 'remarks' field, use that. Otherwise, keep original string or handle differently if needed.
              // For now, we assume if it was our previous JSON structure, we want parsed.remarks
              if (parsed.remarks !== undefined) {
                remarks = parsed.remarks
              }
            }
          } catch (e) {
            // parsing failed, keep original string
          }
        }

        // Fix for legacy data: infer month from plan_name if month is missing
        let m = item.month;
        if (!m && item.plan_name) {
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
           if (map[item.plan_name]) m = map[item.plan_name];
        }

        // 自动计算进度：基于预算和实际成本
        let progress = 0;
        const budget = parseFloat(item.budget) || 0;
        const actualCost = parseFloat(item.actual_cost) || 0;
        
        if (budget > 0 && actualCost > 0) {
          // 进度 = 实际成本 / 预算 * 100%
          progress = (actualCost / budget) * 100;
        }
        
        progress = normalizeProgress(progress);
        
        // 基于进度和结束日期计算状态
        const status = computeStatus(progress, item.end_date);

        // Mapping for Annual Planning Table data (sheet_type: 'planning')
        if (item.sheet_type === 'planning') {
            const y = item.year || new Date().getFullYear();
            // Use inferred month if available
            m = m || 1;
            // Handle date construction safely
            let startDate = item.start_date;
            let endDate = item.end_date;
            
            if (!startDate) {
                const d = new Date(y, m - 1, 1);
                // Adjust for timezone offset to avoid previous day issue if using toISOString() directly on local midnight
                // Simple formatting YYYY-MM-DD
                startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            if (!endDate) {
                const d = new Date(y, m, 0);
                endDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }

            return {
                ...item,
                month: m,
                plan_name: item.theme || item.plan_name || '未命名规划',
                department: item.department_name || item.department || '公司',
                category: item.category || 'strategic', // Default to Strategic
                priority: item.priority || 'high',
                start_date: startDate,
                end_date: endDate,
                responsible_person: item.responsible || item.responsible_person || '',
                expected_result: item.expected_result,
                actual_result: item.actual_result,
                description: item.description || `目标: ${item.goals || '无'}\n任务: ${item.tasks || '无'}\n资源: ${item.resources || '无'}`,
                progress: progress,
                status: status,
                remarks: remarks || item.notes || (item.timeline ? `时间轴: ${item.timeline}` : '')
            };
        }
        
        return {
          ...item,
          month: m,
          department: item.department_name || item.department || '', // Ensure department field is populated for form edit
          expected_result: item.expected_result,
          actual_result: item.actual_result,
          progress: progress,
          status: status,
          remarks: remarks
        }
      })
      setPlans(processed)
    }
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

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

  const handleAdd = async (data) => {
    const selectedDept = departments.find(dept => dept.name === data.department)

    // 自动计算进度：基于预算和实际成本
    let progress = 0;
    const budget = data.budget ? parseFloat(data.budget) : 0;
    const actualCost = data.actual_cost ? parseFloat(data.actual_cost) : 0;
    
    if (budget > 0 && actualCost > 0) {
      // 进度 = 实际成本 / 预算 * 100%
      progress = (actualCost / budget) * 100;
    }
    
    progress = normalizeProgress(progress);
    
    // 基于进度和结束日期计算状态
    const status = computeStatus(progress, data.end_date);

    const planData = {
      year: filters.year,
      month: data.month || null,
      department_id: selectedDept ? selectedDept.id : null,
      department_name: data.department || '',
      plan_name: data.plan_name || '',
      category: data.category || '',
      priority: data.priority || '',
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      budget: budget || null,
      actual_cost: actualCost || null,
      status: status,
      expected_result: data.expected_result !== undefined && data.expected_result !== null && data.expected_result !== '' ? parseFloat(data.expected_result) : null,
      actual_result: data.actual_result !== undefined && data.actual_result !== null && data.actual_result !== '' ? parseFloat(data.actual_result) : null,
      progress: progress,
      responsible_person: data.responsible_person || '',
      description: data.description || data.expected_outcome || '',
      sheet_type: 'planning',
      remarks: data.remarks || ''
    }

    const result = await addAnnualWorkPlan(planData)
    if (result.success) {
      loadPlans()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    const selectedDept = departments.find(dept => dept.name === data.department)

    // 自动计算进度：基于预算和实际成本
    let progress = 0;
    const budget = data.budget ? parseFloat(data.budget) : 0;
    const actualCost = data.actual_cost ? parseFloat(data.actual_cost) : 0;
    
    if (budget > 0 && actualCost > 0) {
      // 进度 = 实际成本 / 预算 * 100%
      progress = (actualCost / budget) * 100;
    }
    
    progress = normalizeProgress(progress);
    
    // 基于进度和结束日期计算状态
    const status = computeStatus(progress, data.end_date);

    const planData = {
      year: data.year || filters.year,
      month: data.month || null,
      department_id: selectedDept ? selectedDept.id : null,
      department_name: data.department || '',
      plan_name: data.plan_name || '',
      category: data.category || '',
      priority: data.priority || '',
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      budget: data.budget ? parseFloat(data.budget) : null,
      actual_cost: data.actual_cost ? parseFloat(data.actual_cost) : null,
      status: status,
      expected_result: data.expected_result !== undefined && data.expected_result !== null && data.expected_result !== '' ? parseFloat(data.expected_result) : null,
      actual_result: data.actual_result !== undefined && data.actual_result !== null && data.actual_result !== '' ? parseFloat(data.actual_result) : null,
      progress: progress,
      responsible_person: data.responsible_person || '',
      description: data.description || data.expected_outcome || '',
      sheet_type: data.sheet_type || 'planning',
      remarks: data.remarks || ''
    }

    const result = await updateAnnualWorkPlan(id, planData)
    if (result.success) {
      loadPlans()
      setEditingId(null)
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteAnnualWorkPlan(id)
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
    newData.plan_name = `${newData.plan_name}_副本`
    newData.year = filters.year
    handleAdd(newData)
  }

  const getFilterCount = () => {
    let count = 0
    if (filters.year && filters.year !== globalYear) count++
    if (filters.department) count++
    if (filters.category) count++
    if (filters.status) count++
    if (filters.month) count++
    if (filters.priority) count++
    return count
  }
  const filterCount = getFilterCount()

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
          department: p.department_name || p.department || '',
          event_name: p.plan_name,
          month: p.month,
          event_type: p.category,
          importance: p.priority,
          occurred_at: p.start_date,
          closed_at: p.end_date,
          impact_amount: p.budget,
          status: p.status,
          owner: p.responsible_person,
          review_points: p.description
        }))
        exportToExcel(exportData, `年度工作规划_${filters.year}年`, '年度工作规划', 'annualWorkPlans')
        toast.success(`已导出 ${exportData.length} 条到 Excel`, { id: toastId })
      } catch (error) {
        console.error('导出Excel失败:', error)
        toast.error('导出失败，请稍后重试', { id: toastId })
      }
    }, 100)
  }

  const resetFilters = () => {
    setFilters(prev => ({
      ...prev,
      department: '',
      category: '',
      status: '',
      month: '',
      priority: ''
    }))
    toast.success('已重置筛选')
  }

  const handleImportFromExcel = async (file) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)
      for (const row of rows) {
        const payload = {
          year: Number(row['年度'] || filters.year),
          department: row['部门'] || '',
          plan_name: row['计划名称'] || row['事件名称'] || '',
          month: row['月份'] ? Number(row['月份']) : null,
          category: row['类别'] || row['事件类型'] || '',
          priority: row['优先级'] || row['重要级别'] || '',
          start_date: row['开始日期'] || row['发生日期'] || '',
          end_date: row['结束日期'] || row['关闭日期'] || '',
          budget: row['预算（万元）'] ? Number(row['预算（万元）']) : null,
          actual_cost: row['实际成本（万元）'] ? Number(row['实际成本（万元）']) : null,
          status: row['状态'] || '',
          expected_result: row['预期结果'] ? Number(row['预期结果']) : null,
          actual_result: row['实际结果'] ? Number(row['实际结果']) : null,
          progress: row['进度'] ? Number(row['进度']) : null,
          responsible_person: row['负责人'] || '',
          description: row['预期成果'] || row['复盘要点'] || ''
        }
        await addAnnualWorkPlan(payload)
      }
      await loadPlans()
      toast.success('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      toast.error('导入失败，请检查文件格式')
    }
  }

  const columns = useMemo(() => {
    const THEMES = ['规划导航月', '招聘月', '人才引备战月', '产品月', '产品月', '年中总结月', '学习月', '备战月', '抢战月', '丰收月', '冲刺月', '总结月']
    
    const getMonthRange = (month, year) => {
      const m = parseInt(month)
      if (!m || isNaN(m) || m < 1 || m > 12) return { min: `${year}-01-01`, max: `${year}-12-31` }
      const lastDay = new Date(year, m, 0).getDate()
      const min = `${year}-${String(m).padStart(2, '0')}-01`
      const max = `${year}-${String(m).padStart(2, '0')}-${lastDay}`
      return { min, max }
    }

    const base = [
      { 
        key: 'year', 
        label: head('年份'), 
        type: 'select',
        options: years.map(y => ({ value: y, label: `${y}年` })),

        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200',
        onChange: (value, setFormData, formData) => {
          setFormData(prev => {
            const newData = { ...prev, year: value }
            if (newData.month) {
              const { min, max } = getMonthRange(newData.month, value)
              newData.start_date = min
              newData.end_date = max
            }
            return newData
          })
        }
      },
      {
        key: 'month',
        label: head('月份/主题'),
        type: 'select',
        options: THEMES.map((t, i) => ({ value: i + 1, label: `${i + 1}月 - ${t}` })),
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200',
        onChange: (value, setFormData, formData) => {
          const y = formData.year || filters.year
          const { min, max } = getMonthRange(value, y)
          setFormData(prev => ({
             ...prev,
             month: value,
             start_date: min,
             end_date: max
          }))
        },
        render: (value) => {
          if (!value) return '-'
          const t = THEMES[value - 1]
          return `${value}月${t ? ` (${t})` : ''}`
        }
      },
      { 
        key: 'plan_name', 
        label: head('计划名称'), 
        type: 'text',
        required: true, 
        headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200'
      },
      { 
        key: 'department', 
        label: head('负责部门'), 
        type: 'select',
        options: departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name })),
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' 
      },
      { 
        key: 'category', 
        label: head('类别'), 
        type: 'select',
        options: [
          { value: 'strategic', label: '战略性事件' },
          { value: 'operational', label: '运营性事件' },
          { value: 'risk', label: '风险性事件' },
          { value: 'opportunity', label: '机会性事件' },
          { value: 'business', label: '业务性事件' },
          { value: 'management', label: '管理性事件' },
          { value: 'temporary', label: '临时性事件' }
        ],
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200',
        render: (value) => {
          const map = {
            'strategic': '战略性事件',
            'strateg': '战略性事件',
            'operational': '运营性事件',
            'risk': '风险性事件',
            'opportunity': '机会性事件',
            'business': '业务性事件',
            'management': '管理性事件',
            'temporary': '临时性事件'
          }
          return map[String(value || '').toLowerCase()] || value
        }
      },
      { 
        key: 'priority', 
        label: head('优先级'), 
        type: 'select',
        options: [
          { value: 'critical', label: '非常重要' },
          { value: 'high', label: '重要' },
          { value: 'medium', label: '一般' },
          { value: 'low', label: '较低' }
        ],
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200',
        render: (value) => {
          const v = String(value || '').toLowerCase()
          const map = {
            'critical': { label: '非常重要', cls: 'bg-purple-100 text-purple-800' },
            'high': { label: '重要', cls: 'bg-red-100 text-red-800' },
            'medium': { label: '一般', cls: 'bg-yellow-100 text-yellow-800' },
            'low': { label: '较低', cls: 'bg-green-100 text-green-800' }
          }
          const config = map[v] || { label: value || '较低', cls: 'bg-green-100 text-green-800' }
          return (
             <span className={`px-2 py-1 rounded-full text-xs ${config.cls}`}>
               {config.label}
             </span>
          )
        }
      },
      { 
        key: 'start_date', 
        label: head('开始日期'), 
        type: 'date',
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200'
      },
      { 
        key: 'end_date', 
        label: head('结束日期'), 
        type: 'date',
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200'
      },
      { key: 'budget', label: head('预算（万元）'), type: 'number', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200', onChange: (value, setFormData, formData) => {
        const budget = parseFloat(value) || 0;
        const actualCost = parseFloat(formData.actual_cost) || 0;
        let p = 0;
        if (budget > 0 && actualCost > 0) {
          p = (actualCost / budget) * 100;
        }
        p = parseFloat(p.toFixed(2));
        const normalizedP = normalizeProgress(p);
        const next = { ...formData, budget: value, progress: normalizedP };
        // 基于进度和结束日期计算状态
        const dateToUse = next.end_date || next.start_date;
        const s = computeStatus(normalizedP, dateToUse);
        setFormData({ ...next, status: s });
      } },
      { key: 'actual_cost', label: head('实际成本（万元）'), type: 'number', required: false, headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200', onChange: (value, setFormData, formData) => {
        const actualCost = parseFloat(value) || 0;
        const budget = parseFloat(formData.budget) || 0;
        let p = 0;
        if (budget > 0 && actualCost > 0) {
          p = (actualCost / budget) * 100;
        }
        p = parseFloat(p.toFixed(2));
        const normalizedP = normalizeProgress(p);
        const next = { ...formData, actual_cost: value, progress: normalizedP };
        // 基于进度和结束日期计算状态
        const dateToUse = next.end_date || next.start_date;
        const s = computeStatus(normalizedP, dateToUse);
        setFormData({ ...next, status: s });
      } },
      { key: 'responsible_person', label: head('负责人'), required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' },
      { 
        key: 'expected_result', 
        label: head('预期结果'), 
        type: 'number', 
        required: true, 
        headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200',
        onChange: (value, setFormData, formData) => {
          const expected = parseFloat(value)
          const actual = parseFloat(formData.actual_result)
          let p = 0
          if (!isNaN(expected) && !isNaN(actual) && expected !== 0) {
            p = (actual / expected) * 100
          }
          p = parseFloat(p.toFixed(2))
          const normalizedP = normalizeProgress(p)
          const next = { ...formData, expected_result: value, progress: normalizedP }
          // Status update logic skipped to preserve AnnualWorkPlan specific status flow
          setFormData(next)
        }
      },
      { 
        key: 'actual_result', 
        label: head('实际结果'), 
        type: 'number', 
   
        headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200',
        onChange: (value, setFormData, formData) => {
          const actual = parseFloat(value)
          const expected = parseFloat(formData.expected_result)
          let p = 0
          if (!isNaN(expected) && !isNaN(actual) && expected !== 0) {
            p = (actual / expected) * 100
          }
          p = parseFloat(p.toFixed(2))
          const normalizedP = normalizeProgress(p)
          const next = { ...formData, actual_result: value, progress: normalizedP }
          // Status update logic skipped to preserve AnnualWorkPlan specific status flow
          setFormData(next)
        }
      },
      { 
      key: 'progress', 
      label: head('进度（%）'), 
      type: 'number', 
      required: filters.year !== 2025,
      disabled: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-teal-100 to-teal-200 border-b border-gray-200 sticky top-0 z-10'
    },
    { 
      key: 'status', 
      label: head('状态'), 
      type: 'custom',
      required: false,
      options: [
        { value: 'not_started', label: '未开始' },
        { value: 'in_progress', label: '进行中' },
        { value: 'completed', label: '已完成' },
        { value: 'delayed', label: '延期' }
      ],
      headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200 sticky top-0 z-10',
      render: (value, item) => renderStatusBadge(item?.progress, item?.end_date),
      customField: ({ formData }) => (
        <div className="flex flex-col space-y-1">
          <div className="h-10 flex items-center">
            {renderStatusBadge(formData?.progress, formData?.end_date)}
          </div>
        </div>
      ),
      disabled: true
    },
      {
        key: 'description',
        label: head('预期成果'),
        type: 'textarea',

        headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200',
        render: (value) => <span title={value}>{value ? (value.length > 20 ? value.slice(0, 20) + '...' : value) : '-'}</span>
      },
      {
        key: 'remarks',
        label: head('备注'),
        type: 'textarea',
        required: false,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200',
        render: (value) => <span title={value}>{value ? (value.length > 20 ? value.slice(0, 20) + '...' : value) : '-'}</span>
      }
    ]

    // 默认所有字段必填，除了状态、进度和实际相关字段
    const allRequired = base.map(c => ({ ...c, required: (c.key === 'status' || c.key === 'progress') ? false : true }))

    // 所有年份，实际相关字段非必填
    const optionalKeys = ['actual_cost', 'actual_result', 'description', 'remarks']
    return allRequired.map(c => {
      if (optionalKeys.includes(c.key)) {
        return { ...c, required: false }
      }
      return c
    })
  }, [filters.year, departments, years])

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="年度工作落地规划"
        subTitle="制定和管理企业年度工作计划的具体落地实施方案"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setGlobalYear(y) }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
        right={null}
      />

      

      <div className="unified-table-wrapper">
        <TableManager
          title={`${filters.year}年度工作落地规划`}
          data={plans}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopy={handleCopy}
          editingId={editingId}
          onEditingChange={setEditingId}
          className="rounded-2xl"
          addMode="modal"
          addHeader={`新增${filters.year}年度工作落地规划`}
          addSubHeader="请填写必填项（*），提交前请确认日期与部门信息"
          prefill={{ year: filters.year, progress: 0 }}
          rowColorBy="category"
          rowColorMap={{
            strategic: 'bg-blue-100',
            '战略性事件': 'bg-blue-100',
            '战略': 'bg-blue-100',
            operational: 'bg-green-100',
            '运营性事件': 'bg-green-100',
            '运营': 'bg-green-100',
            project: 'bg-purple-100',
            '项目性事件': 'bg-purple-100',
            '项目': 'bg-purple-100',
            improvement: 'bg-orange-100',
            '机会性事件': 'bg-orange-100',
            '机会': 'bg-orange-100',
            risk: 'bg-red-100',
            '风险性事件': 'bg-red-100',
            '风险': 'bg-red-100'
          }}
          headerEllipsis={false}
          ellipsisAll={filters.year !== 2025}
          ellipsisChars={999}
          singleLineNoEllipsis={true}
          tableClassName="unified-data-table"
          tableContainerClassName="unified-table-scroll"
          headerActionsLeft={(
            <div className="flex flex-wrap items-center gap-2 mr-2">
              <button
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold relative"
                onClick={() => setFilterOpen(v => !v)}
                title="筛选"
              >
                <Filter size={16} />
                <span>筛选</span>
                {filterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white">
                    {filterCount}
                  </span>
                )}
              </button>
              <button
                className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold ${!(filters.department || filters.category || filters.status || filters.month) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={resetFilters}
                disabled={!(filters.department || filters.category || filters.status || filters.month)}
                title="重置筛选"
              >
                <RefreshCcw size={16} />
                <span>重置</span>
              </button>
              <button 
                className={`px-3 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold ${plans.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleExportToExcel}
                disabled={plans.length===0}
              >
                <Download size={16} />
                <span>导出Excel</span>
              </button>
              <button
                className={`px-3 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold ${plans.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setShowPrintPreview(true)}
                disabled={plans.length===0}
              >
                <FileText size={16} />
                <span>导出PDF</span>
              </button>
              <label htmlFor="import-annual-work" className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold cursor-pointer">
                <Upload size={16} />
                <span>导入Excel</span>
                <input id="import-annual-work" name="import-annual-work" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
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
          {filterOpen && (
            <div className="card p-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="panel-department" className="block text-sm font-medium text-gray-700 mb-1">负责部门</label>
                  <CustomSelect
                    value={filters.department}
                    onChange={(value) => setFilters({ ...filters, department: value })}
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
                  <label htmlFor="panel-category" className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                  <select id="panel-category" name="category"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">全部类型</option>
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
                  <label htmlFor="panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份/主题</label>
                  <select id="panel-month" name="month"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                    value={filters.month}
                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  >
                    <option value="">全部月份</option>
                    <option value="1">1月 - 规划导航月</option>
                    <option value="2">2月 - 招聘月</option>
                    <option value="3">3月 - 人才引备战月</option>
                    <option value="4">4月 - 产品月</option>
                    <option value="5">5月 - 产品月</option>
                    <option value="6">6月 - 年中总结月</option>
                    <option value="7">7月 - 学习月</option>
                    <option value="8">8月 - 备战月</option>
                    <option value="9">9月 - 抢战月</option>
                    <option value="10">10月 - 丰收月</option>
                    <option value="11">11月 - 冲刺月</option>
                    <option value="12">12月 - 总结月</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="panel-priority" className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                  <select id="panel-priority" name="priority"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all duration-200 text-sm"
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  >
                    <option value="">全部优先级</option>
                    <option value="critical">非常重要</option>
                    <option value="high">重要</option>
                    <option value="medium">一般</option>
                    <option value="low">较低</option>
                  </select>
                </div>
              </div>
              
            </div>
          )}
        </TableManager>
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

      {/* PDF打印预览 */}
      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title={`${filters.year}年度工作落地规划`}
        data={plans}
        columns={columns}
        filename={`年度工作落地规划_${filters.year}年`}
        pageType="annualWorkPlans"
        year={filters.year}
      />
    </div>
  )
}

export default AnnualWorkPlan
