import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import TableManager from '../components/TableManager'
import { useData } from '../contexts/DataContext'
import { AlertTriangle, Filter, RefreshCcw, Download, Upload, Plus, X, Trash2, FileText } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import { exportToExcel } from '../utils/export'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import PrintPreview from '../components/PrintPreview'
import { normalizeProgress, computeActionPlanStatus } from '../utils/status'
import CustomSelect from '../components/CustomSelect'

const MajorEvents = () => {
  const { globalYear, setGlobalYear, getMajorEvents, addMajorEvent, updateMajorEvent, deleteMajorEvent, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const { year: yearParam } = useParams()
  const [events, setEvents] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [filters, setFilters] = useState({
    year: globalYear,
    month: '',
    event_type: '',
    importance: '',
    status: '',
    responsible_department: ''
  })

  useEffect(() => {
    setFilters(prev => ({ ...prev, year: globalYear }))
  }, [globalYear])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [years, setYears] = useState([2024, 2025, 2026])
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [addTrigger, setAddTrigger] = useState(0)
  const [addPrefill, setAddPrefill] = useState(null)
  const importInputRef = useRef(null)
  const filterAnchorRef = useRef(null)
  const [filterPos, setFilterPos] = useState({ left: 0, top: 0 })

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {}
      if (d.room === 'majorEvents') {
        if (!d.year || d.year === filters.year) {
          loadEvents()
        }
      }
    }
    window.addEventListener('dataUpdated', handler)
    return () => window.removeEventListener('dataUpdated', handler)
  }, [filters.year])

  useEffect(() => {
    loadEvents()
    loadDepartments()
  }, [filters])

  useEffect(() => { setPage(1) }, [filters, events.length])

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
        if (!yearParam && currentYearSetting && (typeof currentYearSetting.value === 'number' || typeof currentYearSetting.value === 'string')) {
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

  useEffect(() => {
    if (yearParam) {
      const y = parseInt(yearParam)
      if (!isNaN(y)) {
        setGlobalYear(y)
      }
    }
  }, [yearParam])

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

  const loadEvents = async () => {
    const result = await getMajorEvents(filters)
    if (result.success) {
      const list = (result.data || []).map(e => {
        // 自动计算进度：实际成本 / 预算 * 100%
        const actualCost = parseFloat(e.actual_cost) || 0
        const budget = parseFloat(e.budget) || 0
        let progress = 0
        if (budget > 0 && !isNaN(actualCost)) {
          progress = (actualCost / budget) * 100
        }
        progress = parseFloat(progress.toFixed(2))
        const normalizedProgress = normalizeProgress(progress)
        
        // 计算状态
        const status = computeStatus(normalizedProgress, e.planned_date)
        
        return {
          ...e,
          responsible_department: e.responsible_department || e.department_name || e.department || '',
          progress: normalizedProgress,
          status
        }
      })
      setEvents(list)
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
    // 找到选中的部门信息
    const selectedDept = departments.find(dept => dept.name === data.responsible_department)
    
    // 如果没有选择部门，显示错误
    if (!selectedDept) {
      toast.error('请选择负责部门')
      return false
    }
    
    // 自动计算进度：实际成本 / 预算 * 100%
    const actualCost = parseFloat(data.actual_cost) || 0
    const budget = parseFloat(data.budget) || 0
    let progress = 0
    if (budget > 0 && !isNaN(actualCost)) {
      progress = (actualCost / budget) * 100
    }
    progress = parseFloat(progress.toFixed(2))
    const normalizedProgress = normalizeProgress(progress)
    
    // 计算状态
    const status = computeStatus(normalizedProgress, data.planned_date)
    
    const eventData = {
      ...data,
      year: Number(data.year || filters.year),
      department_id: selectedDept.id,
      // 保留名称以便前端显示
      responsible_department: selectedDept.name,
      expected_result: data.expected_result ? parseFloat(data.expected_result) : null,
      actual_result: data.actual_result ? parseFloat(data.actual_result) : null,
      budget: data.budget ? parseFloat(data.budget) : null,
      actual_cost: data.actual_cost ? parseFloat(data.actual_cost) : null,
      progress: normalizedProgress,
      status
    }
    const result = await addMajorEvent(eventData)
    if (result.success) {
      loadEvents()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleEdit = async (id, data) => {
    // 找到选中的部门信息
    const selectedDept = departments.find(dept => dept.name === data.responsible_department)
    
    // 如果没有选择部门，显示错误
    if (!selectedDept) {
      toast.error('请选择负责部门')
      return false
    }
    
    // 自动计算进度：实际成本 / 预算 * 100%
    const actualCost = parseFloat(data.actual_cost) || 0
    const budget = parseFloat(data.budget) || 0
    let progress = 0
    if (budget > 0 && !isNaN(actualCost)) {
      progress = (actualCost / budget) * 100
    }
    progress = parseFloat(progress.toFixed(2))
    const normalizedProgress = normalizeProgress(progress)
    
    // 计算状态
    const status = computeStatus(normalizedProgress, data.planned_date)
    
    const eventData = {
      ...data,
      department_id: selectedDept.id,
      // 保留名称以便前端显示
      responsible_department: selectedDept.name,
      expected_result: data.expected_result ? parseFloat(data.expected_result) : null,
      actual_result: data.actual_result ? parseFloat(data.actual_result) : null,
      budget: data.budget ? parseFloat(data.budget) : null,
      actual_cost: data.actual_cost ? parseFloat(data.actual_cost) : null,
      progress: normalizedProgress,
      status
    }
    const result = await updateMajorEvent(id, eventData)
    if (result.success) {
      loadEvents()
      setEditingId(null)
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteMajorEvent(id)
    if (result.success) {
      loadEvents()
      return true
    } else {
      // 错误信息已经在DataContext中通过toast显示了
      return false
    }
  }

  const handleCopy = (item) => {
    const newData = { ...item }
    delete newData.id
    newData.event_name = `${newData.event_name}_副本`
    newData.year = filters.year
    handleAdd(newData)
  }

  const getFilterCount = () => {
    let count = 0
    if (filters.event_type) count++
    if (filters.importance) count++
    if (filters.month) count++
    if (filters.responsible_department) count++
    if (filters.status) count++
    return count
  }
  const filterCount = getFilterCount()

  const handleExportToExcel = () => {
    if (!events || events.length === 0) {
      toast('当前没有可导出的数据', { icon: 'ℹ️' })
      return
    }

    const toastId = toast.loading('正在导出数据...', { duration: 0 })

    setTimeout(() => {
      try {
        const exportData = events.map(e => ({
          year: e.year,
          event_name: e.event_name,
          event_type: e.event_type,
          importance: e.importance,
          planned_date: e.planned_date,
          actual_date: e.actual_date,
          responsible_department: e.responsible_department,
          responsible_person: e.responsible_person,
          status: e.status,
          budget: e.budget,
          actual_cost: e.actual_cost,
          description: e.description
        }))
        exportToExcel(exportData, `大事件提炼_${filters.year}年`, '大事件提炼', 'majorEvents')
        toast.success(`已导出 ${exportData.length} 条到 Excel`, { id: toastId })
      } catch (error) {
        console.error('导出Excel失败:', error)
        toast.error('导出失败，请稍后重试', { id: toastId })
      }
    }, 100)
  }

  const handleImportFromExcel = async (file) => {
    try {
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(sheet)
          if (!rows || rows.length === 0) {
            toast('文件中没有数据', { icon: 'ℹ️' })
            return
          }
          let success = 0
          for (const row of rows) {
            const payload = {
              year: filters.year,
              event_name: row.event_name || row.事件名称 || '',
              event_type: row.event_type || row.事件类型 || '',
              importance: row.importance || row.重要性 || '',
              planned_date: row.planned_date || row.计划日期 || row.计划月份 || '',
              actual_date: row.actual_date || row.实际日期 || row.实际月份 || '',
              responsible_department: row.responsible_department || row.负责部门 || '',
              responsible_person: row.responsible_person || row.负责人 || '',
              status: row.status || row.状态 || '',
              progress: (row.progress ?? row['进度（%）'] ?? row['进度']) || '',
              budget: (row.budget ?? row['预算（万元）'] ?? row['预算']) || '',
              actual_cost: (row.actual_cost ?? row['实际成本（万元）'] ?? row['实际成本']) || '',
              description: row.description || row.事件描述 || '',
              key_points: row.key_points || row.关键要点 || '',
              success_criteria: row.success_criteria || row.成功标准 || '',
              risks: row.risks || row.风险因素 || '',
              lessons_learned: row.lessons_learned || row.经验教训 || ''
            }
            const ok = await handleAdd(payload)
            if (ok) success += 1
          }
          toast.success(`已导入 ${success}/${rows.length} 条`)
        } catch (err) {
          console.error('导入失败:', err)
          toast.error('导入失败，请检查文件格式')
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('读取文件失败:', error)
      toast.error('读取文件失败')
    }
  }

  const columns = useMemo(() => {
    const determineStatus = (rate) => {
      if (rate >= 100) return 'completed'
      if (rate > 0) return 'executing'
      return 'planning'
    }

    const base = [
      { 
        key: 'year', 
        label: '年份', 
        type: 'select',
        options: years.map(y => ({ value: y, label: `${y}年` })),
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200'
      },
      { key: 'event_name', label: '事件名称', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200' },
      { 
        key: 'event_type', 
        label: '事件类型', 
        type: 'select',
        options: [
          { value: 'strategic', label: '战略性事件' },
          { value: 'operational', label: '运营性事件' },
          { value: 'risk', label: '风险性事件' },
          { value: 'opportunity', label: '机会性事件' }
        ],
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200',
        render: (value) => {
          const k = String(value || '').trim().toLowerCase()
          const map = {
            strategic: '战略性事件',
            strateg: '战略性事件',
            operational: '运营性事件',
            operation: '运营性事件',
            risk: '风险性事件',
            opportunity: '机会性事件'
          }
          return map[k] || value
        }
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
        headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs ${
            value === 'critical' ? 'bg-red-100 text-red-800' :
            value === 'high' ? 'bg-orange-100 text-orange-800' :
            value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {value === 'critical' ? '非常重要' :
             value === 'high' ? '重要' :
             value === 'medium' ? '一般' : '较低'}
          </span>
        )
      },
      { 
        key: 'planned_date', 
        label: '计划日期', 
        type: 'date', 
        headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200'
      },
      { 
        key: 'actual_date', 
        label: '实际日期', 
        type: 'date', 
        headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200'
      },
      { 
        key: 'responsible_department', 
        label: '负责部门', 
        type: 'select',
        options: departments.filter(d => !d.name.includes('公司')).map(dept => ({ value: dept.name, label: dept.name })),
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200'
      },
      { key: 'responsible_person', label: '负责人', headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' },
      { key: 'budget', label: '预算（万元）', type: 'number', headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200', onChange: (value, setFormData, formData) => { const budget = parseFloat(value) || 0; const actualCost = parseFloat(formData.actual_cost) || 0; let progress = 0; if (budget > 0 && !isNaN(actualCost)) { progress = (actualCost / budget) * 100; } progress = parseFloat(progress.toFixed(2)); const normalizedProgress = normalizeProgress(progress); const next = { ...formData, budget: value, progress: normalizedProgress }; const status = computeStatus(normalizedProgress, formData.planned_date); setFormData({ ...next, status }); } },
      { key: 'actual_cost', label: '实际成本（万元）', type: 'number', headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200', onChange: (value, setFormData, formData) => { const actualCost = parseFloat(value) || 0; const budget = parseFloat(formData.budget) || 0; let progress = 0; if (budget > 0 && !isNaN(actualCost)) { progress = (actualCost / budget) * 100; } progress = parseFloat(progress.toFixed(2)); const normalizedProgress = normalizeProgress(progress); const next = { ...formData, actual_cost: value, progress: normalizedProgress }; const status = computeStatus(normalizedProgress, formData.planned_date); setFormData({ ...next, status }); } },
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
        render: (value, item) => renderStatusBadge(item?.progress, item?.planned_date),
        customField: ({ formData }) => (
          <div className="flex flex-col space-y-1">
            <div className="h-10 flex items-center">
              {renderStatusBadge(formData?.progress, formData?.planned_date)}
            </div>
          </div>
        ),
        disabled: true
      },
      { key: 'description', label: '事件描述', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200' },
      { key: 'key_points', label: '关键要点', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200' },
      { key: 'success_criteria', label: '成功标准', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200' },
      { key: 'risks', label: '风险因素', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200' },
      { key: 'lessons_learned', label: '经验教训', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' }
    ]

    // 默认所有字段必填，除了状态和进度
    const allRequired = base.map(c => ({ ...c, required: (c.key === 'status' || c.key === 'progress') ? false : true }))

    // 所有年份，实际相关字段非必填
    const optionalKeys = ['actual_date', 'actual_cost', 'description', 'key_points', 'success_criteria', 'risks', 'lessons_learned']
    return allRequired.map(c => {
      if (optionalKeys.includes(c.key)) {
        return { ...c, required: false }
      }
      return c
    })
  }, [filters.year, departments, years, editingId])

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="大事件提炼"
        subTitle="制定和管理企业年度工作计划的具体落地实施方案"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setGlobalYear(y) }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
        right={null}
      />

      

      {/* 事件分类说明 */}
      <div className="bg-amber-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-amber-800 mb-2">大事件分类说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <strong className="text-amber-700">战略性事件</strong>
            <p className="text-gray-700">影响企业长远发展的重大决策</p>
          </div>
          <div>
            <strong className="text-amber-700">运营性事件</strong>
            <p className="text-gray-700">日常运营中的重要里程碑</p>
          </div>
          <div>
            <strong className="text-amber-700">风险性事件</strong>
            <p className="text-gray-700">可能带来负面影响的事件</p>
          </div>
          <div>
            <strong className="text-amber-700">机会性事件</strong>
            <p className="text-gray-700">可以把握的发展机遇</p>
          </div>
        </div>
      </div>

      <div className="unified-table-wrapper">
      <TableManager
        title={`${filters.year}年度大事件记录`}
        addHeader={`新增${filters.year}年度大事件记录`}
        addHeaderRight={(
          <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{filters.year}年</div>
        )}
        addSubHeader="请填写必填项（*），确保事件信息准确"
        data={events}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
        editingId={editingId}
        onEditingChange={setEditingId}
        showActions={true}
        headerEllipsis={filters.year === 2025}
        ellipsisAll={false}
        tableClassName="unified-data-table"
        tableContainerClassName="unified-table-scroll"
        stickyHeader={true}
        stickyHeaderBgClass="bg-white"
        actionsHeaderClassName="text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200"
        medium={filters.year === 2025}
        singleLineNoEllipsis={true}
        headerActionsLeft={(
          <div className="flex flex-wrap items-center gap-2 mr-2 relative">
            <button
              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 relative"
              onClick={() => setIsFilterOpen(v => !v)}
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
              className={`px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 ${!(filters.event_type || filters.importance || filters.month || filters.responsible_department || filters.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => { setFilters(prev => ({ ...prev, month: '', event_type: '', importance: '', status: '', responsible_department: '' })); setIsFilterOpen(false); loadEvents() }}
              disabled={!(filters.event_type || filters.importance || filters.month || filters.responsible_department || filters.status)}
            >
              <RefreshCcw size={14} />
              <span>重置</span>
            </button>
            
            {false}
            <button
              className={`px-3 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-300 shadow-md flex items-center space-x-2 ${events.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleExportToExcel}
              disabled={events.length===0}
            >
              <Download size={14} />
              <span>导出Excel</span>
            </button>
            <button
              className={`px-3 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all duration-300 shadow-md flex items-center space-x-2 ${events.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => setShowPrintPreview(true)}
              disabled={events.length===0}
            >
              <FileText size={14} />
              <span>导出PDF</span>
            </button>
            <button
              className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all duration-300 shadow-md flex items-center space-x-2"
              onClick={() => importInputRef.current && importInputRef.current.click()}
            >
              <Upload size={14} />
              <span>导入Excel</span>
            </button>
            <input
              ref={importInputRef}
              id="import-major-events"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files && e.target.files[0] && handleImportFromExcel(e.target.files[0])}
            />
          </div>
        )}
        triggerAdd={addTrigger}
        triggerPrefill={addPrefill}
        addMode="modal"
        prefill={{ year: filters.year, progress: 0 }}
        pagination={{
          page,
          pageSize,
          total: events.length,
          onChange: ({ page: p, pageSize: s }) => { setPage(p); setPageSize(s) },
          pageSizeOptions: [10, 20, 50]
        }}
      >
        {isFilterOpen && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="panel-type" className="block text-sm font-medium text-gray-700 mb-1">事件类型</label>
                <select id="panel-type" name="event_type"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                  value={filters.event_type}
                  onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
                >
                  <option value="">全部类型</option>
                  <option value="strategic">战略性事件</option>
                  <option value="operational">运营性事件</option>
                  <option value="risk">风险性事件</option>
                  <option value="opportunity">机会性事件</option>
                </select>
              </div>
              <div>
                <label htmlFor="panel-importance" className="block text-sm font-medium text-gray-700 mb-1">重要性</label>
                <select id="panel-importance" name="importance"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                  value={filters.importance}
                  onChange={(e) => setFilters({ ...filters, importance: e.target.value })}
                >
                  <option value="">全部重要性</option>
                  <option value="critical">非常重要</option>
                  <option value="high">重要</option>
                  <option value="medium">一般</option>
                  <option value="low">较低</option>
                </select>
              </div>
              <div>
                <label htmlFor="panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份</label>
                <CustomSelect
                  value={filters.month}
                  onChange={(value) => setFilters({ ...filters, month: value })}
                  options={[
                    { value: '', label: '全部月份' },
                    { value: '1', label: '1月' },
                    { value: '2', label: '2月' },
                    { value: '3', label: '3月' },
                    { value: '4', label: '4月' },
                    { value: '5', label: '5月' },
                    { value: '6', label: '6月' },
                    { value: '7', label: '7月' },
                    { value: '8', label: '8月' },
                    { value: '9', label: '9月' },
                    { value: '10', label: '10月' },
                    { value: '11', label: '11月' },
                    { value: '12', label: '12月' }
                  ]}
                  className="focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="panel-department" className="block text-sm font-medium text-gray-700 mb-1">负责部门</label>
                <CustomSelect
                  value={filters.responsible_department}
                  onChange={(value) => setFilters({ ...filters, responsible_department: value })}
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
                <label htmlFor="panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select id="panel-status" name="status"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
        title={`${filters.year}年度大事件提炼`}
        data={events}
        columns={columns}
        filename={`大事件提炼_${filters.year}年`}
        pageType="majorEvents"
        year={filters.year}
      />
    </div>
  )
}

export default MajorEvents
