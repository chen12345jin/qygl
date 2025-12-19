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
import TableActions from '../components/TableActions'
import toast from 'react-hot-toast'
import { loadLocalePrefs, formatDateTime } from '../utils/locale.js'
import { normalizeProgress, computeActionPlanStatus } from '../utils/status'
import InlineAlert from '../components/InlineAlert'
import { getLeafDepartments, getBusinessDepartments, getDescendantDepartmentNames } from '../utils/orgSync'


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

  const [hiddenColumns, setHiddenColumns] = useState([])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const columnSelectorRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showTargetModal, setShowTargetModal] = useState(false)

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
  const [selectedMonths, setSelectedMonths] = useState(Array.from({ length: 12 }, () => false))
  const [selectAllMonths, setSelectAllMonths] = useState(false)
  const { errors, validateField, validateForm, clearErrors, setFieldError, clearFieldError } = useFormValidation('departmentTargets')
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' })
  const [alertTimeout, setAlertTimeout] = useState(null)
  const location = useLocation()

  const columns = [
    { key: 'department', label: '部门' },
    { key: 'target_level', label: '级别' },
    { key: 'target_type', label: '类型' },
    { key: 'target_name', label: '目标名称' },
    { key: 'target_value', label: '目标值' },
    { key: 'unit', label: '单位' },
    { key: 'quarter', label: '季度' },
    { key: 'month', label: '月份' },
    { key: 'current_value', label: '当前值' },
    { key: 'completion_rate', label: '进度（%）' },
    { key: 'status', label: '状态' },
    { key: 'responsible_person', label: '负责人' },
    { key: 'description', label: '描述' },
    { key: 'actions', label: '操作' }
  ]
  
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

  const loadTargets = async () => {
    try {
      const query = {
        year: filters.year,
        department: filters.department || undefined,
        targetType: filters.targetType || undefined,
        target_level: filters.target_level || undefined
      }
      const res = await getDepartmentTargets(query)
      let data = res?.data || []
      if (filters.month) {
        const m = String(filters.month)
        data = data.filter(item => String(item.month || '') === m)
      }
      if (filters.status) {
        data = data.filter(item => (item.status || '') === filters.status)
      }
      setTargets(data)
    } catch (e) {
      console.error('Failed to load targets:', e)
      setTargets([])
    }
  }

  const loadDepartments = async () => {
    try {
      const res = await getDepartments()
      setDepartments(res?.data || [])
    } catch (e) {
      console.error('Failed to load departments:', e)
      setDepartments([])
    }
  }

  useEffect(() => {
    loadTargets()
    loadDepartments()
  }, [filters])

  useEffect(() => { setCurrentPage(1) }, [filters, targets.length])

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
        const res = await updateSystemSetting(yearsSettingId, { key: 'planningYears', value: arr })
        showAlertMessage('年份设置已更新')
      } else {
        const res = await addSystemSetting({ key: 'planningYears', value: arr })
        if (res?.data) {
          setYearsSettingId(res.data.id)
          showAlertMessage('年份设置已添加')
        }
      }
      setYears(arr)
    } catch (e) {
      console.error('Failed to save years:', e)
      showAlertMessage('年份设置保存失败', 'error')
    }
  }

  const handleYearChange = (e) => {
    const value = e.target.value
    setGlobalYear(value)
    setYearChangeByUser(true)
  }

  const handleAddYear = () => {
    if (!newYear) {
      setYearError('请输入年份')
      return
    }
    const year = parseInt(newYear)
    if (isNaN(year)) {
      setYearError('请输入有效的年份')
      return
    }
    if (years.includes(year)) {
      setYearError('该年份已存在')
      return
    }
    const updatedYears = [...years, year].sort()
    persistYears(updatedYears)
    setNewYear('')
    setYearError('')
    setShowYearModal(false)
  }

  const handleRemoveYear = (year) => {
    const updatedYears = years.filter(y => y !== year)
    persistYears(updatedYears)
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return {
        key,
        direction: 'asc'
      }
    })
  }

  const handleAddTarget = () => {
    setIsEditMode(false)
    setNewTarget({ 
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
    clearErrors()
    setShowTargetModal(true)
  }

  const handleEditTarget = (target) => {
    setIsEditMode(true)
    setNewTarget({ ...target })
    clearErrors()
    setShowTargetModal(true)
  }

  const handleSaveTarget = async () => {
    const payload = {
      ...newTarget,
      year: filters.year || globalYear
    }
    if (!validateForm(payload)) {
      showAlertMessage('请填写所有必填字段', 'error')
      return
    }

    try {
      if (isEditMode) {
        await updateDepartmentTarget(payload.id, payload)
        showAlertMessage('目标已更新')
      } else {
        await addDepartmentTarget(payload)
        showAlertMessage('目标已添加')
      }
      loadTargets()
      setShowAddTarget2025Modal(false)
      setShowTargetModal(false)
    } catch (e) {
      console.error('Failed to save target:', e)
      showAlertMessage('目标保存失败', 'error')
    }
  }

  const handleDeleteTarget = async (id) => {
    try {
      await deleteDepartmentTarget(id)
      showAlertMessage('目标已删除')
      loadTargets()
    } catch (e) {
      console.error('Failed to delete target:', e)
      showAlertMessage('目标删除失败', 'error')
    }
  }

  const handleExport = () => {
    if (targets.length === 0) {
      showAlertMessage('没有数据可导出', 'warning')
      return
    }
    exportToExcel(targets, '部门目标数据')
  }

  const handleImport = (file) => {
    // 导入功能实现
    showAlertMessage('导入功能开发中', 'info')
  }

  const handlePrint = () => {
    setShowPrintPreview(true)
  }

  const toggleColumnVisibility = (column) => {
    setHiddenColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(c => c !== column)
      } else {
        return [...prev, column]
      }
    })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  // 计算分页
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = targets.slice(indexOfFirstItem, indexOfLastItem)

  return (
    <div className="container mx-auto p-4">
      <PageHeaderBanner 
        title="部门目标管理"
        icon={<Target className="w-8 h-8 text-blue-600" />}
        description="管理和跟踪各部门的年度目标"
      />

      <div className="mb-4">
        <TableActions
          title="部门目标管理"
          subTitle="管理和跟踪各部门的年度目标"
          columns={columns}
          data={targets}
          filters={filters}
          setFilters={setFilters}
          hiddenColumns={hiddenColumns}
          setHiddenColumns={setHiddenColumns}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          exportFileName="部门目标数据"
          exportSheetName="部门目标"
          pageType="departmentTargets"
          year={filters.year}
          onImport={handleImport}
          onAdd={handleAddTarget}
          showImport={true}
          showAdd={true}
        />
      </div>

      {alert.show && (
        <InlineAlert 
          type={alert.type} 
          message={alert.message} 
          onClose={() => setAlert({ ...alert, show: false })} 
        />
      )}

      {isFilterOpen && (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 mb-4" ref={dropdownRef}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              >
                <option value="">全部部门</option>
                {getBusinessDepartments(departments).map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">级别</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                value={filters.target_level}
                onChange={(e) => setFilters(prev => ({ ...prev, target_level: e.target.value }))}
              >
                <option value="">全部级别</option>
                <option value="company">公司级</option>
                <option value="department">部门级</option>
                <option value="team">团队级</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标类型</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                value={filters.targetType}
                onChange={(e) => setFilters(prev => ({ ...prev, targetType: e.target.value }))}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                value={filters.month}
                onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              >
                <option value="">全部月份</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 text-sm"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 border-b">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('department')}>
                部门 {getSortIcon('department')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('target_level')}>
                级别 {getSortIcon('target_level')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('target_type')}>
                类型 {getSortIcon('target_type')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('target_name')}>
                目标名称 {getSortIcon('target_name')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('target_value')}>
                目标值 {getSortIcon('target_value')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('unit')}>
                单位 {getSortIcon('unit')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('quarter')}>
                季度 {getSortIcon('quarter')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('month')}>
                月份 {getSortIcon('month')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('current_value')}>
                当前值 {getSortIcon('current_value')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('completion_rate')}>
                进度（%） {getSortIcon('completion_rate')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('status')}>
                状态 {getSortIcon('status')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('responsible_person')}>
                负责人 {getSortIcon('responsible_person')}
              </th>
              <th className="px-4 py-2 border-b text-left cursor-pointer" onClick={() => handleSort('description')}>
                描述 {getSortIcon('description')}
              </th>
              <th className="px-4 py-2 border-b text-left">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((target) => (
              <tr key={target.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b">
                  <input type="checkbox" className="rounded" />
                </td>
                <td className="px-4 py-2 border-b">{target.department}</td>
                <td className="px-4 py-2 border-b">{target.target_level}</td>
                <td className="px-4 py-2 border-b">
                  {{
                    sales: '销售',
                    profit: '利润',
                    project: '项目',
                    efficiency: '效率',
                    quality: '质量',
                    cost: '成本'
                  }[target.target_type] || target.target_type}
                </td>
                <td className="px-4 py-2 border-b">{target.target_name}</td>
                <td className="px-4 py-2 border-b">{target.target_value}</td>
                <td className="px-4 py-2 border-b">{target.unit}</td>
                <td className="px-4 py-2 border-b">{target.quarter}</td>
                <td className="px-4 py-2 border-b">{target.month}</td>
                <td className="px-4 py-2 border-b">{target.current_value}</td>
                <td className="px-4 py-2 border-b">{target.completion_rate}</td>
                <td className="px-4 py-2 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${target.status === 'completed' ? 'bg-green-100 text-green-800' : target.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : target.status === 'delayed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {{
                      completed: '已完成',
                      in_progress: '进行中',
                      not_started: '未开始',
                      delayed: '延期'
                    }[target.status] || target.status}
                  </span>
                </td>
                <td className="px-4 py-2 border-b">{target.responsible_person}</td>
                <td className="px-4 py-2 border-b">{target.description}</td>
                <td className="px-4 py-2 border-b flex space-x-2">
                  <button 
                    className="text-blue-600 hover:text-blue-800" 
                    onClick={() => handleEditTarget(target)}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <DeleteConfirmDialog
                    onConfirm={() => handleDeleteTarget(target.id)}
                  >
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </DeleteConfirmDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <Pagination
          currentPage={currentPage}
          totalItems={targets.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
        <div className="text-sm text-gray-600">
          共 {targets.length} 条记录
        </div>
      </div>

      {showPrintPreview && (
        <PrintPreview
          data={targets}
          columns={pdfColumns}
          title="部门目标数据"
          onClose={() => setShowPrintPreview(false)}
        />
      )}

      {showTargetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
              <div className="font-semibold text-lg">{isEditMode ? '编辑部门目标' : '新增部门目标'}</div>
              <button
                onClick={() => { setShowTargetModal(false); setShowAddTarget2025Modal(false) }}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    部门
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.department ? 'border-red-500' : ''}`}
                    value={newTarget.department}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, department: v }))
                      validateField('department', v)
                    }}
                    onBlur={(e) => validateField('department', e.target.value)}
                  >
                    <option value="">请选择部门</option>
                    {getLeafDepartments(departments).map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                  {errors.department && <span className="text-red-500 text-sm mt-1 block">{errors.department}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    级别
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.target_level ? 'border-red-500' : ''}`}
                    value={newTarget.target_level}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, target_level: v }))
                      validateField('target_level', v)
                    }}
                    onBlur={(e) => validateField('target_level', e.target.value)}
                  >
                    <option value="">请选择级别</option>
                    <option value="company">公司级</option>
                    <option value="department">部门级</option>
                    <option value="team">团队级</option>
                  </select>
                  {errors.target_level && <span className="text-red-500 text-sm mt-1 block">{errors.target_level}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    目标类型
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.target_type ? 'border-red-500' : ''}`}
                    value={newTarget.target_type}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, target_type: v }))
                      validateField('target_type', v)
                    }}
                    onBlur={(e) => validateField('target_type', e.target.value)}
                  >
                    <option value="">请选择类型</option>
                    <option value="sales">销售</option>
                    <option value="profit">利润</option>
                    <option value="project">项目</option>
                    <option value="efficiency">效率</option>
                    <option value="quality">质量</option>
                    <option value="cost">成本</option>
                    {customTargetTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                    <option value="custom">自定义...</option>
                  </select>
                  {errors.target_type && <span className="text-red-500 text-sm mt-1 block">{errors.target_type}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    目标名称
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.target_name ? 'border-red-500' : ''}`}
                    value={newTarget.target_name}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, target_name: v }))
                      validateField('target_name', v)
                    }}
                    onBlur={(e) => validateField('target_name', e.target.value)}
                    placeholder="请输入目标名称"
                  />
                  {errors.target_name && <span className="text-red-500 text-sm mt-1 block">{errors.target_name}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    目标值
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={`form-input ${errors.target_value ? 'border-red-500' : ''}`}
                    value={newTarget.target_value}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, target_value: v }))
                      validateField('target_value', v)
                    }}
                    onBlur={(e) => validateField('target_value', e.target.value)}
                    placeholder="请输入目标值"
                  />
                  {errors.target_value && <span className="text-red-500 text-sm mt-1 block">{errors.target_value}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    单位
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.unit ? 'border-red-500' : ''}`}
                    value={newTarget.unit}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, unit: v }))
                      validateField('unit', v)
                    }}
                    onBlur={(e) => validateField('unit', e.target.value)}
                    placeholder="请输入单位"
                  />
                  {errors.unit && <span className="text-red-500 text-sm mt-1 block">{errors.unit}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    季度
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.quarter ? 'border-red-500' : ''}`}
                    value={newTarget.quarter}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, quarter: v }))
                      validateField('quarter', v)
                    }}
                    onBlur={(e) => validateField('quarter', e.target.value)}
                  >
                    <option value="">请选择季度</option>
                    <option value="Q1">第一季度</option>
                    <option value="Q2">第二季度</option>
                    <option value="Q3">第三季度</option>
                    <option value="Q4">第四季度</option>
                  </select>
                  {errors.quarter && <span className="text-red-500 text-sm mt-1 block">{errors.quarter}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    月份
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.month ? 'border-red-500' : ''}`}
                    value={newTarget.month}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, month: v }))
                      validateField('month', v)
                    }}
                    onBlur={(e) => validateField('month', e.target.value)}
                  >
                    <option value="">请选择月份</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}月</option>
                    ))}
                  </select>
                  {errors.month && <span className="text-red-500 text-sm mt-1 block">{errors.month}</span>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    当前值
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={newTarget.current_value}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, current_value: v }))
                    }}
                    placeholder="请输入当前值"
                  />
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    className="form-select"
                    value={newTarget.status}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, status: v }))
                    }}
                  >
                    <option value="">请选择状态</option>
                    <option value="not_started">未开始</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="delayed">延期</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    负责人
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.responsible_person ? 'border-red-500' : ''}`}
                    value={newTarget.responsible_person}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, responsible_person: v }))
                      validateField('responsible_person', v)
                    }}
                    onBlur={(e) => validateField('responsible_person', e.target.value)}
                    placeholder="请输入负责人姓名"
                  />
                  {errors.responsible_person && <span className="text-red-500 text-sm mt-1 block">{errors.responsible_person}</span>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={newTarget.description}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewTarget(prev => ({ ...prev, description: v }))
                    }}
                    placeholder="补充说明该目标的背景、衡量方式等"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-sm"
                onClick={() => { setShowTargetModal(false); setShowAddTarget2025Modal(false) }}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 text-sm"
                onClick={handleSaveTarget}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DepartmentTargets
