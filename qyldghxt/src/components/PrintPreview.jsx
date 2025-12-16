import React from 'react'
import { X, Download, FileText, Printer } from 'lucide-react'
import { exportToPDF, printElement } from '../utils/export'
import { formatDateTime } from '../utils/locale.js'
import toast from 'react-hot-toast'

// 状态值渲染
const renderStatusBadge = (value, type = 'status') => {
  if (type === 'importance') {
    const map = {
      critical: { label: '非常重要', class: 'bg-red-100 text-red-800' },
      high: { label: '重要', class: 'bg-orange-100 text-orange-800' },
      medium: { label: '一般', class: 'bg-yellow-100 text-yellow-800' },
      low: { label: '较低', class: 'bg-green-100 text-green-800' }
    }
    const item = map[value] || { label: value, class: 'bg-gray-100 text-gray-800' }
    return <span className={`px-2 py-1 rounded-full text-xs ${item.class}`}>{item.label}</span>
  }
  
  if (type === 'priority') {
    const map = {
      high: { label: '高', class: 'bg-red-100 text-red-800' },
      medium: { label: '中', class: 'bg-yellow-100 text-yellow-800' },
      low: { label: '低', class: 'bg-green-100 text-green-800' }
    }
    const item = map[value] || { label: value, class: 'bg-gray-100 text-gray-800' }
    return <span className={`px-2 py-1 rounded-full text-xs ${item.class}`}>{item.label}</span>
  }
  
  if (type === 'event_status') {
    const map = {
      completed: { label: '已完成', class: 'bg-green-100 text-green-800' },
      executing: { label: '执行中', class: 'bg-blue-100 text-blue-800' },
      preparing: { label: '准备中', class: 'bg-gray-100 text-gray-800' },
      cancelled: { label: '已取消', class: 'bg-red-100 text-red-800' },
      planning: { label: '规划中', class: 'bg-gray-100 text-gray-800' }
    }
    const item = map[value] || { label: value || '规划中', class: 'bg-gray-100 text-gray-800' }
    return <span className={`px-2 py-1 rounded-full text-xs ${item.class}`}>{item.label}</span>
  }
  
  if (type === 'monthly_status') {
    const map = {
      ahead: { label: '提前完成', class: 'bg-green-100 text-green-800' },
      on_track: { label: '按计划进行', class: 'bg-blue-100 text-blue-800' },
      delayed: { label: '延期', class: 'bg-red-100 text-red-800' },
      at_risk: { label: '有风险', class: 'bg-yellow-100 text-yellow-800' }
    }
    const item = map[value] || { label: value, class: 'bg-gray-100 text-gray-800' }
    return <span className={`px-2 py-1 rounded-full text-xs ${item.class}`}>{item.label}</span>
  }
  
  if (type === 'action_status') {
    const map = {
      completed: { label: '已完成', class: 'bg-blue-100 text-blue-800' },
      in_progress: { label: '进行中', class: 'bg-green-100 text-green-800' },
      delayed: { label: '延期', class: 'bg-red-100 text-red-800' },
      not_started: { label: '未开始', class: 'bg-gray-100 text-gray-800' }
    }
    const item = map[value] || { label: value || '未开始', class: 'bg-gray-100 text-gray-800' }
    return <span className={`px-2 py-1 rounded-full text-xs ${item.class}`}>{item.label}</span>
  }
  
  return value || '-'
}

// 事件类型映射
const eventTypeMap = {
  strategic: '战略性事件',
  operational: '运营性事件',
  risk: '风险性事件',
  opportunity: '机会性事件'
}

