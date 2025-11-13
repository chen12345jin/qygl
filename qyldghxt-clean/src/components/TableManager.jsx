import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Copy, X, Check, AlertCircle, Settings, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import DeleteConfirmDialog from './DeleteConfirmDialog'
import InlineAlert from './InlineAlert'
import FormField from './FormField'

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
  children
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' })
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    itemId: null, 
    itemName: '' 
  })
  const [alertTimeout, setAlertTimeout] = useState(null)

  // 清理定时器
  useEffect(() => {
    return () => {
      if (alertTimeout) {
        clearTimeout(alertTimeout)
      }
    }
  }, [alertTimeout])

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
      // 必填字段验证
      if (column.required) {
        const value = formData[column.key]
        if (!value || value.toString().trim() === '' || value === 0) {
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
      if (column.type === 'select' && formData[column.key]) {
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
    if (!e.target.checkValidity()) {
      console.log('HTML5 validation failed')
    }
    
    // 执行自定义验证
    const isValid = validateForm()
    
    if (!isValid) {
      // 验证失败，不执行任何操作
      return
    }
    
    try {
      if (editingId) {
        await onEdit(editingId, formData)
        toast.success('更新成功')
      } else {
        await onAdd(formData)
        toast.success('添加成功')
      }
      resetForm()
    } catch (error) {
      toast.error('操作失败')
      showAlertMessage('操作失败，请重试', 'error')
    }
  }

  const resetForm = () => {
    setFormData({})
    setErrors({})
    setIsAdding(false)
    setAlert({ show: false, message: '', type: 'info' })
    if (onEditingChange) onEditingChange(null)
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
      await onDelete(deleteDialog.itemId)
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

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 - 现代化设计 */}
      <div className="card-header bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20">
        <div className="icon-text">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-2xl shadow-xl">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{title}</h2>
        </div>
        {showActions && (
          <div className="button-group">
            <button
              onClick={() => setIsAdding(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg flex items-center space-x-2 font-semibold"
            >
              <Plus size={18} />
              <span>新增{title.replace('管理', '').replace('设置', '')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 表单 - 现代化设计 */}
      {isAdding && (
        <form onSubmit={handleSubmit} noValidate className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          {alert.show && (
            <InlineAlert
              message={alert.message}
              type={alert.type}
              onClose={() => setAlert({ ...alert, show: false })}
              className="mb-6"
            />
          )}
          
          <div className="form-grid">
            {columns.map(column => (
              <FormField
                key={column.key}
                name={column.key}
                label={column.label}
                type={column.type || 'text'}
                value={formData[column.key] || ''}
                onChange={(value) => {
                  // 检查列是否有自定义的onChange处理函数
                  if (column.onChange) {
                    column.onChange(value, setFormData, formData);
                  } else {
                    setFormData({...formData, [column.key]: value});
                  }
                  if (errors[column.key]) {
                    setErrors({...errors, [column.key]: ''});
                  }
                }}
                required={column.required}
                options={column.options}
                error={errors[column.key]}
                hint={column.hint}
                rows={column.type === 'textarea' ? 3 : undefined}
                step={column.type === 'number' ? '0.01' : undefined}
              />
            ))}
          </div>
          
          <div className="button-group mt-8">
            <button type="submit" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg flex items-center space-x-2 font-semibold">
              <Save size={18} />
              <span>{editingId ? `更新${title.replace('管理', '').replace('设置', '')}` : `保存${title.replace('管理', '').replace('设置', '')}`}</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg flex items-center space-x-2 font-semibold"
            >
              <X size={18} />
              <span>取消</span>
            </button>
          </div>
        </form>
      )}

      {/* 自定义内容 */}
      {children}

      {/* 数据列表 - 现代化设计 */}
      {data && data.length > 0 && (
        <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="table-responsive">
            <table className="w-full">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th key={column.key} className="px-6 py-5 text-left text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/30">
                      {column.label}
                    </th>
                  ))}
                  {showActions && <th className="px-6 py-5 text-right text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/30">操作</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.id || index} className="group hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-purple-50/80 transition-all duration-300 border-b border-gray-100/50">
                    {columns.map(column => (
                      <td key={column.key} className="px-6 py-4 text-sm text-gray-800 border-r border-gray-100/50 last:border-r-0">
                        <div className={column.key.includes('name') || column.key.includes('title') ? 'text-ellipsis' : 'text-break'}>
                          {column.render ? column.render(item[column.key], item) : item[column.key]}
                        </div>
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-6 py-4 text-right border-r border-gray-100/50 last:border-r-0">
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800 transition-all duration-300 transform hover:scale-110 group-hover:bg-blue-50/50 p-2 rounded-lg"
                            title="编辑"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleCopy(item)}
                            className="text-green-600 hover:text-green-800 transition-all duration-300 transform hover:scale-110 group-hover:bg-green-50/50 p-2 rounded-lg"
                            title="复制"
                          >
                            <Copy size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-800 transition-all duration-300 transform hover:scale-110 group-hover:bg-red-50/50 p-2 rounded-lg"
                            title="删除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
