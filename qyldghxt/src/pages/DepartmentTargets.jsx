import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
 
import { useData } from '../contexts/DataContext'
import { exportToExcel } from '../utils/export'
import { TrendingUp, Filter, Download, Upload, Building, Award, Target, Calendar, RefreshCcw, Plus, X, Trash2, FileText, Eye, Edit } from 'lucide-react'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog'
import Pagination from '../components/Pagination'
import * as XLSX from 'xlsx'
import PageHeaderBanner from '../components/PageHeaderBanner'
import toast from 'react-hot-toast'
import { loadLocalePrefs, formatDateTime } from '../utils/locale.js'
 

const DepartmentTargets = () => {
  const { getDepartmentTargets, addDepartmentTarget, updateDepartmentTarget, deleteDepartmentTarget, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [targets, setTargets] = useState([])
  const [departments, setDepartments] = useState([])
 
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    department: '',
    targetType: '',
    target_level: ''
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [responsibleOwner, setResponsibleOwner] = useState('')
  const [responsibleManager, setResponsibleManager] = useState('')
  const [responsibleVice, setResponsibleVice] = useState('')
  const [selfCheckText, setSelfCheckText] = useState('')
  const [years, setYears] = useState([2024, 2025, 2026])
  const [newYear, setNewYear] = useState('')
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [showYearModal, setShowYearModal] = useState(false)
  const [yearError, setYearError] = useState('')
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showAddTarget2025Modal, setShowAddTarget2025Modal] = useState(false)
  const [newTarget, setNewTarget] = useState({ department: '', target_level: '', target_type: '', target_name: '', unit: '', responsible_person: '', description: '' })
  const [annualTotal, setAnnualTotal] = useState('')
  const [distributionMode, setDistributionMode] = useState('equal')
  const [monthlyValues, setMonthlyValues] = useState(Array.from({ length: 12 }, () => ''))
  const [addTargetErrors, setAddTargetErrors] = useState({})
  const location = useLocation()
 
  const filterBtnRef = useRef(null)

 

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
            setFilters(prev => ({ ...prev, year: y }))
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
        setOpenSub({ year: false, dept: false, type: false })
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
    const result = await getDepartmentTargets(filters)
    const next = result && Array.isArray(result.data) ? result.data : []
    setTargets(next)
  }

  const loadDepartments = async () => {
    const result = await getDepartments()
    if (result.success) {
      setDepartments(result.data || [])
    }
  }

 

  const handleExportToExcel = () => {
    try {
      if (!targets || targets.length === 0) {
        toast('当前没有可导出的数据', { icon: 'ℹ️' })
        return
      }
      const exportData = targets.map(target => ({
        year: target.year,
        department: target.department,
        target_level: target.target_level,
        target_type: targetTypeLabelMap[target.target_type] || target.target_type,
        target_name: target.target_name,
        target_value: target.target_value,
        unit: target.unit,
        month: target.month,
        current_value: target.current_value,
        completion_rate: target.current_value && target.target_value 
          ? ((target.current_value / target.target_value) * 100).toFixed(1) + '%'
          : '0%',
        responsible_person: target.responsible_person,
        description: target.description,
        created_at: target.created_at
      }))

      exportToExcel(exportData, `部门目标分解_${filters.year}年`, '部门目标', 'departmentTargets')
      toast.success(`已导出 ${exportData.length} 条到 Excel`)
    } catch (error) {
      console.error('导出Excel失败:', error)
      toast.error('导出失败，请稍后重试')
    }
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
          responsible_person: row['负责人'] || '',
          description: row['描述'] || ''
        }
        await addDepartmentTarget(payload)
      }
      await loadTargets()
      alert('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      alert('导入失败，请检查文件格式')
    }
  }

 

  const generateTableData = () => {
    const safeTargets = Array.isArray(targets) ? targets.filter(t => {
      if (!t) return false
      if (filters.year && String(t.year) !== String(filters.year)) return false
      if (filters.department && t.department !== filters.department) return false
      if (filters.targetType && t.target_type !== filters.targetType) return false
      if (filters.target_level && t.target_level !== filters.target_level) return false
      return true
    }) : []
    const departments = [...new Set(safeTargets.map(t => t && t.department).filter(Boolean))]
    const levels = ['A', 'B', 'C', 'D']
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const data = {}

    departments.forEach(dept => {
      data[dept] = {}
      levels.forEach(level => {
        data[dept][level] = {}
        months.forEach(month => {
          data[dept][level][month] = []
        })
      })
    })

    safeTargets.forEach(target => {
      const dept = target && target.department
      const level = (target && target.target_level) || 'A'
      const month = (target && target.month) || 1
      if (dept && data[dept] && data[dept][level]) {
        if (!data[dept][level][month]) data[dept][level][month] = []
        data[dept][level][month].push(target)
      }
    })

    return { departments, levels, months, data }
  }

  const tableData = generateTableData()
  const [detailModal, setDetailModal] = useState({ open: false, department: '', level: '' })
  const [editModal, setEditModal] = useState({ open: false, department: '', level: '', items: [] })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, department: '', level: '' })
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
    类别: 'field-category',
    级别: 'field-level',
    目标名称: 'field-target-name',
    单位: 'field-unit',
    负责人: 'field-owner',
    年度全年目标: 'field-annual',
    合计: 'field-total',
    '当前值/完成率': 'field-current',
    描述: 'field-desc',
    操作: 'field-actions'
  }

  const headerTextClass = (label) => (filters.year === 2025 ? (fieldClassMap2025[label] || 'text-gray-700') : 'text-gray-700')
  const cellTextClass = (label) => (filters.year === 2025 ? (fieldClassMap2025[label] || '') : '')
  const headBgClass = (label) => (filters.year === 2025 ? ({
    类别: 'head-bg-category',
    级别: 'head-bg-level',
    目标名称: 'head-bg-target-name',
    单位: 'head-bg-unit',
    负责人: 'head-bg-owner',
    年度全年目标: 'head-bg-annual',
    合计: 'head-bg-total',
    '当前值/完成率': 'head-bg-current',
    描述: 'head-bg-desc',
    操作: 'head-bg-actions'
  }[label] || '') : '')
  const monthHeadBgClass = (m) => (filters.year === 2025 ? `head-bg-month-${m}` : '')

  const monthHeaderTextMap = {
    1: 'text-indigo-700',
    2: 'text-teal-700',
    3: 'text-blue-700',
    4: 'text-cyan-700',
    5: 'text-emerald-700',
    6: 'text-green-700',
    7: 'text-lime-700',
    8: 'text-yellow-700',
    9: 'text-orange-700',
    10: 'text-amber-700',
    11: 'text-rose-700',
    12: 'text-purple-700'
  }

  const monthValueClassMap = {
    1: 'bg-indigo-50 text-indigo-700 border border-indigo-200 ring-1 ring-indigo-200/50',
    2: 'bg-teal-50 text-teal-700 border border-teal-200 ring-1 ring-teal-200/50',
    3: 'bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-200/50',
    4: 'bg-cyan-50 text-cyan-700 border border-cyan-200 ring-1 ring-cyan-200/50',
    5: 'bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-200/50',
    6: 'bg-green-50 text-green-700 border border-green-200 ring-1 ring-green-200/50',
    7: 'bg-lime-50 text-lime-700 border border-lime-200 ring-1 ring-lime-200/50',
    8: 'bg-yellow-50 text-yellow-700 border border-yellow-200 ring-1 ring-yellow-200/50',
    9: 'bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-200/50',
    10: 'bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-amber-200/50',
    11: 'bg-rose-50 text-rose-700 border border-rose-200 ring-1 ring-rose-200/50',
    12: 'bg-purple-50 text-purple-700 border border-purple-200 ring-1 ring-purple-200/50'
  }

  const truncate = (s, n = 4) => {
    if (typeof s !== 'string') return s
    return s.length > n ? s.slice(0, n) + '...' : s
  }

  const truncateLabel = (s, n = 6) => {
    if (typeof s !== 'string') return s
    return s.length > n ? s.slice(0, n) + '...' : s
  }




  return (
    <div className="space-y-8">
      <PageHeaderBanner
        title="部门目标分解"
        subTitle="设定和管理各部门的年度目标和完成情况"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setFilters({ ...filters, year: y }) }}
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

      {false && (
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 border border-gray-100 shadow-xl z-10 mt-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <button 
              className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-sm gap-2"
              onClick={() => setIsFilterOpen(prev => !prev)}
            >
              <Filter size={16} />
              <span>筛选</span>
            </button>
            {isFilterOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">年份</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/60 backdrop-blur-sm transition-all duration-200 hover:border-blue-300 text-sm"
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
  </div>
  {isFilterOpen && (
    <div style={{ position: 'fixed', left: filterPos.left, top: filterPos.top }} className="w-96 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">年份</label>
          <select className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm" value={filters.year} onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}>
            {years.map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">部门</label>
          <select className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
            <option value="">全部部门</option>
            {departments.map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">类型</label>
          <select className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-sm" value={filters.targetType} onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}>
            <option value="">全部类型</option>
            <option value="sales">销售</option>
            <option value="profit">利润</option>
            <option value="project">项目</option>
            <option value="efficiency">效率</option>
            <option value="quality">质量</option>
            <option value="cost">成本</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        <button className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => setIsFilterOpen(false)}>关闭</button>
        <button className="px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700" onClick={() => { setIsFilterOpen(false); loadTargets() }}>应用</button>
      </div>
    </div>
  )}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">部门</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/60 backdrop-blur-sm transition-all duration-200 hover:border-green-300 text-sm"
                      value={filters.department}
                      onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    >
                      <option value="">全部部门</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">类型</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/60 backdrop-blur-sm transition-all duration-200 hover:border-purple-300 text-sm"
                      value={filters.targetType}
                      onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                    >
                      <option value="">全部类型</option>
                      <option value="sales">销售</option>
                      <option value="profit">利润</option>
                      <option value="project">项目</option>
                      <option value="efficiency">效率</option>
                      <option value="quality">质量</option>
                      <option value="cost">成本</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4"></div>
              </div>
            )}
          </div>
          <div>
            <button 
              className="h-10 px-4 border border-gray-300 text-gray-700 bg-white/70 backdrop-blur-sm rounded-xl font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 shadow-sm flex items-center justify-center text-sm gap-1"
              onClick={() => setFilters({
                year: new Date().getFullYear(),
                department: '',
                targetType: ''
              })}
            >
              <RefreshCcw size={16} />
              <span className="whitespace-nowrap">重置</span>
            </button>
          </div>
        </div>
      </div>
      )}


      

      

      

      

      

      { 
        <div className="card rounded-2xl overflow-hidden">
          <div className="p-6">
            <PageHeaderBanner
              title={`${filters.year}年度目标分解`}
              subTitle="按部门和时间维度展示目标详情"
              right={(
                <div className="flex items-center gap-2 flex-nowrap self-center min-h-[40px]">
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
                    className="btn-secondary inline-flex items-center"
                    onClick={() => {
                      setFilters(prev => ({ ...prev, department: '', targetType: '', target_level: '' }))
                    }}
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
                  <label htmlFor="import-dept-targets-banner" className="h-10 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold cursor-pointer relative z-10">
                    <Upload className="mr-2" size={18} />
                    导入Excel
                    <input id="import-dept-targets-banner" name="import-dept-targets-banner" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
                  </label>
                  <button 
                    type="button"
                    className="h-10 px-3 ml-2 bg-gradient-to-r from-indigo-500 to-pink-600 text-white rounded-lg hover:from-indigo-600 hover:to-pink-700 transition-all duration-300 shadow-md inline-flex items-center font-semibold relative z-50 pointer-events-auto"
                    onClick={(e) => { e.stopPropagation(); setShowAddTarget2025Modal(true) }}
                    title="2025年度目标分解"
                    aria-label="2025年度目标分解"
                  >
                    新增2025年度目标分解
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">级别</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                  value={filters.target_level}
                  onChange={(e) => setFilters({ ...filters, target_level: e.target.value })}
                >
                  <option value="">全部级别</option>
                  {['A','B','C','D'].map(l => (<option key={l} value={l}>{levelLabels[l] || l}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                  <option value="">全部部门</option>
                  {departments.map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                  value={filters.targetType}
                  onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                >
                  <option value="">全部类型</option>
                  <option value="sales">销售</option>
                  <option value="profit">利润</option>
                  <option value="project">项目</option>
                  <option value="efficiency">效率</option>
                  <option value="quality">质量</option>
                  <option value="cost">成本</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
          
          
          <div className="relative max-h-[70vh] overflow-auto bg-white rounded-2xl shadow-xl border border-gray-100">
            <table className="min-w-full text-sm table-excel-borders table-compact table-fixed">
              <colgroup>
                <col className="w-28" />
                <col className="w-20" />
                <col className="w-36" />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-28" />
                {[...Array(12)].map((_, i) => (<col key={`m-${i}`} className="w-16" />))}
                <col className="w-24" />
                <col className="w-32" />
                <col className="w-36" />
                <col className="w-40" />
              </colgroup>
              <thead>
                <tr className={`backdrop-blur-sm shadow-sm ${filters.year===2025 ? 'bg-white' : 'bg-gradient-to-r from-gray-50 to-blue-50'}`}>
                  <th className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-28 ${headBgClass('类别')}`}>
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-purple-500" />
                      <span className={`${headerTextClass('类别')} whitespace-nowrap`}>{truncateLabel('类别')}</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-20 ${headBgClass('级别')}`}>
                    <div className="flex items-center">
                      <Award size={16} className="mr-2 text-green-500" />
                      <span className={`${headerTextClass('级别')} whitespace-nowrap`}>{truncateLabel('级别')}</span>
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
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-28 ${headBgClass('年度全年目标')}`}>
                    <div className="flex items-center justify-center">
                      <Calendar size={16} className="mr-2 text-orange-500" />
                      <span className={`${headerTextClass('年度全年目标')} whitespace-nowrap`}>{truncateLabel('年度全年目标')}</span>
                    </div>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-28 ${headBgClass('负责人')}`}>
                    <div className="flex items-center">
                      <Target size={16} className="mr-2 text-indigo-500" />
                      <span className={`${headerTextClass('负责人')} whitespace-nowrap`}>{truncateLabel('负责人')}</span>
                    </div>
                  </th>
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <th key={month} className={`px-4 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16 ${monthHeadBgClass(month)}`}>
                      <div className="flex flex-col items-center">
                        <span className={`text-xs ${filters.year===2025 ? (monthHeaderTextMap[month] || 'text-gray-500') : 'text-gray-500'}`}>{month}月</span>
                        <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mt-1"></div>
                      </div>
                    </th>
                  ))}
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-24 ${headBgClass('合计')}`}><span className={`${headerTextClass('合计')} whitespace-nowrap`}>{truncateLabel('合计')}</span></th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-32 ${headBgClass('当前值/完成率')}`}><span className={`${headerTextClass('当前值/完成率')} whitespace-nowrap`}>{truncateLabel('当前值/完成率')}</span></th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-36 ${headBgClass('描述')}`}><span className={`${headerTextClass('描述')} whitespace-nowrap`}>{truncateLabel('描述')}</span></th>
                  <th className={`px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-40 ${headBgClass('操作')}`}><span className={`${headerTextClass('操作')} whitespace-nowrap`}>操作</span></th>
                  
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  try {
                    const pairs = []
                    tableData.departments.forEach((department) => {
                      tableData.levels.forEach((level) => {
                        const hasData = tableData.months.some(month =>
                          tableData.data[department] &&
                          tableData.data[department][level] &&
                          tableData.data[department][level][month] &&
                          tableData.data[department][level][month].length > 0
                        )
                        if (hasData) pairs.push({ department, level })
                      })
                    })
                    const start = (page - 1) * pageSize
                    const visible = pairs.slice(start, start + pageSize)
                    return visible.map(({ department, level }, idx) => (
                      <tr key={`${department}-${level}-${idx}`} className="odd:bg-white even:bg-gray-50 hover:bg-gradient-to-r from-blue-50/30 to-purple-50/30 transition-all duration-200 group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 group-hover:border-purple-100">
                              {(() => {
                                const buckets = tableData.data[department] && tableData.data[department][level] ? Object.values(tableData.data[department][level]) : []
                                const flatList = buckets.reduce((acc, arr) => acc.concat(arr || []), [])
                                const raw = flatList.map(t => t && t.target_type).filter(Boolean)[0]
                                const label = targetTypeLabelMap[raw] || raw
                                const v = label || '-'
                                return <span className={`text-ellipsis cell-limit ${cellTextClass('类别')}`} title={typeof v === 'string' ? v : ''}>{truncate(v, filters.year===2025 ? 4 : 6)}</span>
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-b border-gray-100 group-hover:border-green-100">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {levelLabels[level] || level}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100">
                              {(() => {
                                const buckets = tableData.data[department] && tableData.data[department][level] ? Object.values(tableData.data[department][level]) : []
                                const flatList = buckets.reduce((acc, arr) => acc.concat(arr || []), [])
                                const v = flatList.map(t => t && t.target_name).filter(Boolean)[0]
                                return v ? (<span className={`text-ellipsis cell-limit ${cellTextClass('目标名称')}`} title={v}>{truncate(v, filters.year===2025 ? 4 : 6)}</span>) : '-'
                              })()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100">
                              {(() => {
                                const buckets = tableData.data[department] && tableData.data[department][level] ? Object.values(tableData.data[department][level]) : []
                                const flatList = buckets.reduce((acc, arr) => acc.concat(arr || []), [])
                                const v = flatList.map(t => t && t.unit).filter(Boolean)[0]
                                return v ? (<span className={`text-ellipsis cell-limit ${cellTextClass('单位')}`} title={v}>{truncate(v)}</span>) : '-'
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center border-b border-gray-100 group-hover:border-orange-100">
                              <span className={cellTextClass('年度全年目标')}>
                                {tableData.data[department] && tableData.data[department][level] && 
                                  Object.values(tableData.data[department][level]).flat().reduce((sum, t) => sum + (t.target_value || 0), 0) || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 border-b border-gray-100">
                              {(() => {
                                const buckets = tableData.data[department] && tableData.data[department][level] ? Object.values(tableData.data[department][level]) : []
                                const flatList = buckets.reduce((acc, arr) => acc.concat(arr || []), [])
                                const v = flatList.map(t => t && t.responsible_person).filter(Boolean)[0]
                                return v ? (<span className={`text-ellipsis cell-limit ${cellTextClass('负责人')}`} title={v}>{truncate(v)}</span>) : '-'
                              })()}
                            </td>
                            {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                              const monthData = tableData.data[department] && 
                                tableData.data[department][level] && 
                                tableData.data[department][level][month]
                              const targetValue = monthData ? 
                                monthData.reduce((sum, t) => sum + (t.target_value || 0), 0) : 0
                              return (
                                <td key={month} className="px-4 py-4 text-center text-sm text-gray-600 border-b border-gray-100 group-hover:border-gray-200">
                                  <div className={`inline-flex items-center px-2 py-1 rounded-lg font-medium ${
                                    targetValue > 0 
                                      ? (monthValueClassMap[month] || 'bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-200/50') 
                                      : 'bg-gray-50 text-gray-500 border border-gray-200 ring-1 ring-gray-200/50'
                                  }`}>
                                    {targetValue > 0 ? targetValue : '-'}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-bold border-b border-gray-100 group-hover:border-orange-100">
                              <span className={cellTextClass('合计')}>
                                {tableData.data[department] && tableData.data[department][level] && 
                                  Object.values(tableData.data[department][level]).flat().reduce((sum, t) => sum + (t.target_value || 0), 0) || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              {(() => {
                                const flat = tableData.data[department] && tableData.data[department][level]
                                  ? Object.values(tableData.data[department][level]).flat()
                                  : []
                                const cur = flat.reduce((sum, t) => sum + (t?.current_value || 0), 0)
                                const tar = flat.reduce((sum, t) => sum + (t?.target_value || 0), 0)
                                const rate = tar > 0 ? ((cur / tar) * 100).toFixed(1) + '%' : '0%'
                                return <span className={cellTextClass('当前值/完成率')}>{`${cur} / ${rate}`}</span>
                              })()}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              {(() => {
                                const flat = tableData.data[department] && tableData.data[department][level]
                                  ? Object.values(tableData.data[department][level]).flat()
                                  : []
                                const desc = flat.map(t => t && t.description).filter(Boolean)[0]
                                return desc ? (
                                  <span className={`text-ellipsis cell-limit ${cellTextClass('描述')}`} title={desc}>{truncate(desc, filters.year===2025 ? 4 : 6)}</span>
                                ) : '-'
                              })()}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600 border-b border-gray-100">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-sm"
                                  onClick={() => setDetailModal({ open: true, department, level })}
                                  title="查看"
                                  aria-label="查看"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-sm"
                                  onClick={() => {
                                    const flat = tableData.data[department] && tableData.data[department][level]
                                      ? Object.values(tableData.data[department][level]).flat()
                                      : []
                                    setEditModal({ open: true, department, level, items: flat.map(it => ({ ...it })) })
                                  }}
                                  title="修改"
                                  aria-label="修改"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="p-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-sm"
                                  onClick={() => setDeleteDialog({ open: true, department, level })}
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
            {(() => {
              try {
                const pairsCount = (() => {
                  let c = 0
                  tableData.departments.forEach((department) => {
                    tableData.levels.forEach((level) => {
                      const hasData = tableData.months.some(month =>
                        tableData.data[department] &&
                        tableData.data[department][level] &&
                        tableData.data[department][level][month] &&
                        tableData.data[department][level][month].length > 0
                      )
                      if (hasData) c += 1
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

      {detailModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
              <div className="font-semibold">
                {detailModal.department} • {levelLabels[detailModal.level] || detailModal.level} 详细目标
              </div>
              <button onClick={() => setDetailModal({ open: false, department: '', level: '' })} className="text-white/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto overflow-x-auto">
              <table className="min-w-full text-sm table-excel-borders table-compact table-fixed">
                <colgroup>
                  <col className="w-20" />
                  <col className="w-20" />
                  <col className="w-32" />
                  <col className="w-20" />
                  <col className="w-24" />
                  <col className="w-48" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-20" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-32" />
                  <col className="w-64" />
                  <col className="w-36" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-center whitespace-nowrap">ID</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">年度</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">部门</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">级别</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">类型</th>
                    <th className="px-3 py-2 text-left whitespace-nowrap">目标名称</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">单位</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">目标值</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">月份</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">当前值</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">完成率</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">负责人</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">描述</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">创建时间</th>
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
                      const rate = tar > 0 ? ((cur / tar) * 100).toFixed(1) + '%' : '0%'
                      return (
                        <tr key={t?.id ?? i} className="border-t">
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.id ?? '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.year ?? '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.department || detailModal.department || '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.target_level || detailModal.level || '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{targetTypeLabelMap[t?.target_type] || t?.target_type || '-'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{t?.target_name || '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.unit || '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.target_value ?? '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.month ?? '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.current_value ?? '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{rate}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.responsible_person || '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{t?.description || '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{formatDateTime(t?.created_at)}</td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setDetailModal({ open: false, department: '', level: '' })} className="px-4 py-2 bg-white border border-gray-300 rounded-xl">关闭</button>
            </div>
          </div>
        </div>
      )}

      {editModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-orange-500 to-amber-600 text-white flex items-center justify-between">
              <div className="font-semibold">
                编辑：{editModal.department} • {levelLabels[editModal.level] || editModal.level}
              </div>
              <button onClick={() => setEditModal({ open: false, department: '', level: '', items: [] })} className="text-white/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-auto">
              <table className="min-w-full text-sm table-excel-borders table-compact">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-center">类型</th>
                    <th className="px-3 py-2 text-left">目标名称</th>
                    <th className="px-3 py-2 text-center">单位</th>
                    <th className="px-3 py-2 text-center">目标值</th>
                    <th className="px-3 py-2 text-center">负责人</th>
                    <th className="px-3 py-2 text-center">月份</th>
                    <th className="px-3 py-2 text-center">当前值</th>
                    <th className="px-3 py-2 text-center">级别</th>
                    <th className="px-3 py-2 text-center">描述</th>
                  </tr>
                </thead>
                <tbody>
                  {editModal.items.map((t, i) => (
                    <tr key={t?.id ?? i} className="border-t">
                      <td className="px-3 py-2">
                        <select className="w-full h-9 px-2 border border-gray-300 rounded" value={t?.target_type || ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], target_type: e.target.value }; return { ...prev, items } })}>
                          <option value="">选择类型</option>
                          {Object.keys(targetTypeLabelMap).map(k => (<option key={k} value={k}>{targetTypeLabelMap[k]}</option>))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input className="w-full h-9 px-2 border border-gray-300 rounded" value={t?.target_name || ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], target_name: e.target.value }; return { ...prev, items } })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input className="w-full h-9 px-2 border border-gray-300 rounded text-center" value={t?.unit || ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], unit: e.target.value }; return { ...prev, items } })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" className="w-full h-9 px-2 border border-gray-300 rounded text-center" value={t?.target_value ?? ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], target_value: e.target.value === '' ? null : Number(e.target.value) }; return { ...prev, items } })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input className="w-full h-9 px-2 border border-gray-300 rounded text-center" value={t?.responsible_person || ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], responsible_person: e.target.value }; return { ...prev, items } })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" className="w-full h-9 px-2 border border-gray-300 rounded text-center" value={t?.month ?? ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], month: e.target.value === '' ? null : Number(e.target.value) }; return { ...prev, items } })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" className="w-full h-9 px-2 border border-gray-300 rounded text-center" value={t?.current_value ?? ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], current_value: e.target.value === '' ? null : Number(e.target.value) }; return { ...prev, items } })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select className="w-full h-9 px-2 border border-gray-300 rounded text-center" value={t?.target_level || ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], target_level: e.target.value }; return { ...prev, items } })}>
                          {['A','B','C','D'].map(l => (<option key={l} value={l}>{levelLabels[l]}</option>))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input className="w-full h-9 px-2 border border-gray-300 rounded" value={t?.description || ''} onChange={(e) => setEditModal(prev => { const items = [...prev.items]; items[i] = { ...items[i], description: e.target.value }; return { ...prev, items } })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setEditModal({ open: false, department: '', level: '', items: [] })} className="px-4 py-2 bg-white border border-gray-300 rounded-xl">取消</button>
              <button
                onClick={async () => {
                  try {
                    const promises = editModal.items.map(t => {
                      const payload = { ...t }
                      if (t?.id) return updateDepartmentTarget(t.id, payload)
                      return addDepartmentTarget(payload)
                    })
                    await Promise.all(promises)
                    toast.success('已保存修改')
                    setEditModal({ open: false, department: '', level: '', items: [] })
                    await loadTargets()
                  } catch (e) {
                    toast.error('保存失败')
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl"
              >保存</button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, department: '', level: '' })}
        onConfirm={async () => {
          try {
            const flat = tableData.data[deleteDialog.department] && tableData.data[deleteDialog.level]
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
        message={`将删除 ${deleteDialog.department} • ${levelLabels[deleteDialog.level] || deleteDialog.level} 的所有目标记录，操作不可恢复。`}
        itemName={`${deleteDialog.department}（${levelLabels[deleteDialog.level] || deleteDialog.level}）`}
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
                      if (years.includes(n)) { setYearError('年份已存在'); setFilters(prev => ({ ...prev, year: n })); return }
                      const next = [...years, n].sort((a,b)=>a-b)
                      setYears(next)
                      persistYears(next)
                      setFilters(prev => ({ ...prev, year: n }))
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
                          onClick={() => setFilters(prev => ({ ...prev, year: y }))}
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
                            setFilters(prev => ({ ...prev, year: fallback }))
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-indigo-500 to-pink-600 text-white flex items-center justify-between">
              <div className="font-semibold">新增2025年度目标分解</div>
              <button onClick={() => setShowAddTarget2025Modal(false)} className="text-white/80 hover:text-white" title="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm text-gray-700">部门<span className="ml-1 text-red-500">*</span></label>
                  <select value={newTarget.department} onChange={(e)=>setNewTarget(prev=>({ ...prev, department: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">请选择</option>
                    {departments.map(d => (<option key={d.id} value={d.name}>{d.name}</option>))}
                  </select>
                  {addTargetErrors.department && <span className="text-red-500 text-sm mt-1 block">{addTargetErrors.department}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm text-gray-700">级别<span className="ml-1 text-red-500">*</span></label>
                  <select value={newTarget.target_level} onChange={(e)=>setNewTarget(prev=>({ ...prev, target_level: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500">
                    <option value="">请选择</option>
                    {['A','B','C','D'].map(l => (<option key={l} value={l}>{l}</option>))}
                  </select>
                  {addTargetErrors.target_level && <span className="text-red-500 text-sm mt-1 block">{addTargetErrors.target_level}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm text-gray-700">目标类型<span className="ml-1 text-red-500">*</span></label>
                  <select value={newTarget.target_type} onChange={(e)=>setNewTarget(prev=>({ ...prev, target_type: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <option value="">请选择</option>
                    <option value="sales">销售</option>
                    <option value="profit">利润</option>
                    <option value="project">项目</option>
                    <option value="efficiency">效率</option>
                    <option value="quality">质量</option>
                    <option value="cost">成本</option>
                  </select>
                  {addTargetErrors.target_type && <span className="text-red-500 text-sm mt-1 block">{addTargetErrors.target_type}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm text-gray-700">目标名称<span className="ml-1 text-red-500">*</span></label>
                  <input value={newTarget.target_name} onChange={(e)=>setNewTarget(prev=>({ ...prev, target_name: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  {addTargetErrors.target_name && <span className="text-red-500 text-sm mt-1 block">{addTargetErrors.target_name}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm text-gray-700">单位<span className="ml-1 text-red-500">*</span></label>
                  <input value={newTarget.unit} onChange={(e)=>setNewTarget(prev=>({ ...prev, unit: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                  {addTargetErrors.unit && <span className="text-red-500 text-sm mt-1 block">{addTargetErrors.unit}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm text-gray-700">负责人<span className="ml-1 text-red-500">*</span></label>
                  <input value={newTarget.responsible_person} onChange={(e)=>setNewTarget(prev=>({ ...prev, responsible_person: e.target.value }))} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                  {addTargetErrors.responsible_person && <span className="text-red-500 text-sm mt-1 block">{addTargetErrors.responsible_person}</span>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm text-gray-700">分配方式<span className="ml-1 text-red-500">*</span></label>
                  <select value={distributionMode} onChange={(e)=>setDistributionMode(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="equal">平均分配至12个月</option>
                    <option value="manual">手动填写每月值</option>
                  </select>
                </div>
                {distributionMode === 'equal' && (
                  <div>
                    <label className="flex items-center text-sm text-gray-700">年度全年目标<span className="ml-1 text-red-500">*</span></label>
                    <input type="number" value={annualTotal} onChange={(e)=>setAnnualTotal(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    {addTargetErrors.annualTotal && <span className="text-red-500 text-sm mt-1 block">{addTargetErrors.annualTotal}</span>}
                  </div>
                )}
              </div>
              {distributionMode === 'manual' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i}>
                      <label className="flex items-center text-xs text-gray-700">{i+1}月<span className="ml-1 text-red-500">*</span></label>
                      <input type="number" value={monthlyValues[i]} onChange={(e)=>{
                        const next = [...monthlyValues]
                        next[i] = e.target.value
                        setMonthlyValues(next)
                      }} className="w-full h-10 px-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700">描述</label>
                <textarea value={newTarget.description} onChange={(e)=>setNewTarget(prev=>({ ...prev, description: e.target.value }))} className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowAddTarget2025Modal(false)} className="h-10 px-4 bg-white border border-gray-300 rounded-xl">取消</button>
              <button onClick={async () => {
                const errs = {}
                if (!newTarget.department) errs.department = '必填'
                if (!newTarget.target_level) errs.target_level = '必填'
                if (!newTarget.target_type) errs.target_type = '必填'
                if (!newTarget.target_name) errs.target_name = '必填'
                if (!newTarget.unit) errs.unit = '必填'
                if (!newTarget.responsible_person) errs.responsible_person = '必填'
                if (distributionMode === 'equal') {
                  if (!annualTotal || isNaN(Number(annualTotal))) errs.annualTotal = '请输入有效数字'
                } else {
                  if (monthlyValues.some(v => !v || isNaN(Number(v)))) errs.monthly = '请填写完整每月数值'
                }
                setAddTargetErrors(errs)
                if (Object.keys(errs).length) { toast.error('请完善带红色提示的必填项'); return }
                const dept = departments.find(d => d.name === newTarget.department)
                const values = distributionMode === 'equal'
                  ? Array.from({ length: 12 }, () => Number(annualTotal) / 12)
                  : monthlyValues.map(v => Number(v))
                for (let i = 0; i < 12; i++) {
                  const payload = {
                    year: 2025,
                    department_id: dept ? dept.id : undefined,
                    target_level: newTarget.target_level,
                    target_type: newTarget.target_type,
                    target_name: newTarget.target_name,
                    target_value: values[i],
                    unit: newTarget.unit,
                    month: i + 1,
                    current_value: 0,
                    responsible_person: newTarget.responsible_person,
                    description: newTarget.description || ''
                  }
                  await addDepartmentTarget(payload)
                }
                await loadTargets()
                toast.success('已新增 2025 年度目标分解')
                setShowAddTarget2025Modal(false)
              }} className="h-10 px-4 bg-gradient-to-r from-indigo-500 to-pink-600 text-white rounded-xl hover:from-indigo-600 hover:to-pink-700">保存</button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}

export default DepartmentTargets
