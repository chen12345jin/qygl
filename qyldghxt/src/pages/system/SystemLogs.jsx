import React, { useState, useEffect, useMemo } from 'react'
import { formatDateTime } from '../../utils/locale.js'
import { FileText, Download, Trash2, X, Filter, RefreshCcw } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import TableManager from '../../components/TableManager'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../../utils/export'
import toast from 'react-hot-toast'
import { api } from '../../utils/api.js'

const SystemLogs = () => {
  const { getSystemLogs } = useData()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [selectedLogIds, setSelectedLogIds] = useState([])
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [currentLog, setCurrentLog] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    username: '',
    action_type: '',
    startDate: '',
    endDate: '',
    status: ''
  })

  const getFilterCount = () => {
    let count = 0
    if (filters.username) count++
    if (filters.action_type) count++
    if (filters.startDate) count++
    if (filters.endDate) count++
    if (filters.status) count++
    return count
  }
  const filterCount = getFilterCount()

  const resetFilters = () => {
    setFilters({
      username: '',
      action_type: '',
      startDate: '',
      endDate: '',
      status: ''
    })
    toast.success('已重置筛选')
  }

  useEffect(() => {
    setPage(1)
    loadLogs()
  }, [filters])

  useEffect(() => {
    loadLogs()
  }, [page, pageSize])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await getSystemLogs({ page, pageSize, ...filters })
      if (!result || !result.success) {
        const msg = result?.error || '加载系统日志失败'
        console.error('加载日志失败:', msg)
        toast.error(msg)
        setLogs([])
        setTotal(0)
        return
      }
      const data = result.data || {}
      const list = Array.isArray(data.data) ? data.data : []
      setLogs(list)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('加载日志异常:', error)
      toast.error('加载系统日志时发生异常')
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!logs || logs.length === 0) {
      toast('当前没有可导出的数据', { icon: 'ℹ️' })
      return
    }

    const toastId = toast.loading('正在导出数据...', { duration: 0 })

    setTimeout(() => {
      try {
        const exportData = logs.map(log => ({
          created_at: log.created_at,
          username: log.username,
          action_type: log.action_type,
          details: log.details,
          ip_address: log.ip_address || '-',
          status: log.status === 'success' ? '成功' : '失败'
        }))

        exportToExcel(exportData, `系统日志`, '系统日志', 'systemLogs')
        toast.success(`已导出 ${exportData.length} 条到 Excel`, { id: toastId })
      } catch (error) {
        console.error('导出Excel失败:', error)
        toast.error('导出失败，请稍后重试', { id: toastId })
      }
    }, 100)
  }

  const handleDeleteLog = async (logId) => {
    try {
      const result = await api.delete(`/logs/${logId}`)
      if (result.data.success) {
        toast.success('日志删除成功')
        loadLogs()
        return true
      } else {
        throw new Error(result.data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除日志失败:', error)
      toast.error('删除日志失败')
      return false
    }
  }

  const handleBatchDelete = async () => {
    if (selectedLogIds.length === 0) {
      toast('请先选择要删除的日志', { icon: 'ℹ️' })
      return
    }

    if (!window.confirm(`确定要删除选中的 ${selectedLogIds.length} 条日志吗？`)) {
      return
    }

    try {
      let successCount = 0
      for (const logId of selectedLogIds) {
        const result = await api.delete(`/logs/${logId}`)
        if (result.data.success) {
          successCount++
        }
      }
      toast.success(`成功删除 ${successCount} 条日志`)
      setSelectedLogIds([])
      loadLogs()
    } catch (error) {
      console.error('批量删除日志失败:', error)
      toast.error('批量删除日志失败')
    }
  }

  const handleDeleteAllLogs = async () => {
    if (!window.confirm('确定要删除所有日志记录吗？此操作不可恢复！')) {
      return
    }

    try {
      const result = await api.delete('/logs')
      if (result.data.success) {
        toast.success('所有日志已成功删除')
        loadLogs()
        setSelectedLogIds([])
      } else {
        throw new Error(result.data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除所有日志失败:', error)
      toast.error('删除所有日志失败')
    }
  }

  const columns = useMemo(() => [
    { 
      key: 'created_at', 
      label: '时间',
      render: (value) => <span className="text-sm text-gray-500">{formatDateTime(value)}</span>
    },
    { 
      key: 'username', 
      label: '用户',
      render: (value) => <span className="font-medium text-gray-900">{value}</span>
    },
    { 
      key: 'ip_address', 
      label: 'IP地址',
      render: (value) => <span className="text-sm text-gray-500 font-mono">{value || '-'}</span>
    },
    { 
      key: 'action_type', 
      label: '操作类型',
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'LOGIN' ? 'bg-blue-100 text-blue-800' :
          value === 'VIEW' ? 'bg-gray-100 text-gray-800' :
          value === 'CREATE' ? 'bg-green-100 text-green-800' :
          value === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
          value === 'DELETE' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value === 'LOGIN' ? '登录' :
           value === 'VIEW' ? '查看' :
           value === 'CREATE' ? '新增' :
           value === 'UPDATE' ? '修改' :
           value === 'DELETE' ? '删除' :
           value}
        </span>
      )
    },
    { 
      key: 'details', 
      label: '详情',
      render: (value) => <span className="text-sm text-gray-500 block truncate max-w-xs" title={value}>{value}</span>
    },
    { 
      key: 'status', 
      label: '状态',
      render: (value) => (
        value === 'success' ? (
          <span className="text-green-600 flex items-center text-sm">
            <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></div>
            成功
          </span>
        ) : (
          <span className="text-red-600 flex items-center text-sm">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></div>
            失败
          </span>
        )
      )
    }
  ], [])

  return (
    <div className="space-y-6">
      <PageHeaderBanner 
        title="系统日志" 
        subTitle="查看系统操作记录和安全审计日志"
        icon={FileText}
      />



      <div className="unified-table-wrapper">
        <TableManager
          title="日志列表"
          data={logs}
          columns={columns}
          hideDefaultAdd={true} // 隐藏新增按钮
          onDelete={handleDeleteLog}
          onView={(log) => {
            setCurrentLog(log)
            setShowDetailModal(true)
          }}
          rowSelection={{
            selectedRowKeys: selectedLogIds,
            onChange: setSelectedLogIds
          }}
          pagination={{
            page,
            pageSize,
            total,
            onChange: ({ page: p, pageSize: s }) => { setPage(p); setPageSize(s) }
          }}
          tableClassName="unified-data-table"
          tableContainerClassName="unified-table-scroll"
          headerActionsLeft={(
            <div className="flex items-center space-x-2 mr-2">
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
                className={`px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold ${
                  !(filters.username || filters.action_type || filters.startDate || filters.endDate || filters.status) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                onClick={resetFilters}
                disabled={!(filters.username || filters.action_type || filters.startDate || filters.endDate || filters.status)}
                title="重置筛选"
              >
                <RefreshCcw size={16} />
                <span>重置</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 text-gray-700"
                title="导出Excel"
              >
                <Download size={16} />
                <span>导出Excel</span>
              </button>
               <button
                  onClick={handleBatchDelete}
                  disabled={selectedLogIds.length === 0}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    selectedLogIds.length === 0 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <Trash2 size={16} />
                  <span>批量删除</span>
                </button>
                <button
                  onClick={handleDeleteAllLogs}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 size={16} />
                  <span>删除所有</span>
                </button>
            </div>
          )}
          children={
            filterOpen && (
              <div className="card p-6 mb-4">
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">操作用户</label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                      placeholder="输入用户名..."
                      value={filters.username}
                      onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                      value={filters.action_type}
                      onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                    >
                      <option value="">全部</option>
                      <option value="LOGIN">登录</option>
                      <option value="VIEW">查看</option>
                      <option value="CREATE">新增</option>
                      <option value="UPDATE">修改</option>
                      <option value="DELETE">删除</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                    <input
                      type="date"
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                    <input
                      type="date"
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 text-sm"
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                      <option value="">全部</option>
                      <option value="success">成功</option>
                      <option value="failed">失败</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          }
        />
      </div>

      {/* 日志详情模态框 */}
      {showDetailModal && currentLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">日志详情</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">时间</label>
                    <div className="text-sm text-gray-900">{formatDateTime(currentLog.created_at)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">用户</label>
                    <div className="text-sm text-gray-900 font-medium">{currentLog.username}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">IP地址</label>
                    <div className="text-sm text-gray-900 font-mono">{currentLog.ip_address || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">操作类型</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentLog.action_type === 'LOGIN' ? 'bg-blue-100 text-blue-800' :
                      currentLog.action_type === 'VIEW' ? 'bg-gray-100 text-gray-800' :
                      currentLog.action_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                      currentLog.action_type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                      currentLog.action_type === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {currentLog.action_type === 'LOGIN' ? '登录' :
                       currentLog.action_type === 'VIEW' ? '查看' :
                       currentLog.action_type === 'CREATE' ? '新增' :
                       currentLog.action_type === 'UPDATE' ? '修改' :
                       currentLog.action_type === 'DELETE' ? '删除' :
                       currentLog.action_type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentLog.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {currentLog.status === 'success' ? '成功' : '失败'}
                    </span>
                  </div>
                </div>
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">详细信息</label>
                    <div className="mt-1 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 whitespace-pre-wrap">
                      {currentLog.details}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 space-x-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SystemLogs
