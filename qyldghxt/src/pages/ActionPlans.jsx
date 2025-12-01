import React, { useState, useEffect } from 'react'
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
  Trash2
} from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import { exportToExcel } from '../utils/export'
import { api } from '../utils/api'
import * as XLSX from 'xlsx'
import { computeActionPlanStatus, normalizeProgress } from '../utils/status'

const ActionPlans = () => {
  const { getActionPlans, addActionPlan, updateActionPlan, deleteActionPlan, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [plans, setPlans] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    department: '',
    status: '',
    month: ''
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [years, setYears] = useState([2024, 2025, 2026])
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')
  

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
      const corrected = (data || []).map(p => {
        const s = computeStatus(p.progress, p.when)
        return s === p.status ? p : { ...p, status: s }
      })
      const paletteKeys = ['c_sky','c_indigo','c_rose','c_amber','c_emerald','c_purple','c_cyan','c_fuchsia','c_lime','c_orange','c_teal']
      const colored = filters.year === 2025 
        ? corrected.map((p, i) => ({ ...p, row_color: paletteKeys[i % paletteKeys.length] }))
        : corrected
      setPlans(colored)
      const mismatches = (data || []).filter(p => computeStatus(p.progress, p.when) !== p.status)
      if (mismatches.length) {
        try {
          await Promise.all(mismatches.map(p => updateActionPlan(p.id, { status: computeStatus(p.progress, p.when), year: p.year })))
        } catch (e) {}
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
    planData.progress = normalizeProgress(planData.progress)
    planData.status = computeStatus(planData.progress, planData.when)
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
    const progress = data.progress !== undefined ? data.progress : current?.progress
    const when = data.when !== undefined ? data.when : current?.when
    const nextProgress = normalizeProgress(progress)
    const next = { ...data, progress: nextProgress, status: computeStatus(nextProgress, when) }
    const keys = ['year','goal','when','what','who','how','why','how_much','department','priority','status','progress','expected_result','actual_result','remarks']
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
    handleAdd(newData)
  }

  const handleExportToExcel = () => {
    try {
      const exportData = plans.map(p => ({
        year: p.year,
        goal: p.goal,
        when: p.when,
        what: p.what,
        who: p.who,
        how: p.how,
        why: p.why,
        how_much: p.how_much,
        department: p.department,
        priority: p.priority,
        status: p.status,
        progress: p.progress,
        expected_result: p.expected_result,
        actual_result: p.actual_result,
        remarks: p.remarks
      }))
      exportToExcel(exportData, `5W2H行动计划_${filters.year}年`, '行动计划', 'actionPlans')
    } catch (error) {
      console.error('导出Excel失败:', error)
      alert('导出失败，请稍后重试')
    }
  }

  const handleAddYear = async () => {
    const next = (years && years.length ? Math.max(...years) + 1 : new Date().getFullYear())
    const updated = Array.from(new Set([...(years || []), next])).sort((a,b)=>a-b)
    setYears(updated)
    setYearChangeByUser(true)
    setFilters(prev => ({ ...prev, year: next }))
    await persistYears(updated)
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
          goal: row['目标'] || row['目标（Smart）'] || row['目标（SMART）'] || '',
          when: row['日期'] || row['日期（何时做When）'] || row['When（什么时候做）'] || '',
          what: row['事项'] || row['事项（做什么What）'] || row['What（做什么）'] || '',
          who: row['执行人/协同人'] || row['执行人/协同人（谁来做Who）'] || row['Who（谁来做）'] || '',
          how: row['策略方法/执行步骤/行动方案'] || row['策略方法/执行步骤/行动方案（如何做How）'] || row['How（如何做）'] || '',
          why: row['价值'] || row['价值（为什么Why）'] || row['Why（为什么做）'] || '',
          how_much: row['投入预算/程度/数量'] || row['投入预算/程度/数量（做多少How much）'] || row['How Much（多少成本）'] || null,
          department: row['部门'] || '',
          priority: row['优先级'] || '',
          progress: row['进度（%）'] ? Number(row['进度（%）']) : 0
        }
        payload.status = computeStatus(payload.progress, payload.when)
        await addActionPlan(payload)
      }
      await loadPlans()
      alert('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      alert('导入失败，请检查文件格式')
    }
  }

  const columns = [
    { 
      key: 'year', 
      label: '年份', 
      type: 'select',
      options: years.map(y => ({ value: y, label: `${y}年` })),
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200'
    },
    { key: 'goal', label: '目标', required: true, type: 'textarea', hint: '明确目标，符合可衡量、可达成、相关、时限', headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200' },
    { key: 'when', label: '日期', type: 'date', required: true, hint: '选择时间节点或截止日期', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200', onChange: (value, setFormData, prev) => { const next = { ...prev, when: value }; const p = normalizeProgress(next.progress); const s = computeStatus(p, value); setFormData({ ...next, progress: p, status: s }); } },
    { key: 'what', label: '事项', required: true, type: 'textarea', hint: '明确要做的具体事项', headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200' },
    { key: 'who', label: '执行人/协同人', required: true, hint: '填写负责人或团队', headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200' },
    { key: 'how', label: '策略方法/执行步骤/行动方案', type: 'textarea', hint: '关键步骤与方法', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' },
    { key: 'why', label: '价值', required: true, type: 'textarea', hint: '说明目的与预期价值', headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200' },
    { key: 'how_much', label: '投入预算/程度/数量', type: 'number', hint: '预算或资源投入', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200' },
    { 
      key: 'department', 
      label: '负责部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.name, label: dept.name })),
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-indigo-100 to-indigo-200 border-b border-gray-200'
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
      headerClassName: 'text-gray-800 bg-gradient-to-r from-orange-100 to-orange-200 border-b border-gray-200',
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
      key: 'status', 
      label: '状态', 
      type: 'select',
      required: true,
      options: [
        { value: 'not_started', label: '未开始' },
        { value: 'in_progress', label: '进行中' },
        { value: 'completed', label: '已完成' },
        { value: 'delayed', label: '延期' }
      ],
      headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200',
      render: (value, item) => (
        (() => {
          const v = computeStatus(item?.progress, item?.when)
          return (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              v === 'completed' ? 'bg-green-100 text-green-800' :
              v === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              v === 'delayed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {v === 'completed' ? '已完成' :
               v === 'in_progress' ? '进行中' :
               v === 'delayed' ? '延期' : '未开始'}
            </span>
          )
        })()
      ),
      disabled: true
    },
    { key: 'progress', label: '进度（%）', type: 'number', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-teal-100 to-teal-200 border-b border-gray-200', onChange: (value, setFormData, prev) => { const p = normalizeProgress(value); const next = { ...prev, progress: p }; const s = computeStatus(p, next.when); setFormData({ ...next, status: s }); } },
    { key: 'expected_result', label: '预期结果', type: 'textarea', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200' },
    { key: 'actual_result', label: '实际结果', type: 'textarea', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200' },
    { key: 'remarks', label: '备注', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200' }
  ]

  return (
    <div className="space-y-8">
      <PageHeaderBanner
        title="5W2H行动计划"
        subTitle="年度行动方案制定与落地"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setFilters({ ...filters, year: y }) }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
        
      />

      

      {/* 5W2H方法说明 - 现代化设计 */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-3xl shadow-2xl p-8 border border-white/50">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
            <Target size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">5W2H分析法说明</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-orange-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Target size={16} className="text-orange-600" />
              </div>
              <strong className="text-orange-700">目标（Smart）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确目标，符合可衡量、可达成、相关、时限</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-red-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Calendar size={16} className="text-red-600" />
              </div>
              <strong className="text-red-700">日期（何时做When）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确时间节点和期限</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText size={16} className="text-blue-600" />
              </div>
              <strong className="text-blue-700">事项（做什么What）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确要做的具体事情</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users size={16} className="text-purple-600" />
              </div>
              <strong className="text-purple-700">执行人/协同人（谁来做Who）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确负责人和参与者</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-indigo-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Settings size={16} className="text-indigo-600" />
              </div>
              <strong className="text-indigo-700">策略方法/执行步骤/行动方案（如何做How）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确实施方法和步骤</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Target size={16} className="text-green-600" />
              </div>
              <strong className="text-green-700">价值（为什么Why）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确做这件事的目的和意义</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-teal-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <DollarSign size={16} className="text-teal-600" />
              </div>
              <strong className="text-teal-700">投入预算/程度/数量（做多少How much）</strong>
            </div>
            <p className="text-gray-700 text-sm">明确所需资源和成本</p>
          </div>
        </div>
      </div>

      <TableManager
        title={`${filters.year}年度5W2H行动计划表`}
        data={plans}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onView={(item) => setViewItem(item)}
        editingId={editingId}
        onEditingChange={setEditingId}
        addHeader={`新增${filters.year}年5W2H行动计划`}
        addSubHeader="完善必填项，支持内联提示与实时进度预览"
        addBadge={String(filters.year)}
        addTheme="from-teal-600 to-emerald-600"
        prefill={{ year: filters.year, status: 'not_started', priority: '', progress: 0 }}
        tableClassName="table-excel ap-5w2h-relaxed"
        tableContainerClassName="ap-5w2h-scroll"
        compact={false}
        ultraCompact={false}
        medium={false}
        ellipsisAll={false}
        headerEllipsis={true}
        ellipsisKeys={[]}
        singleLineNoEllipsis={true}
        rowColorBy={filters.year === 2025 ? 'row_color' : undefined}
        rowColorMap={{
          c_sky: 'bg-sky-50',
          c_indigo: 'bg-indigo-50',
          c_rose: 'bg-rose-50',
          c_amber: 'bg-amber-50',
          c_emerald: 'bg-emerald-50',
          c_purple: 'bg-purple-50',
          c_cyan: 'bg-cyan-50',
          c_fuchsia: 'bg-fuchsia-50',
          c_lime: 'bg-lime-50',
          c_orange: 'bg-orange-50',
          c_teal: 'bg-teal-50'
        }}
        actionsHeaderClassName="text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-200"
        headerActionsLeft={(
          <div className="relative flex items-center gap-2">
            <button 
              className="h-10 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg flex items-center justify-center text-sm gap-2"
              onClick={() => setIsFilterOpen(prev => !prev)}
            >
              <Filter size={16} />
              <span>筛选</span>
            </button>
            <button 
              className="h-10 px-3 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 shadow flex items-center justify-center text-sm gap-2"
              onClick={() => setFilters(prev => ({ ...prev, department: '', status: '', month: '' }))}
            >
              <RefreshCcw size={16} className="text-gray-700" />
              <span>重置</span>
            </button>
            <button 
              className="h-10 px-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg flex items-center justify-center text-sm gap-2"
              onClick={handleExportToExcel}
            >
              <Download size={16} />
              <span>导出Excel</span>
            </button>
            <input id="ap-import-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => { const f = e.target.files && e.target.files[0]; if (f) { await handleImportFromExcel(f); e.target.value = '' } }} />
            <button 
              className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center text-sm gap-2"
              onClick={() => document.getElementById('ap-import-input')?.click()}
            >
              <Upload size={16} />
              <span>导入Excel</span>
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

      {showYearModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text白 flex items-center justify-between">
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
                    className="h-10 w-40 px-3 bg白 text-gray-800 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50"
                  />
                  <button
                    onClick={async () => {
                      const v = String(newYear || '').trim()
                      if (!v) { setYearError('请输入有效年份（1900-2100）'); return }
                      const n = parseInt(v)
                      if (isNaN(n) || n < 1900 || n > 2100) { setYearError('请输入有效年份（1900-2100）'); return }
                      if (years.includes(n)) { setYearError('年份已存在'); setFilters(prev => ({ ...prev, year: n })); return }
                      const updated = [...years, n].sort((a,b)=>a-b)
                      setYears(updated)
                      await persistYears(updated)
                      setYearChangeByUser(true)
                      setFilters(prev => ({ ...prev, year: n }))
                      setNewYear('')
                      setYearError('')
                      setShowYearModal(false)
                    }}
                    className="px-4 h-10 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text白 rounded-xl hover:from-blue-600 hover:to-purple-700"
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
                          onClick={() => { setYearChangeByUser(true); setFilters(prev => ({ ...prev, year: y })) }}
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

      {viewItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3">
          <div className="w-[640px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold">查看行动计划</div>
                  <div className="text-xs opacity-90 mt-1">{filters.year}年度 · {viewItem.department || '未设置部门'}</div>
                </div>
              </div>
              <button onClick={() => setViewItem(null)} className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800">
                关闭
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[65vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                  <div className="text-xs font-semibold text-sky-700">年度</div>
                  <div className="mt-2 text-sm text-gray-800">{viewItem.year ?? filters.year}</div>
                </div>
                <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3">
                  <div className="text-xs font-semibold text-teal-700">目标</div>
                  <div className="mt-2 text-sm text-gray-800">{viewItem.goal || '-'}</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-xs font-semibold text-rose-700">日期</div>
                  <div className="mt-2 text-sm text-gray-800">{viewItem.when || '-'}</div>
                </div>
                <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <div className="text-xs font-semibold text-blue-700">事项</div>
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{viewItem.what || '-'}</div>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3">
                  <div className="text-xs font-semibold text-purple-700">执行人/协同人</div>
                  <div className="mt-2 text-sm text-gray-800">{viewItem.who || '-'}</div>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                  <div className="text-xs font-semibold text-indigo-700">负责部门</div>
                  <div className="mt-2 text-sm text-gray-800">{viewItem.department || '-'}</div>
                </div>
                <div className="md:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                  <div className="text-xs font-semibold text-indigo-700">策略方法/执行步骤/行动方案</div>
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{viewItem.how || '-'}</div>
                </div>
                <div className="md:col-span-2 rounded-2xl border border-green-100 bg-green-50 p-3">
                  <div className="text-xs font-semibold text-green-700">价值</div>
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{viewItem.why || '-'}</div>
                </div>
                <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3">
                  <div className="text-xs font-semibold text-teal-700">投入预算/程度/数量</div>
                  <div className="mt-2 text-sm text-gray-800">{viewItem.how_much ?? '-'}</div>
                </div>
                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3">
                  <div className="text-xs font-semibold text-yellow-700">优先级</div>
                  <div className="mt-2 text-xs">
                    <span className={`${viewItem.priority==='high'?'bg-red-100 text-red-800':viewItem.priority==='medium'?'bg-yellow-100 text-yellow-800':viewItem.priority==='low'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'} px-2 py-1 rounded-full`}>
                      {viewItem.priority==='high'?'高':viewItem.priority==='medium'?'中':viewItem.priority==='low'?'低':(viewItem.priority||'-')}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <div className="text-xs font-semibold text-blue-700">状态</div>
                  <div className="mt-2 text-xs">
                    <span className={`${viewItem.status==='completed'?'bg-green-100 text-green-800':viewItem.status==='in_progress'?'bg-blue-100 text-blue-800':viewItem.status==='delayed'?'bg-red-100 text-red-800':'bg-gray-100 text-gray-800'} px-2 py-1 rounded-full`}>
                      {viewItem.status==='completed'?'已完成':viewItem.status==='in_progress'?'进行中':viewItem.status==='delayed'?'延期':viewItem.status==='not_started'?'未开始':(viewItem.status||'-')}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-3">
                  <div className="text-xs font-semibold text-cyan-700">进度（%）</div>
                  <div className="mt-2 text-sm text-gray-800">{viewItem.progress ?? '-'}</div>
                </div>
                <div className="md:col-span-2 rounded-2xl border border-violet-100 bg-violet-50 p-3">
                  <div className="text-xs font-semibold text-violet-700">预期结果</div>
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{viewItem.expected_result || '-'}</div>
                </div>
                <div className="md:col-span-2 rounded-2xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-xs font-semibold text-rose-700">实际结果</div>
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{viewItem.actual_result || '-'}</div>
                </div>
                <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700">备注</div>
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{viewItem.remarks || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {false && (
      <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((item) => (
            <div key={item.id || `${item.what}-${item.when}`} className="bg-white/90 rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate">{item.goal || '未填写目标'}</div>
                    <div className="mt-1 text-xs opacity-90 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20">{item.department || '未设置部门'}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20">{item.when || '未选择日期'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      item.priority === 'high' ? 'bg-red-100 text-red-800' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>{item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      item.status === 'completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'delayed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{item.status === 'completed' ? '已完成' : item.status === 'in_progress' ? '进行中' : item.status === 'delayed' ? '延期' : '未开始'}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <div className="text-xs font-semibold text-blue-700 mb-1">事项（What）</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{item.what || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-green-100 bg-green-50/40 p-3">
                    <div className="text-xs font-semibold text-green-700 mb-1">价值（Why）</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{item.why || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                    <div className="text-xs font-semibold text-purple-700 mb-1">执行人/协同人（Who）</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{item.who || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">策略方法/执行步骤（How）</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{item.how || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 sm:col-span-2">
                    <div className="text-xs font-semibold text-teal-700 mb-1">投入预算/程度/数量（How Much）</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{(item.how_much ?? '') !== '' ? item.how_much : '-'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-500">进度：<span className="font-semibold text-gray-700">{Number(item.progress || 0)}%</span></div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
                      onClick={() => { setTriggerEditPrefill(item); setTriggerEdit(v => !v) }}
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-800 transition-colors p-2 rounded-lg hover:bg-green-50"
                      onClick={() => handleCopy(item)}
                      title="复制"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50"
                      onClick={() => handleDelete(item.id)}
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {(!plans || plans.length === 0) && (
          <div className="empty-state">
            <div className="text-gray-600">暂无行动计划</div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

export default ActionPlans
