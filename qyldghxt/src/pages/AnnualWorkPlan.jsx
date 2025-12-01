import React, { useState, useEffect, useMemo } from 'react'
import TableManager from '../components/TableManager'
import { useData } from '../contexts/DataContext'
import { Calendar, Filter, Plus, X, Trash2, Download, Upload, RefreshCcw } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/export'
import toast from 'react-hot-toast'

const AnnualWorkPlan = () => {
  const { getAnnualWorkPlans, addAnnualWorkPlan, updateAnnualWorkPlan, deleteAnnualWorkPlan, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  
  const head = (s) => {
    const t = String(s || '')
    return t.length > 5 ? `${t.slice(0,5)}...` : t
  }

  const [plans, setPlans] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [years, setYears] = useState([2024, 2025, 2026])
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [showYearModal, setShowYearModal] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const floatingButtonClass = isScrolled
    ? "fixed top-24 right-8 z-50 flex space-x-3 bg-white/90 backdrop-blur-md shadow-2xl p-2 rounded-2xl border border-indigo-100 transition-all duration-500 animate-in fade-in slide-in-from-top-4"
    : "flex space-x-3 transition-all duration-300"

  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    department: '',
    category: '',
    status: '',
    month: ''
  })
  const [triggerAdd, setTriggerAdd] = useState(false)
  const [triggerPrefill, setTriggerPrefill] = useState(null)
  const [addOverrideYear, setAddOverrideYear] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
            setFilters(prev => ({ ...prev, year: y }))
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
        const res = await updateSystemSetting(yearsSettingId, { key: 'planningYears', value: arr })
        if (res?.success) return
      }
      const addRes = await addSystemSetting({ key: 'planningYears', value: arr })
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
        
        return {
          ...item,
          department: item.department_name || item.department || '', // Ensure department field is populated for form edit
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

  const handleAdd = async (data) => {
    const selectedDept = departments.find(dept => dept.name === data.department)

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
      budget: data.budget ? parseFloat(data.budget) : null,
      status: data.status || '',
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
      status: data.status || '',
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

  const handleExportToExcel = () => {
    try {
      if (!plans || plans.length === 0) {
        toast('当前没有可导出的数据', { icon: 'ℹ️' })
        return
      }
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
      toast.success(`已导出 ${exportData.length} 条到 Excel`)
    } catch (error) {
      console.error('导出Excel失败:', error)
      toast.error('导出失败，请稍后重试')
    }
  }

  const resetFilters = () => {
    setFilters(prev => ({
      ...prev,
      department: '',
      category: '',
      status: '',
      month: ''
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
          status: row['状态'] || '',
          responsible_person: row['负责人'] || '',
          description: row['复盘要点'] || ''
        }
        await addAnnualWorkPlan(payload)
      }
      await loadPlans()
      alert('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      alert('导入失败，请检查文件格式')
    }
  }

  const columns = useMemo(() => {
    const base = [
      { 
        key: 'year', 
        label: head('年份'), 
        type: 'select',
        options: years.map(y => ({ value: y, label: `${y}年` })),
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200'
      },
      { key: 'plan_name', label: head('计划名称'), required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200' },
      { 
        key: 'department', 
        label: head('负责部门'), 
        type: 'select',
        options: departments.map(dept => ({ value: dept.name, label: dept.name })),
        required: true,
        headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200',
        render: (value) => value || '-'
      },
      { 
        key: 'category', 
        label: head('类别'), 
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
          const map = {
            'strategic': '战略性事件',
            'strateg': '战略性事件',
            'operational': '运营性事件',
            'risk': '风险性事件',
            'opportunity': '机会性事件'
          }
          return map[value] || value
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
        key: 'start_date', 
        label: head('开始日期'), 
        type: 'date',
        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200'
      },
      { 
        key: 'end_date', 
        label: head('结束日期'), 
        type: 'date',
        headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200'
      },
      { key: 'budget', label: head('预算（万元）'), type: 'number', headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' },
      { key: 'responsible_person', label: head('负责人'), headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' },
      { 
        key: 'status', 
        label: head('状态'), 
        type: 'select',
        options: [
          { value: 'planning', label: '规划中' },
          { value: 'preparing', label: '准备中' },
          { value: 'executing', label: '执行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' }
        ],
        headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs ${
            value === 'completed' ? 'bg-green-100 text-green-800' :
            value === 'executing' ? 'bg-blue-100 text-blue-800' :
            value === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-green-100 text-green-800'
          }`}>
            {value === 'completed' ? '已完成' :
             value === 'executing' ? '执行中' :
             value === 'preparing' ? '准备中' :
             value === 'cancelled' ? '已取消' : '规划中'}
          </span>
        )
      },
      { key: 'description', label: head('预期成果'), type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200' },
      { key: 'remarks', label: head('备注'), type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' }
    ]

    if (filters.year === 2025) {
      return base.map(c => ({ ...c, required: c.key !== 'remarks' }))
    }
    return base
  }, [filters.year, departments, years])

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="年度工作落地规划"
        subTitle="制定和管理企业年度工作计划的具体落地实施方案"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setFilters({ ...filters, year: y }) }}
        years={years}
        right={(
          <div className="flex space-x-3 items-center whitespace-nowrap overflow-x-auto">
            <button
              onClick={() => setShowYearModal(true)}
              className="year-add-btn-light"
              title="添加年份"
              aria-label="添加年份"
            >
              <Plus size={18} />
              <span>添加年份</span>
            </button>
          </div>
        )}
      />

      

      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-xl overflow-visible">
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
          hideDefaultAdd={true}
          addHeader={`新增${(addOverrideYear ?? filters.year)}年度工作落地规划`}
          addSubHeader="请填写必填项（*），提交前请确认日期与部门信息"
          addHeaderRight={(
            <div className="flex items-center gap-2">
              <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{(addOverrideYear ?? filters.year)}年</div>
              <button
                type="button"
                onClick={() => setShowYearModal(true)}
                className="year-add-btn-light"
                title="添加年份"
                aria-label="添加年份"
              >
                <Plus size={16} />
                <span>添加年份</span>
              </button>
            </div>
          )}
          prefill={{ year: filters.year }}
          triggerAdd={triggerAdd}
          triggerPrefill={triggerPrefill}
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
          tableClassName={filters.year === 2025 ? "table-excel-borders table-compact min-w-[2200px]" : "table-excel-borders min-w-[1500px]"}
          tableContainerClassName="overflow-x-auto"
          headerActionsLeft={(
            <div className={floatingButtonClass}>
              <div className="relative">
                <button
                  className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold"
                  onClick={() => setFilterOpen(v => !v)}
                  title="筛选"
                >
                  <Filter size={16} />
                  <span>筛选</span>
                </button>
                
              </div>
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
              <label htmlFor="import-annual-work" className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold cursor-pointer">
                <Upload size={16} />
                <span>导入Excel</span>
                <input id="import-annual-work" name="import-annual-work" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
              </label>
              <button
                className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg hover:from-indigo-600 hover:to-violet-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold"
                onClick={() => { setAddOverrideYear(2025); setTriggerPrefill({ year: 2025 }); setTriggerAdd(v => !v) }}
                title="新增2025年度工作落地规划"
                aria-label="新增2025年度工作落地规划"
              >
                <Plus size={16} />
                <span>新增2025年度工作落地规划</span>
              </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="panel-department" className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                  <select id="panel-department" name="department"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
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
                  <label htmlFor="panel-category" className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select id="panel-category" name="category"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200 text-sm"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">全部类型</option>
                    <option value="strategic">战略</option>
                    <option value="operational">运营</option>
                    <option value="project">项目</option>
                    <option value="improvement">改进</option>
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
                    <option value="planning">规划中</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="suspended">已暂停</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="panel-month" className="block text-sm font-medium text-gray-700 mb-1">月份</label>
                  <select id="panel-month" name="month"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 text-sm"
                    value={filters.month}
                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  >
                    <option value="">全部月份</option>
                    <option value="1">1月</option>
                    <option value="2">2月</option>
                    <option value="3">3月</option>
                    <option value="4">4月</option>
                    <option value="5">5月</option>
                    <option value="6">6月</option>
                    <option value="7">7月</option>
                    <option value="8">8月</option>
                    <option value="9">9月</option>
                    <option value="10">10月</option>
                    <option value="11">11月</option>
                    <option value="12">12月</option>
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
                      if (years.includes(n)) { setYearError('年份已存在'); setFilters(prev => ({ ...prev, year: n })); return }
                      const next = [...years, n].sort((a,b)=>a-b)
                      setYears(next); persistYears(next)
                      setFilters(prev => ({ ...prev, year: n }))
                      persistSelectedYear(n, true)
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
                      {filters.year === y
                        ? <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">当前</span>
                        : <button className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => { setFilters(prev => ({ ...prev, year: y })); persistSelectedYear(y, true) }}>设为当前</button>}
                      <button
                        onClick={() => {
                          const next = years.filter(v=>v!==y)
                          const fallback = next[next.length-1] || new Date().getFullYear()
                          if (next.length === 0) { setYears([fallback]); persistYears([fallback]) }
                          else { setYears(next); persistYears(next) }
                          if (filters.year===y) { setFilters(prev => ({ ...prev, year: fallback })); persistSelectedYear(fallback, true) }
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

export default AnnualWorkPlan
