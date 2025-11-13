import React from 'react'
import { X, Download, FileText } from 'lucide-react'
import { exportToPDF } from '../utils/export'
import toast from 'react-hot-toast'

const PrintPreview = ({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  columns,
  filename = 'document'
}) => {
  if (!isOpen) return null

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

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold flex items-center">
            <FileText className="mr-2" size={20} />
            打印预览 - {title}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download size={16} />
              <span>下载PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary"
            >
              打印
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 预览内容 */}
        <div className="overflow-auto max-h-[calc(90vh-80px)]">
          <div id="print-content" className="p-8 bg-white">
            {/* 文档标题 */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
              <p className="text-gray-600">
                生成时间：{new Date().toLocaleString('zh-CN')}
              </p>
            </div>

            {/* 数据表格 */}
            {safeData.length > 0 && safeColumns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      {safeColumns.map((column, index) => (
                        <th 
                          key={column.key || index}
                          className="border border-gray-300 px-4 py-2 text-left font-semibold"
                        >
                          {column.label || column.key || `列${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {safeData.map((item, rowIndex) => (
                      <tr key={item.id || rowIndex} className="hover:bg-gray-50">
                        {safeColumns.map((column, colIndex) => (
                          <td 
                            key={`${rowIndex}-${column.key || colIndex}`}
                            className="border border-gray-300 px-4 py-2"
                          >
                            {column.render 
                              ? column.render(item[column.key], item) 
                              : (item[column.key] || '')
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无数据
              </div>
            )}

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
          .fixed {
            position: static !important;
          }
          
          .bg-black {
            background: white !important;
          }
          
          .shadow-xl {
            box-shadow: none !important;
          }
          
          .border-b, .bg-gray-50 {
            display: none !important;
          }
          
          #print-content {
            padding: 0 !important;
          }
          
          .overflow-auto {
            overflow: visible !important;
          }
          
          .max-h-\\[calc\\(90vh-80px\\)\\] {
            max-height: none !important;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  )
}

export default PrintPreview
