import React, { useState, useEffect, useRef } from 'react'
import { Columns, Filter, RefreshCcw, Download, FileText, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/export'

const TableActions = ({ 
  title,
  subTitle,
  columns = [],
  data = [],
  filters,
  setFilters,
  hiddenColumns,
  setHiddenColumns,
  isFilterOpen,
  setIsFilterOpen,
  exportFileName = '数据导出',
  exportSheetName = '数据',
  pageType = '',
  onImport,
  onAdd,
  addButtonText,
  year = '',
  showImport = false,
  showExportPDF = false,
  showAdd = false,
  disabled = false
}) => {
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const columnSelectorRef = useRef(null)
  const filterBtnRef = useRef(null)

  // 可切换的列，排除操作列等不需要隐藏的列
  const toggleableColumns = columns.filter(col => col.key !== 'actions')

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

  // 重置筛选条件
  const handleResetFilters = () => {
    const resetFilters = { ...filters }
    Object.keys(resetFilters).forEach(key => {
      if (key !== 'year') {
        resetFilters[key] = ''
      }
    })
    setFilters(resetFilters)
    toast.success('已重置筛选条件')
  }

  // 检查是否有筛选条件被设置
  const hasActiveFilters = Object.keys(filters).some(key => {
    if (key === 'year') return false
    return filters[key] !== '' && filters[key] !== null
  })

  // 导出Excel
  const handleExportToExcel = () => {
    if (!data || data.length === 0) {
      toast('当前没有可导出的数据', { icon: 'ℹ️' })
      return
    }

    const toastId = toast.loading('正在导出数据...', { duration: 0 })

    setTimeout(() => {
      try {
        // 转换数据格式，只包含可见列的数据
        const exportData = data.map(item => {
          const row = {}
          columns.forEach(col => {
            if (!hiddenColumns.includes(col.key) && col.key !== 'actions') {
              // 如果列有自定义渲染函数，尝试使用它
              if (col.render) {
                row[col.label] = col.render(item[col.key], item)
              } else {
                row[col.label] = item[col.key] || ''
              }
            }
          })
          return row
        })

        exportToExcel(exportData, `${exportFileName}${year ? `_${year}年` : ''}`, exportSheetName, pageType)
        toast.success(`已导出 ${exportData.length} 条到 Excel`, { id: toastId })
      } catch (error) {
        console.error('导出Excel失败:', error)
        toast.error('导出失败，请稍后重试', { id: toastId })
      }
    }, 100)
  }

  // 处理文件导入
  const handleImportChange = (e) => {
    if (e.target.files && e.target.files[0] && onImport) {
      onImport(e.target.files[0])
      // 清空文件输入，以便可以重新选择同一个文件
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <p className="text-gray-600 mt-1">{subTitle}</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap self-center min-h-[40px]">
            {/* 列设置 */}
            <div className="relative" ref={columnSelectorRef}>
              <button
                className="btn-secondary inline-flex items-center mr-2"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                disabled={disabled}
              >
                <Columns className="mr-2" size={18} />
                列设置
              </button>
              {showColumnSelector && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-[999] border border-gray-100 p-3 max-h-80 overflow-y-auto">
                  <div className="text-sm font-bold text-gray-700 mb-2 px-1">显示列</div>
                  <div className="space-y-1">
                    {toggleableColumns.map(col => (
                      <label key={col.key} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={!hiddenColumns.includes(col.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setHiddenColumns(hiddenColumns.filter(k => k !== col.key))
                            } else {
                              setHiddenColumns([...hiddenColumns, col.key])
                            }
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700 truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* 筛选按钮 */}
            <div className="relative" ref={filterBtnRef}>
              <button
                className="btn-primary inline-flex items-center"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                disabled={disabled}
              >
                <Filter className="mr-2" size={18} />
                筛选
              </button>
            </div>
            
            {/* 重置按钮 */}
            <button 
              className={`btn-secondary inline-flex items-center ${!hasActiveFilters ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleResetFilters}
              disabled={!hasActiveFilters || disabled}
            >
              <RefreshCcw className="mr-2" size={18} />
              重置
            </button>
            
            {/* 导出Excel */}
            <button
              className={`h-10 px-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold ${data.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleExportToExcel}
              disabled={data.length===0 || disabled}
            >
              <Download className="mr-2" size={18} />
              导出Excel
            </button>
            
            {/* 导出PDF（可选） */}
            {showExportPDF && (
              <button
                className={`h-10 px-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all duration-300 shadow-md flex items-center space-x-2 ${data.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {/* 导出PDF逻辑 */}}
                disabled={data.length===0 || disabled}
              >
                <FileText className="mr-2" size={18} />
                导出PDF
              </button>
            )}
            
            {/* 导入Excel（可选） */}
            {showImport && onImport && (
              <label htmlFor="import-excel" className="h-10 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold cursor-pointer relative z-10">
                <Upload className="mr-2" size={18} />
                导入Excel
                <input 
                  id="import-excel" 
                  name="import-excel" 
                  type="file" 
                  accept=".xlsx,.xls" 
                  className="hidden" 
                  onChange={handleImportChange} 
                />
              </label>
            )}
            
            {/* 新增按钮（可选） */}
            {showAdd && onAdd && (
              <button 
                type="button"
                className="h-10 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md inline-flex items-center font-semibold"
                onClick={onAdd}
                disabled={disabled}
              >
                {addButtonText || '新增'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TableActions