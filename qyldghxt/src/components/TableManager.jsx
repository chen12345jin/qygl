import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit, Trash2, Copy, X, Check, AlertCircle, Settings, Save, Eye, Columns } from 'lucide-react'
import { toast } from 'react-hot-toast'
import DeleteConfirmDialog from './DeleteConfirmDialog'
import InlineAlert from './InlineAlert'
import FormField from './FormField'
import Pagination from './Pagination'

const TableManager = ({ 
  title, 
  data, 
  columns, 
  onAdd, 
  onEdit, 
  onDelete, 
  onCopy, 
  editingId, 
  onEditingChange,
  showActions = true,
  children,
  addHeader,
  addSubHeader,
  addBadge,
  addTheme = 'from-blue-500 to-purple-600',
  prefill = {},
  addMode = 'modal',
  editHeader,
  rowColorBy,
  rowColorMap = {},
  headerActionsLeft
  ,triggerAdd
  ,triggerPrefill
  ,hideDefaultAdd = false
  ,hideHeaderIcon = false
  ,hideDataList = false
  ,triggerEdit
  ,triggerEditPrefill
  ,tableClassName
  ,tableContainerClassName
  ,ellipsisKeys
  ,ellipsisAll = false
  ,headerEllipsis = false
  ,onView
  ,ellipsisChars = 6
  ,singleLineNoEllipsis = false
  ,addHeaderRight
  ,actionsHeaderClassName
  ,compact = false
  ,ultraCompact = false
  ,medium = false
  ,stickyHeader = false
  ,stickyHeaderBgClass
  ,pagination
  ,hiddenColumns = []
  ,rowSelection
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' })
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    itemId: null, 
    itemName: '' 
  })
  const [alertTimeout, setAlertTimeout] = useState(null)

  // Column visibility state
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState(hiddenColumns)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const columnSelectorRef = useRef(null)

  useEffect(() => {
    if (hiddenColumns && hiddenColumns.length > 0) {
      setHiddenColumnKeys(prev => {
        // Merge initial hidden columns with user selected ones? 
        // Or just override? 
        // Ideally we want to respect user choices but also enforce default hidden ones.
        // For simplicity, let's just use hiddenColumns as initial value. 
        // But if hiddenColumns prop changes, we might want to update.
        // However, if user manually toggled a column, we don't want to overwrite it unless necessary.
        // Let's just assume hiddenColumns is static configuration for now.
        return [...new Set([...prev, ...hiddenColumns])]
      })
    }
  }, []) // Run once on mount to merge prop

  const displayColumns = columns.filter(col => !hiddenColumnKeys.includes(col.key))

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

  // 清理定时器
  useEffect(() => {
    return () => {
      if (alertTimeout) {
        clearTimeout(alertTimeout)
      }
    }
  }, [alertTimeout])

  useEffect(() => {
    if (triggerAdd) {
      setFormData(triggerPrefill || prefill || {})
      setIsAdding(true)
      try { setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, 0) } catch {}
    }
  }, [triggerAdd])

  useEffect(() => {
    if (triggerEdit) {
      setFormData(triggerEditPrefill || {})
      setIsAdding(true)
      if (onEditingChange && triggerEditPrefill && triggerEditPrefill.id) {
        onEditingChange(triggerEditPrefill.id)
      }
      try { setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, 0) } catch {}
    }
  }, [triggerEdit])

  const showAlertMessage = (message, type = 'success') => {
    // 清除之前的定时器
    if (alertTimeout) {
      clearTimeout(alertTimeout)
    }
    
    setAlert({ show: true, message, type })
    
    // 设置新的定时器并保存引用
    const timeoutId = setTimeout(() => {
      setAlert({ show: false, message: '', type: 'info' })
      setAlertTimeout(null)
    }, 3000)
    
    setAlertTimeout(timeoutId)
  }

  const validateForm = () => {
    const newErrors = {}
    
    // 遍历所有columns，一次性收集所有错误
    columns.forEach(column => {
      const skipValidation = !!column.disabled
      if (!skipValidation && column.required) {
        const value = formData[column.key]
        const isEmpty = value === undefined || value === null || (typeof value === 'string' && value.toString().trim() === '')
        if (isEmpty) {
          newErrors[column.key] = `${column.label}不能为空`
        }
      }
      
      // 邮箱验证
      if (column.key.includes('email') && formData[column.key]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData[column.key])) {
          newErrors[column.key] = '请输入有效的邮箱地址'
        }
      }
      
      // 电话验证
      if ((column.key.includes('phone') || column.key.includes('电话')) && formData[column.key]) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/
        if (!phoneRegex.test(formData[column.key])) {
          newErrors[column.key] = '请输入有效的电话号码'
        }
      }
      
      // 数字类型验证
      if (column.type === 'number' && formData[column.key]) {
        const num = Number(formData[column.key])
        if (isNaN(num)) {
          newErrors[column.key] = `${column.label}必须是数字`
        }
      }
      
      // Select验证：如果选择了"请选择"选项
      if (!skipValidation && column.type === 'select' && formData[column.key]) {
        if (formData[column.key] === '') {
          if (column.required) {
            newErrors[column.key] = `请选择${column.label}`
          }
        }
      }
    })
    
    // 一次性设置所有错误
    setErrors(newErrors)
    
    // 如果有错误，显示错误提示
    if (Object.keys(newErrors).length > 0) {
      showAlertMessage(`请检查表单，共有${Object.keys(newErrors).length}个字段需要修正`, 'error')
    }
    
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 阻止原生HTML5验证，使用我们的自定义验证
    // 执行自定义验证
    const isValid = validateForm()
    
    if (!isValid) {
      // 验证失败，不执行任何操作
      return
    }
    
    try {
      if (editingId) {
        const ok = await onEdit(editingId, formData)
        if (ok) {
          toast.success('更新成功')
          resetForm()
        } else {
          showAlertMessage('未检测到任何改动', 'info')
        }
      } else {
        const ok = await onAdd(formData)
        if (ok) {
          toast.success('添加成功')
          resetForm()
        } else {
          showAlertMessage('保存未执行或未通过验证', 'error')
        }
      }
    } catch (error) {
      toast.error('操作失败')
      showAlertMessage('操作失败，请重试', 'error')
    }
  }

  const resetForm = () => {
    setFormData({})
    setErrors({})
    setIsAdding(false)
    setIsViewing(false)
    setAlert({ show: false, message: '', type: 'info' })
    if (onEditingChange) onEditingChange(null)
  }

  const handleView = (item) => {
    setFormData(item)
    setIsViewing(true)
    setIsAdding(true)
    setErrors({})
    setAlert({ show: false, message: '', type: 'info' })
  }

  const handleEdit = (item) => {
    setFormData(item)
    setIsAdding(true)
    setErrors({})
    setAlert({ show: false, message: '', type: 'info' })
    if (onEditingChange) onEditingChange(item.id)
  }

  const handleDelete = (item) => {
    // 获取要显示的项目名称
    const itemName = item.name || item.event_name || item.plan_name || item.progress_name || item.what || item.username || `ID: ${item.id}`
    
    setDeleteDialog({
      isOpen: true,
      itemId: item.id,
      itemName: itemName
    })
  }

  const confirmDelete = async () => {
    try {
      const ok = await onDelete(deleteDialog.itemId)
      if (ok === false) {
        toast.error('删除失败')
        showAlertMessage('删除失败，请重试', 'error')
        return
      }
      toast.success('删除成功')
      showAlertMessage('删除成功', 'success')
    } catch (error) {
      toast.error('删除失败')
      showAlertMessage('删除失败，请重试', 'error')
    }
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
  }

  const handleCopy = (item) => {
    if (onCopy) {
      onCopy(item)
      toast.success('已复制')
    }
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 flex-1 pb-24">
        {alert.show && (
          <InlineAlert
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert({ ...alert, show: false })}
            className="mb-6"
          />
        )}
        <div className="form-grid gap-6">
          {columns.map(column => {
            if (column.hideInForm) return null
            
            // 如果定义了 customField，使用自定义字段
            if (column.type === 'custom' && column.customField) {
              return (
                <div key={column.key} className="form-field-container">
                  <label className="form-field-label">
                    {column.label}
                    {column.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {column.customField({
                    value: (formData[column.key] !== undefined && formData[column.key] !== null && !Number.isNaN(formData[column.key]) ? formData[column.key] : ''),
                    onChange: (value) => {
                      if (column.onChange) {
                        column.onChange(value, setFormData, formData);
                      } else {
                        setFormData({ ...formData, [column.key]: value });
                      }
                      if (errors[column.key]) {
                        setErrors({ ...errors, [column.key]: '' });
                      }
                    },
                    formData,
                    setFormData,
                    error: errors[column.key]
                  })}
                  {errors[column.key] && (
                    <div className="form-field-error">{errors[column.key]}</div>
                  )}
                </div>
              )
            }
            // 否则使用默认的 FormField
            return (
              <FormField
                key={column.key}
                name={column.key}
                label={column.label}
                type={column.type || 'text'}
                value={column.valueParser ? column.valueParser(formData[column.key], formData) : (formData[column.key] !== undefined && formData[column.key] !== null && !Number.isNaN(formData[column.key]) ? formData[column.key] : '')}
                onChange={(value) => {
                  if (column.onChange) {
                    column.onChange(value, setFormData, formData);
                  } else {
                    setFormData({ ...formData, [column.key]: value });
                  }
                  if (errors[column.key]) {
                    setErrors({ ...errors, [column.key]: '' });
                  }
                }}
                required={!!column.required}
                options={column.options}
                error={errors[column.key]}
                hint={column.hint}
                rows={column.type === 'textarea' ? 3 : undefined}
                step={column.type === 'number' ? '0.01' : undefined}
                disabled={column.disabled || isViewing}
              />
            )
          })}
        </div>
      </div>
      <div className="sticky bottom-0 flex justify-end space-x-3 p-4 border-t border-gray-200 bg-white/95 backdrop-blur z-10">
        <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          {isViewing ? '关闭' : '取消'}
        </button>
        {!isViewing && (
        <button type="submit" className={`px-4 py-2 bg-gradient-to-r ${addTheme} text-white rounded-lg transition-colors flex items-center space-x-2`}>
          <Save size={18} />
          <span>{editingId ? `更新${title.replace('管理', '').replace('设置', '')}` : `保存${title.replace('管理', '').replace('设置', '')}`}</span>
        </button>
        )}
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 - 现代化设计 */}
      <div className="card-header bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20">
        <div className="icon-text">
          {!hideHeaderIcon && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-2xl shadow-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
          )}
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{title}</h2>
        </div>
        {showActions && (
          <div className="button-group flex items-center gap-2 flex-wrap">
            <div className="relative" ref={columnSelectorRef}>
              <button
                type="button"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center space-x-2 font-semibold"
                title="列设置"
              >
                <Columns size={16} />
                <span className="hidden sm:inline">列设置</span>
              </button>
              
              {showColumnSelector && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-[999] border border-gray-100 p-3 max-h-80 overflow-y-auto">
                  <div className="text-sm font-bold text-gray-700 mb-2 px-1">显示列</div>
                  <div className="space-y-1">
                    {columns.map(col => (
                      <label key={col.key} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={!hiddenColumnKeys.includes(col.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setHiddenColumnKeys(hiddenColumnKeys.filter(k => k !== col.key))
                            } else {
                              setHiddenColumnKeys([...hiddenColumnKeys, col.key])
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

            {headerActionsLeft}
            {!hideDefaultAdd && (
              <button
                onClick={() => { setFormData(prefill || {}); setIsAdding(true) }}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center space-x-2 font-semibold"
              >
                <Plus size={16} />
                <span>新增{title.replace('管理', '').replace('设置', '')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {isAdding && addMode === 'modal' && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className={`relative p-6 border-b border-gray-200 bg-gradient-to-r ${addTheme} shrink-0 z-10 flex items-center justify-between`}>
              <div className="flex items-center justify-between gap-3 w-full mr-8">
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-white truncate">{isViewing ? `查看${title.replace('管理', '').replace('设置', '')}` : (editingId ? (editHeader || `编辑${title.replace('管理', '').replace('设置', '')}`) : (addHeader || `新增${title.replace('管理', '').replace('设置', '')}`))}</div>
                  {addSubHeader && <div className="text-white/80 mt-1 text-sm truncate">{addSubHeader}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {addBadge && (
                    <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{addBadge}</div>
                  )}
                  {addHeaderRight}
                </div>
              </div>
              <button
                onClick={resetForm}
                className="absolute right-4 top-6 text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {renderForm()}
          </div>
        </div>,
        document.body
      )}

      {isAdding && addMode === 'inline' && (
        <div className="card">
          <div className="px-6 pt-6">
            <div className="text-2xl font-semibold text-gray-800">{isViewing ? `查看${title.replace('管理', '').replace('设置', '')}` : (editingId ? (editHeader || `编辑${title.replace('管理', '').replace('设置', '')}`) : (addHeader || `新增${title.replace('管理', '').replace('设置', '')}`))}</div>
            {addSubHeader && <div className="text-gray-500 mt-1 text-sm">{addSubHeader}</div>}
          </div>
          {renderForm()}
        </div>
      )}

      {/* 自定义内容 */}
      {children}

      {/* 数据列表 - 现代化设计 */}
      {!hideDataList && data && data.length > 0 && (
        <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        <div className={`table-responsive ${tableContainerClassName || ''} ${stickyHeader ? 'overflow-y-auto max-h-[70vh]' : ''}`}>
          <table className={`w-full ${tableClassName || ''}`}>
              <thead className={`${stickyHeader ? `sticky top-0 z-10 ${stickyHeaderBgClass || 'bg-white'}` : ''}`}>
                <tr>
                  {rowSelection && (
                    <th className={`${ultraCompact ? 'px-1 py-0' : compact ? 'px-2 py-0.5' : medium ? 'px-4 py-2' : 'px-6 py-5'} text-left ${ultraCompact ? 'text-xs' : 'text-sm'} font-bold ${typeof actionsHeaderClassName === 'string' ? actionsHeaderClassName : 'text-white bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/30'}`}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        checked={data.length > 0 && rowSelection.selectedRowKeys.length === data.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            rowSelection.onChange(data.map(item => item.id))
                          } else {
                            rowSelection.onChange([])
                          }
                        }}
                      />
                    </th>
                  )}
                  {displayColumns.map(column => (
                    <th
                      key={column.key}
                      className={`${ultraCompact ? 'px-1 py-0' : compact ? 'px-2 py-0.5' : medium ? 'px-4 py-2' : 'px-6 py-5'} text-left ${ultraCompact ? 'text-xs' : 'text-sm'} font-bold ${column.headerClassName || 'text-white bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/30'}`}
                    >
                      {headerEllipsis ? (
                        <div className={`th-ellipsis cell-limit ${singleLineNoEllipsis ? 'whitespace-nowrap' : ''}`}>{column.label}</div>
                      ) : (
                        <div className={`${singleLineNoEllipsis ? 'whitespace-nowrap' : 'leading-tight'}`}>{column.label}</div>
                      )}
                    </th>
                  ))}
                  {showActions && (
                    <th
                      className={`${ultraCompact ? 'px-1 py-0' : compact ? 'px-2 py-0.5' : medium ? 'px-4 py-2' : 'px-6 py-5'} text-center ${ultraCompact ? 'text-xs' : 'text-sm'} font-bold ${typeof actionsHeaderClassName === 'string' ? actionsHeaderClassName : 'text-white bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/30'}`}
                    >
                      操作
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const pg = pagination
                  const page = pg?.page || 1
                  const size = pg?.pageSize || data.length
                  const start = (page - 1) * size
                  const end = start + size
                  const list = pg ? data.slice(start, end) : data
                  return list.map((item, index) => (
                  <tr key={item.id || index} className={`group transition-all duration-300 border-b border-gray-100/50 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-purple-50/80 ${ultraCompact ? 'text-[11px] leading-none' : compact ? 'text-[12px] leading-tight' : ''}`}>
                    {rowSelection && (
                      <td className={`${ultraCompact ? 'px-1 py-0' : compact ? 'px-2 py-0.5' : medium ? 'px-4 py-2' : 'px-6 py-4'} text-sm text-gray-800 border-r border-gray-100/50 last:border-r-0`}>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            checked={rowSelection.selectedRowKeys.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                rowSelection.onChange([...rowSelection.selectedRowKeys, item.id])
                              } else {
                                rowSelection.onChange(rowSelection.selectedRowKeys.filter(key => key !== item.id))
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </td>
                    )}
                    {displayColumns.map(column => {
                      const rowClass = rowColorBy ? (rowColorMap[item[rowColorBy]] || '') : ''
                      const useEllipsis = ellipsisAll || (Array.isArray(ellipsisKeys) && ellipsisKeys.includes(column.key))
                      const cellClass = singleLineNoEllipsis
                        ? 'truncate'
                        : useEllipsis
                          ? 'text-ellipsis cell-limit'
                          : (column.key.includes('name') || column.key.includes('title')
                            ? 'text-ellipsis'
                            : `${ultraCompact ? 'text-xs leading-tight' : compact ? 'leading-tight' : 'leading-relaxed'} text-break whitespace-pre-wrap`)
                      const displayContent = column.render 
                        ? column.render(item[column.key], item) 
                        : (() => {
                            const v = item[column.key]
                            if (useEllipsis && typeof v === 'string') {
                              const s = v.toString()
                              return s.length > ellipsisChars ? `${s.slice(0, ellipsisChars)}...` : s
                            }
                            return v
                          })()
                      return (
                        <td key={column.key} className={`${ultraCompact ? 'px-1 py-0' : compact ? 'px-2 py-0.5' : medium ? 'px-4 py-2' : 'px-6 py-4'} text-sm text-gray-800 border-r border-gray-100/50 last:border-r-0 ${rowClass}`}>
                          <div className={cellClass} title={typeof item[column.key] === 'string' ? item[column.key] : ''}>{displayContent}</div>
                        </td>
                      )
                    })}
                    {showActions && (
                      <td className={`${ultraCompact ? 'px-1 py-0' : compact ? 'px-2 py-0.5' : 'px-6 py-4'} text-center border-r border-gray-100/50 last:border-r-0 ${rowColorBy ? (rowColorMap[item[rowColorBy]] || '') : ''}`}>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() => (onView ? onView(item) : handleView(item))}
                            className={`text-gray-700 hover:text-gray-900 transition-all duration-300 transform hover:scale-110 group-hover:bg-gray-50/50 ${ultraCompact ? 'p-1' : compact ? 'p-1' : 'p-2'} rounded-lg`}
                            title="查看"
                          >
                            <Eye size={ultraCompact ? 14 : compact ? 16 : 18} />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className={`text-blue-600 hover:text-blue-800 transition-all duration-300 transform hover:scale-110 group-hover:bg-blue-50/50 ${ultraCompact ? 'p-1' : compact ? 'p-1' : 'p-2'} rounded-lg`}
                            title="编辑"
                          >
                            <Edit size={ultraCompact ? 14 : compact ? 16 : 18} />
                          </button>
                          <button
                            onClick={() => handleCopy(item)}
                            className={`text-green-600 hover:text-green-800 transition-all duration-300 transform hover:scale-110 group-hover:bg-green-50/50 ${ultraCompact ? 'p-1' : compact ? 'p-1' : 'p-2'} rounded-lg`}
                            title="复制"
                          >
                            <Copy size={ultraCompact ? 14 : compact ? 16 : 18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className={`text-red-600 hover:text-red-800 transition-all duration-300 transform hover:scale-110 group-hover:bg-red-50/50 ${ultraCompact ? 'p-1' : compact ? 'p-1' : 'p-2'} rounded-lg`}
                            title="删除"
                          >
                            <Trash2 size={ultraCompact ? 14 : compact ? 16 : 18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
                })()}
              </tbody>
            </table>
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total ?? data.length}
              onChange={pagination.onChange}
              pageSizeOptions={pagination.pageSizeOptions}
            />
          )}
        </div>
      )}
      
      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        itemName={deleteDialog.itemName}
      />
    </div>
  )
}

export default TableManager
