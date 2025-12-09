import React, { useState, useEffect } from 'react'
import TableManager from '../components/TableManager'
import { useData } from '../contexts/DataContext'
import { TrendingUp, Filter, RefreshCcw, Download, Upload, Calendar, Plus, X, Trash2 } from 'lucide-react'
import PageHeaderBanner from '../components/PageHeaderBanner'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/export'
import toast from 'react-hot-toast'

const MonthlyProgress = () => {
  const { getMonthlyProgress, addMonthlyProgress, updateMonthlyProgress, deleteMonthlyProgress, getDepartments, getSystemSettings, addSystemSetting, updateSystemSetting } = useData()
  const [progress, setProgress] = useState([])
  const [departments, setDepartments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    department: '',
    status: ''
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [years, setYears] = useState([2024, 2025, 2026])
  const [yearsSettingId, setYearsSettingId] = useState(null)
  const [currentYearSettingId, setCurrentYearSettingId] = useState(null)
  const [yearChangeByUser, setYearChangeByUser] = useState(false)
  const [showMonthModal, setShowMonthModal] = useState(false)
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [yearError, setYearError] = useState('')

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

  const loadProgress = async () => {
    const result = await getMonthlyProgress(filters)
    if (result.success) {
      setProgress(result.data || [])
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
      year: filters.year
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
    const result = await updateMonthlyProgress(id, data)
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

  const handleExportToExcel = () => {
    try {
      if (!progress || progress.length === 0) {
        toast('当前没有可导出的数据', { icon: 'ℹ️' })
        return
      }
      const exportData = progress.map(p => ({
        year: p.year,
        month: p.month,
        department: p.department,
        task_name: p.task_name,
        target_value: p.target_value,
        actual_value: p.actual_value,
        completion_rate: p.completion_rate,
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
        responsible_person: p.responsible_person
      }))
      exportToExcel(exportData, `月度推进计划_${filters.year}年`, '月度推进', 'monthlyProgress')
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
        const payload = {
          year: Number(row['年度'] || filters.year),
          month: row['月份'] ? Number(row['月份']) : null,
          department: row['部门'] || '',
          task_name: row['任务名称'] || '',
          target_value: row['目标'] ? Number(row['目标']) : null,
          actual_value: row['实际'] ? Number(row['实际']) : null,
          progress: row['进度'] ? Number(row['进度']) : null,
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
      alert('导入完成')
    } catch (e) {
      console.error('导入失败:', e)
      alert('导入失败，请检查文件格式')
    }
  }

  const columns = [
    { 
      key: 'year', 
      label: '年度', 
      type: 'select',
      options: years.map(y => ({ value: y, label: `${y}年` })),
      required: true,
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
      headerClassName: 'text-gray-800 bg-gradient-to-r from-blue-100 to-blue-200 border-b border-gray-200 sticky top-0 z-10',
      render: (value) => {
        if (!value) return '-'
        return (
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-gray-200">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-[9px] font-bold mr-1">
              {value}
            </div>
            <span className="text-[11px] font-medium text-gray-700">月</span>
          </div>
        )
      }
    },
    { key: 'task_name', label: '任务名称', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200 sticky top-0 z-10' },
    { 
      key: 'department', 
      label: '负责部门', 
      type: 'select',
      options: departments.map(dept => ({ value: dept.name, label: dept.name })),
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-green-100 to-green-200 border-b border-gray-200 sticky top-0 z-10'
    },
    { key: 'responsible_person', label: '负责人', required: true, headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'target_value', label: '目标值', type: 'number', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'actual_value', label: '实际值', type: 'number', headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200 sticky top-0 z-10' },
    { 
      key: 'completion_rate', 
      label: '完成率', 
      headerClassName: 'text-gray-800 bg-gradient-to-r from-purple-100 to-purple-200 border-b border-gray-200 sticky top-0 z-10',
      render: (value, item) => {
        const rate = item.actual_value && item.target_value 
          ? (item.actual_value / item.target_value * 100).toFixed(1)
          : 0
        return (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          rate >= 100 ? 'bg-green-100 text-green-800' :
          rate >= 80 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {rate}%
        </span>
        )
      }
    },
    { 
      key: 'status', 
      label: '状态', 
      type: 'select',
      options: [
        { value: 'on_track', label: '按计划进行' },
        { value: 'delayed', label: '延期' },
        { value: 'ahead', label: '提前完成' },
        { value: 'at_risk', label: '有风险' }
      ],
      required: true,
      headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10',
      render: (value) => (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          value === 'ahead' ? 'bg-green-100 text-green-800' :
          value === 'on_track' ? 'bg-blue-100 text-blue-800' :
          value === 'delayed' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {value === 'ahead' ? '提前完成' :
           value === 'on_track' ? '按计划进行' :
           value === 'delayed' ? '延期' : '有风险'}
        </span>
      )
    },
    { key: 'start_date', label: '开始日期', type: 'date', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'end_date', label: '结束日期', type: 'date', headerClassName: 'text-gray-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'key_activities', label: '关键活动', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'achievements', label: '主要成果', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'challenges', label: '遇到的挑战', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'next_month_plan', label: '下月计划', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' },
    { key: 'support_needed', label: '需要支持', type: 'textarea', headerClassName: 'text-gray-800 bg-gradient-to-r from-red-100 to-red-200 border-b border-gray-200 sticky top-0 z-10' }
  ]

  const finalColumns = filters.year === 2025 ? columns.map(c => ({ ...c, required: true })) : columns

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="月度推进计划"
        subTitle="跟踪和管理各项工作的月度执行进展情况"
        year={filters.year}
        onYearChange={(y)=>{ setYearChangeByUser(true); setFilters({ ...filters, year: y }) }}
        years={years}
        onAddYear={() => setShowYearModal(true)}
        
      />

      {/* 顶部右侧筛选面板 */}
      <div className="relative">
        {/* 筛选浮层已移除，统一在表格下方显示 */}
        {showMonthModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
                <div className="font-semibold">月份筛选</div>
                <button onClick={() => setShowMonthModal(false)} className="text-white/80 hover:text-white" title="关闭">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setFilters({ ...filters, month: '' })
                      setShowMonthModal(false)
                    }}
                    className={`p-4 rounded-xl border transition-all ${
                      filters.month === '' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    全部月份
                  </button>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1
                    return (
                      <button
                        key={month}
                        onClick={() => {
                          setFilters({ ...filters, month: String(month) })
                          setShowMonthModal(false)
                        }}
                        className={`p-4 rounded-xl border transition-all ${
                          filters.month === String(month) 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {month}月
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button 
                    onClick={() => setShowMonthModal(false)} 
                    className="h-10 px-4 bg-white border border-gray-300 rounded-xl"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                        if (years.includes(n)) { setYearError('年份已存在'); setFilters(prev=>({ ...prev, year: n })); return }
                        const next = [...years, n].sort((a,b)=>a-b)
                        setYears(next)
                        persistYears(next)
                        setFilters(prev=>({ ...prev, year: n }))
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
                          : <button className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => { setFilters(prev => ({ ...prev, year: y })); persistSelectedYear(y, true) }}>设为当前</button>}
                        <button
                          onClick={() => {
                            const next = years.filter(v=>v!==y)
                            const fallback = next[next.length-1] || new Date().getFullYear()
                            if (next.length === 0) { setYears([fallback]); persistYears([fallback]) }
                            else { setYears(next); persistYears(next) }
                            if (filters.year===y) { setFilters(prev => ({ ...prev, year: fallback })); persistSelectedYear(fallback, true) }
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
        prefill={{ year: filters.year, status: 'on_track' }}
        ellipsisAll={filters.year !== 2025}
        headerEllipsis={filters.year === 2025}
        singleLineNoEllipsis={filters.year === 2025}
        tableClassName={filters.year === 2025 ? "min-w-[2200px] table-excel-borders table-compact" : "table-excel-borders"}
        tableContainerClassName={`${filters.year === 2025 ? 'overflow-x-auto overflow-y-auto max-h-[70vh]' : 'max-h-[65vh] overflow-auto'} rounded-2xl`}
        stickyHeader={filters.year === 2025}
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
          <div className="flex items-center gap-2 mr-2">
            <button
              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2"
              onClick={() => setIsFilterOpen(prev => !prev)}
            >
              <Filter size={14} />
              <span>筛选</span>
            </button>
            <button
              className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm flex items-center justify-center text-sm"
              onClick={() => {
                setFilters({
                  year: filters.year,
                  month: '',
                  department: '',
                  status: ''
                })
              }}
              title="重置筛选"
            >
              重置
            </button>
            
            <button 
              className={`px-3 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 ${progress.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleExportToExcel}
              disabled={progress.length===0}
            >
              <Download size={14} />
              <span>导出Excel</span>
            </button>
            <label htmlFor="import-monthly-progress" className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm gap-2 cursor-pointer">
              <Upload size={14} />
              <span>导入Excel</span>
              <input id="import-monthly-progress" name="import-monthly-progress" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleImportFromExcel(e.target.files[0])} />
            </label>
            {/* 清理重复功能按需求移除 */}
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
              {filters.year !== 2025 && (
                <div>
                  <label htmlFor="panel-year" className="block text-sm font-medium text-gray-700 mb-1">年度</label>
                  <select id="panel-year" name="year"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
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
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="panel-status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select id="panel-status" name="status"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-all duration-200 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">全部状态</option>
                  <option value="on_track">按计划进行</option>
                  <option value="delayed">延期</option>
                  <option value="ahead">提前完成</option>
                  <option value="at_risk">有风险</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </TableManager>
    </div>
  )
}

export default MonthlyProgress
