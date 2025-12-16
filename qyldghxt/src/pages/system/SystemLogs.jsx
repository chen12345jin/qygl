import React, { useState, useEffect } from 'react'
import { formatDateTime } from '../../utils/locale.js'
import { FileText, Search, RefreshCw, Download, Filter, Check, Trash2, Eye, X } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import Pagination from '../../components/Pagination'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { api } from '../../utils/api.js'

const SystemLogs = () => {
  const { getSystemLogs } = useData()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    username: '',
    type: '',
    startDate: '',
    endDate: ''
  })
  const [selectedLogs, setSelectedLogs] = useState([])
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [currentLog, setCurrentLog] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [page, pageSize, filters])

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

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
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
          '时间': formatDateTime(log.created_at),
          '用户': log.username,
          '操作类型': log.action_type,
          '内容': log.details,
          'IP地址': log.ip_address || '-',
          '状态': log.status === 'success' ? '成功' : '失败'
        }))

        const worksheet = XLSX.utils.json_to_sheet(exportData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, '系统日志')
        XLSX.writeFile(workbook, `系统日志_${new Date().toISOString().split('T')[0]}.xlsx`)
        toast.success(`已导出 ${logs.length} 条数据`, { id: toastId })
      } catch (error) {
        console.error('导出失败:', error)
        toast.error('导出失败: ' + error.message, { id: toastId })
      }
    }, 100)
  }

  // 删除单条日志
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('确定要删除这条日志吗？')) {
      return
    }

    try {
      const result = await api.delete(`/logs/${logId}`)
      if (result.data.success) {
        toast.success('日志删除成功')
        // 重新加载日志列表
        loadLogs()
      } else {
        throw new Error(result.data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除日志失败:', error)
      if (error?.response?.status === 401) {
        toast.error('认证失败或登录已过期，请重新登录')
      } else if (error?.response?.status === 404) {
        toast.error('删除失败：接口未找到或服务器未启动')
      } else {
        toast.error('删除日志失败')
      }
    }
  }

  // 批量删除日志
  const handleBatchDelete = async () => {
    if (selectedLogs.length === 0) {
      toast('请先选择要删除的日志', { icon: 'ℹ️' })
      return
    }

    if (!window.confirm(`确定要删除选中的 ${selectedLogs.length} 条日志吗？`)) {
      return
    }

    try {
      // 批量删除需要逐个调用API，或者后端支持批量删除
      // 这里先实现逐个删除
      let successCount = 0
      for (const logId of selectedLogs) {
        const result = await api.delete(`/logs/${logId}`)
        if (result.data.success) {
          successCount++
        }
      }
      toast.success(`成功删除 ${successCount} 条日志，失败 ${selectedLogs.length - successCount} 条`)
      // 清空选择
      setSelectedLogs([])
      // 重新加载日志列表
      loadLogs()
    } catch (error) {
      console.error('批量删除日志失败:', error)
      if (error?.response?.status === 401) {
        toast.error('认证失败或登录已过期，请重新登录')
      } else if (error?.response?.status === 404) {
        toast.error('批量删除失败：接口未找到或服务器未启动')
      } else {
        toast.error('批量删除日志失败')
      }
    }
  }

  // 删除所有日志
  const handleDeleteAllLogs = async () => {
    if (!window.confirm('确定要删除所有日志记录吗？此操作不可恢复！')) {
      return
    }

    try {
      const result = await api.delete('/logs')
      if (result.data.success) {
        toast.success('所有日志已成功删除')
        // 重新加载日志列表
        loadLogs()
        // 清空选择
        setSelectedLogs([])
      } else {
        throw new Error(result.data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除所有日志失败:', error)
      if (error?.response?.status === 401) {
        toast.error('认证失败或登录已过期，请重新登录')
      } else if (error?.response?.status === 404) {
        toast.error('删除失败：接口未找到或服务器未启动')
      } else {
        toast.error('删除所有日志失败')
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeaderBanner 
        title="系统日志" 
        subtitle="查看系统操作记录和安全审计日志"
        icon={FileText}
      />

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作用户</label>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => setFilters({...filters, username: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="输入用户名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
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
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 btn-primary flex items-center justify-center space-x-2 py-2"
            >
              <Search size={18} />
              <span>查询</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
              title="导出Excel"
            >
              <Download size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* 批量操作栏 */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              已选择 {selectedLogs.length} 条记录
            </span>
            <button
              onClick={handleBatchDelete}
              disabled={selectedLogs.length === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                selectedLogs.length === 0 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Trash2 size={16} />
              <span>批量删除</span>
            </button>
            <button
              onClick={handleDeleteAllLogs}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 size={16} />
              <span>删除所有日志</span>
            </button>
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedLogs.length === logs.length && logs.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLogs(logs.map(log => log.id))
                      } else {
                        setSelectedLogs([])
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作类型</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">详情</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogs([...selectedLogs, log.id])
                          } else {
                            setSelectedLogs(selectedLogs.filter(id => id !== log.id))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{log.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.action_type === 'LOGIN' ? 'bg-blue-100 text-blue-800' :
                        log.action_type === 'VIEW' ? 'bg-gray-100 text-gray-800' :
                        log.action_type === 'CREATE' ? 'bg-green-100 text-green-800' :
                        log.action_type === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                        log.action_type === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action_type === 'LOGIN' ? '登录' :
                         log.action_type === 'VIEW' ? '查看' :
                         log.action_type === 'CREATE' ? '新增' :
                         log.action_type === 'UPDATE' ? '修改' :
                         log.action_type === 'DELETE' ? '删除' :
                         log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="text-green-600 flex items-center text-sm">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></div>
                          成功
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center text-sm">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></div>
                          失败
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setCurrentLog(log)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="查看详情"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-red-600 hover:text-red-800"
                          title="删除日志"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    暂无日志记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={({ page: p, pageSize: s }) => { setPage(p); setPageSize(s) }}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      {/* 日志详情模态框 */}
      {showDetailModal && currentLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
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