const PrintPreview = ({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  columns,
  filename = 'document',
  contentId,
  pageType = 'default', // 'majorEvents', 'monthlyProgress', 'actionPlans', 'annualPlanning', 'annualWorkPlans', 'departmentTargets', 'default'
  year
}) => {
  if (!isOpen) return null

  const contentRef = React.useRef(null)

  React.useEffect(() => {
    if (!isOpen || !contentId) return
    const container = contentRef.current
    if (!container) return
    const el = document.getElementById(contentId)
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }
    if (!el) return
    const cloned = el.cloneNode(true)
    cloned.removeAttribute('id')
    container.appendChild(cloned)
  }, [isOpen, contentId])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      await exportToPDF('print-content', filename)
      toast.success('PDF导出成功')
    } catch (error) {
      toast.error('PDF导出失败')
      console.error('PDF export error:', error)
    }
  }

  // 确保数据是数组格式
  const safeData = Array.isArray(data) ? data : []
  const safeColumns = Array.isArray(columns) ? columns : []

  // 根据页面类型渲染对应的表格
  const renderTable = () => {
    // 如果有contentId且没有数据，尝试渲染指定ID的内容
    if (contentId && (!safeData || safeData.length === 0)) {
      return <div ref={contentRef} />
    }

    if (safeData.length === 0 || safeColumns.length === 0) {
      return <div className="text-center py-8 text-gray-500">暂无数据</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {safeColumns.map((column, index) => {
                // 根据页面类型应用不同的表头样式
                let headerClass = 'border border-gray-300 px-3 py-2 text-left font-semibold text-sm'
                
                if (pageType === 'majorEvents') {
                  headerClass += ` ${column.headerClassName || 'bg-gradient-to-r from-blue-100 to-blue-200 text-gray-800'}`
                } else if (pageType === 'monthlyProgress') {
                  headerClass += ` ${column.headerClassName || 'bg-gradient-to-r from-blue-100 to-blue-200 text-gray-800'}`
                } else if (pageType === 'actionPlans') {
                  headerClass += ` ${column.headerClassName || 'bg-gradient-to-r from-blue-100 to-blue-200 text-gray-800'}`
                } else if (pageType === 'annualPlanning') {
                  headerClass += ` ${column.headerClassName || 'bg-gradient-to-r from-blue-100 to-blue-200 text-gray-800'}`
                } else if (pageType === 'annualWorkPlans') {
                  headerClass += ` ${column.headerClassName || 'bg-gradient-to-r from-blue-100 to-blue-200 text-gray-800'}`
                } else if (pageType === 'departmentTargets') {
                  headerClass += ` ${column.headerClassName || 'bg-gradient-to-r from-blue-100 to-blue-200 text-gray-800'}`
                } else {
                  headerClass += ' bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                }
                
                return (
                  <th 
                    key={column.key || index}
                    className={headerClass}
                    style={{ minWidth: column.minWidth || 'auto' }}
                  >
                    {column.label || column.key || `列${index + 1}`}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {safeData.map((item, rowIndex) => (
              <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {safeColumns.map((column, colIndex) => {
                  let cellContent = item[column.key]
                  
                  // 根据列类型进行特殊渲染
                  if (column.key === 'importance') {
                    cellContent = renderStatusBadge(cellContent, 'importance')
                  } else if (column.key === 'priority') {
                    cellContent = renderStatusBadge(cellContent, 'priority')
                  } else if (column.key === 'status') {
                    if (pageType === 'majorEvents') {
                      cellContent = renderStatusBadge(cellContent, 'event_status')
                    } else if (pageType === 'monthlyProgress') {
                      cellContent = renderStatusBadge(cellContent, 'monthly_status')
                    } else if (pageType === 'actionPlans') {
                      cellContent = renderStatusBadge(cellContent, 'action_status')
                    } else {
                      cellContent = renderStatusBadge(cellContent, 'status')
                    }
                  } else if (column.key === 'event_type') {
                    const k = String(cellContent || '').trim().toLowerCase()
                    cellContent = eventTypeMap[k] || cellContent
                  } else if (column.key === 'month' && typeof cellContent === 'number') {
                    cellContent = (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-gray-200">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-[9px] font-bold mr-1">
                          {cellContent}
                        </div>
                        <span className="text-[11px] font-medium text-gray-700">月</span>
                      </div>
                    )
                  } else if (column.key === 'completion_rate') {
                    // 计算完成率
                    const rate = item.completion_rate || (item.actual_value && item.target_value 
                      ? (item.actual_value / item.target_value * 100).toFixed(1)
                      : 0)
                    const normalizedRate = Math.max(0, Math.min(100, Number(rate) || 0))
                    const rateClass = normalizedRate >= 100 ? 'bg-green-100 text-green-800' :
                                     normalizedRate >= 80 ? 'bg-yellow-100 text-yellow-800' :
                                     'bg-red-100 text-red-800'
                    cellContent = <span className={`px-2 py-0.5 rounded-full text-xs ${rateClass}`}>{normalizedRate}%</span>
                  } else if (column.key === 'progress') {
                    const num = Number(cellContent || 0)
                    cellContent = `${isNaN(num) ? 0 : num}%`
                  } else if (column.type === 'date' && cellContent) {
                    // 格式化日期
                    try {
                      const d = new Date(cellContent)
                      if (!isNaN(d)) {
                        cellContent = cellContent.split('T')[0]
                      }
                    } catch (e) {}
                  } else if (column.render) {
                    // 使用自定义渲染函数
                    cellContent = column.render(cellContent, item)
                  }
                  
                  return (
                    <td 
                      key={`${rowIndex}-${column.key || colIndex}`}
                      className="border border-gray-300 px-3 py-2 text-gray-800"
                    >
                      {cellContent || '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <h2 className="text-lg font-semibold flex items-center text-white">
            <FileText className="mr-2" size={20} />
            打印预览 - {title}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download size={16} />
              <span>下载PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg flex items-center space-x-2 hover:bg-gray-100 transition-colors"
            >
              <Printer size={16} />
              <span>打印</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 预览内容 */}
        <div className="overflow-auto max-h-[calc(90vh-80px)]">
          <div id="print-content" className="p-8 bg-white">
            {/* 文档标题 */}
            <div className="text-center mb-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
              <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
              {year && <p className="text-white/90 text-lg mb-1">{year}年度</p>}
              <p className="text-white/80 text-sm">
                生成时间：{formatDateTime(new Date())}
              </p>
            </div>

            {/* 表格内容 */}
            {renderTable()}

            {/* 统计信息 */}
            {safeData.length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  共 {safeData.length} 条记录
                </p>
              </div>
            )}

            {/* 页脚 */}
            <div className="mt-12 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
              <p>企业年度规划系统 - 系统自动生成</p>
            </div>
          </div>
        </div>
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px !important;
          }
          .fixed { position: static !important; }
          .overflow-auto { overflow: visible !important; }
          .max-h-\\[calc\\(90vh-80px\\)\\] { max-height: none !important; }
          table { 
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse;
          }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          th, td {
            border: 1px solid #000 !important;
            padding: 8px !important;
          }
          .bg-gradient-to-r {
            background: linear-gradient(to right, #3b82f6, #8b5cf6) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}

export default PrintPreview
