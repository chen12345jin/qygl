import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, FileText, Download, Upload } from 'lucide-react'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { toast } from 'react-hot-toast'
import { useData } from '../../contexts/DataContext'
import DeleteConfirmDialog from '../../components/DeleteConfirmDialog'
import XLSX from 'xlsx-js-style'

const TemplateSettings = () => {
  const { getTemplates, addTemplate, updateTemplate, deleteTemplate, loading } = useData()
  const [templates, setTemplates] = useState([])
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    itemId: null, 
    itemName: '' 
  })
  const [formData, setFormData] = useState({
    name: '',
    type: 'department_target',
    description: '',
    fields: []
  })
  const [formErrors, setFormErrors] = useState({})

  // 监听模板类型变化，自动更新字段
  useEffect(() => {
    if (formData.type && fieldMap[formData.type]) {
      setFormData(prev => ({
        ...prev,
        fields: fieldMap[formData.type] || []
      }))
    }
  }, [formData.type])

  // 定义字段映射
  const fieldMap = {
    department_target: [
      { key: 'department', label: '部门', type: 'select', required: true, options: [] },
      { key: 'level', label: '级别', type: 'select', required: true, options: [
        { value: 'A', label: 'A-保底' },
        { value: 'B', label: 'B-平衡' },
        { value: 'C', label: 'C-突破' },
        { value: 'D', label: 'D-冲刺' }
      ]},
      { key: 'target_type', label: '目标类型', type: 'select', required: true, options: [
        { value: 'sales', label: '销售' },
        { value: 'profit', label: '利润' },
        { value: 'project', label: '项目' },
        { value: 'efficiency', label: '效率' },
        { value: 'quality', label: '质量' },
        { value: 'cost', label: '成本' }
      ]},
      { key: 'target_name', label: '目标名称', type: 'text', required: true },
      { key: 'target_value', label: '目标值', type: 'number', required: true },
      { key: 'unit', label: '单位', type: 'text', required: true },
      { key: 'quarter', label: '季度', type: 'select', required: true, options: [
        { value: 'Q1', label: 'Q1' },
        { value: 'Q2', label: 'Q2' },
        { value: 'Q3', label: 'Q3' },
        { value: 'Q4', label: 'Q4' }
      ]},
      { key: 'month', label: '月份', type: 'select', required: true, options: [
        { value: '1', label: '1月' },
        { value: '2', label: '2月' },
        { value: '3', label: '3月' },
        { value: '4', label: '4月' },
        { value: '5', label: '5月' },
        { value: '6', label: '6月' },
        { value: '7', label: '7月' },
        { value: '8', label: '8月' },
        { value: '9', label: '9月' },
        { value: '10', label: '10月' },
        { value: '11', label: '11月' },
        { value: '12', label: '12月' }
      ]},
      { key: 'current_value', label: '当前值', type: 'number', required: false },
      { key: 'progress', label: '进度', type: 'number', required: false },
      { key: 'status', label: '状态', type: 'select', required: false, options: [
        { value: 'not_started', label: '未开始' },
        { value: 'in_progress', label: '进行中' },
        { value: 'completed', label: '已完成' },
        { value: 'delayed', label: '已延迟' }
      ]},
      { key: 'responsible_person', label: '负责人', type: 'text', required: true },
      { key: 'description', label: '描述', type: 'textarea', required: false }
    ],
    annual_work_plan: [
      { key: 'month_theme', label: '月份/主题', type: 'select', required: true, options: [
        { value: '1', label: '1月 - 规划导航月' },
        { value: '2', label: '2月 - 启动推进月' },
        { value: '3', label: '3月 - 落地执行月' },
        { value: '4', label: '4月 - 优化提升月' },
        { value: '5', label: '5月 - 中期检查月' },
        { value: '6', label: '6月 - 半年度总结月' },
        { value: '7', label: '7月 - 调整规划月' },
        { value: '8', label: '8月 - 全力冲刺月' },
        { value: '9', label: '9月 - 三季度总结月' },
        { value: '10', label: '10月 - 年度冲刺月' },
        { value: '11', label: '11月 - 年度复盘月' },
        { value: '12', label: '12月 - 年度总结月' }
      ]},
      { key: 'plan_name', label: '计划名称', type: 'text', required: true },
      { key: 'department', label: '负责部门', type: 'select', required: true, options: [] },
      { key: 'category', label: '类别', type: 'select', required: true, options: [
        { value: 'strategic', label: '战略性事件' },
        { value: 'operational', label: '运营性事件' },
        { value: 'risk', label: '风险性事件' },
        { value: 'opportunity', label: '机会性事件' },
        { value: 'business', label: '业务性事件' },
        { value: 'management', label: '管理性事件' },
        { value: 'temporary', label: '临时性事件' }
      ]},
      { key: 'description', label: '计划描述', type: 'textarea', required: false }
    ],
    major_event: [
      { key: 'year', label: '年份', type: 'select', required: true, options: [] },
      { key: 'event_name', label: '事件名称', type: 'text', required: true },
      { key: 'event_type', label: '事件类型', type: 'select', required: true, options: [
        { value: 'strategic', label: '战略性事件' },
        { value: 'operational', label: '运营性事件' },
        { value: 'risk', label: '风险性事件' },
        { value: 'opportunity', label: '机会性事件' }
      ]},
      { key: 'department', label: '负责部门', type: 'select', required: true, options: [] },
      { key: 'event_date', label: '事件日期', type: 'date', required: false },
      { key: 'description', label: '事件描述', type: 'textarea', required: false }
    ],
    monthly_progress: [
      { key: 'year', label: '年度', type: 'select', required: true, options: [] },
      { key: 'month', label: '月份', type: 'select', required: true, options: [
        { value: '1', label: '1月' },
        { value: '2', label: '2月' },
        { value: '3', label: '3月' },
        { value: '4', label: '4月' },
        { value: '5', label: '5月' },
        { value: '6', label: '6月' },
        { value: '7', label: '7月' },
        { value: '8', label: '8月' },
        { value: '9', label: '9月' },
        { value: '10', label: '10月' },
        { value: '11', label: '11月' },
        { value: '12', label: '12月' }
      ]},
      { key: 'task_name', label: '任务名称', type: 'text', required: true },
      { key: 'department', label: '负责部门', type: 'select', required: true, options: [] },
      { key: 'responsible_person', label: '负责人', type: 'text', required: true },
      { key: 'key_activities', label: '关键活动', type: 'textarea', required: true },
      { key: 'progress', label: '进度', type: 'number', required: false },
      { key: 'notes', label: '备注', type: 'textarea', required: false }
    ],
    action_plan: [
      { key: 'year', label: '年份', type: 'select', required: true, options: [] },
      { key: 'goal', label: '目标', type: 'textarea', required: true },
      { key: 'start_date', label: '开始日期', type: 'date', required: true },
      { key: 'end_date', label: '结束日期', type: 'date', required: true },
      { key: 'what', label: 'What (做什么)', type: 'textarea', required: true },
      { key: 'who', label: 'Who (谁来做)', type: 'text', required: true },
      { key: 'how', label: 'How (怎么做)', type: 'textarea', required: true },
      { key: 'value', label: '价值', type: 'textarea', required: true },
      { key: 'budget', label: '投入预算', type: 'number', required: true },
      { key: 'department', label: '负责部门', type: 'select', required: true, options: [] },
      { key: 'priority', label: '优先级', type: 'select', required: true, options: [
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' }
      ]},
      { key: 'why', label: 'Why (为什么)', type: 'textarea', required: false },
      { key: 'where', label: 'Where (在哪里)', type: 'text', required: false }
    ]
  }

  const templateTypes = [
    { value: 'department_target', label: '部门目标分解' },
    { value: 'annual_work_plan', label: '年度工作规划' },
    { value: 'major_event', label: '大事件提炼' },
    { value: 'monthly_progress', label: '月度推进计划' },
    { value: 'action_plan', label: '5W2H行动计划' }
  ]

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const result = await getTemplates()
      if (result.success) {
        setTemplates(Array.isArray(result.data) ? result.data : [])
      } else {
        console.error('加载模板失败:', result.error)
        setTemplates([])
      }
    } catch (error) {
      console.error('加载模板失败:', error)
      setTemplates([])
    }
  }

  // 表单验证
  const validateForm = () => {
    const errors = {}
    if (!formData.name || formData.name.trim() === '') {
      errors.name = '必填'
    }
    if (!formData.type || formData.type.trim() === '') {
      errors.type = '必填'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const templateData = {
        ...formData,
        fields: fieldMap[formData.type] || [],
        updated_at: new Date().toISOString()
      }

      if (editingTemplate) {
        const result = await updateTemplate(editingTemplate.id, templateData)
        if (result.success) {
          toast.success('模板更新成功')
          loadTemplates()
        } else {
          toast.error(result.message || '更新失败')
        }
      } else {
        const result = await addTemplate(templateData)
        if (result.success) {
          toast.success('模板创建成功')
          loadTemplates()
        } else {
          toast.error(result.error || '创建失败')
        }
      }

      resetForm()
    } catch (error) {
      console.error('保存模板失败:', error)
      toast.error('操作失败')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'department_target',
      description: '',
      fields: []
    })
    setFormErrors({})
    setEditingTemplate(null)
    setShowForm(false)
  }

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      type: template.type,
      description: template.description,
      fields: template.fields || []
    })
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleDelete = (template) => {
    setDeleteDialog({
      isOpen: true,
      itemId: template.id,
      itemName: template.name
    })
  }

  const confirmDelete = async () => {
    try {
      const result = await deleteTemplate(deleteDialog.itemId)
      if (result.success) {
        toast.success('模板删除成功')
        loadTemplates()
      } else {
        toast.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除模板失败:', error)
      toast.error('删除失败')
    }
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })
  }

  const handleExport = (template) => {
    try {
      const workbook = XLSX.utils.book_new()
      const fields = template.fields || []

      if (fields.length === 0) {
        toast.error('模板没有字段，无法导出')
        return
      }

      // 创建表头数组，必填字段加*标记
      const headers = fields.map(field => (field.required ? `${field.label}*` : field.label))

      // 创建一个空白的数据行作为示例
      const emptyRow = fields.map(() => '')

      // 第一行：提示说明
      const tipRow = ['提示：红色带*的列为必填项']
      // 补齐空列
      for (let i = 1; i < fields.length; i++) {
        tipRow.push('')
      }

      // 创建工作表数据
      const wsData = [tipRow, headers]

      // 添加几行空白行方便用户填写
      for (let i = 0; i < 10; i++) {
        wsData.push([...emptyRow])
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // 设置提示行样式（红色字体）
      ws['A1'] = {
        v: '提示：红色带*的列为必填项',
        s: {
          font: { color: { rgb: 'FF0000' }, bold: true },
          alignment: { horizontal: 'left' }
        }
      }

      // 设置表头样式
      fields.forEach((field, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 1, c: index })
        const headerText = field.required ? `${field.label}*` : field.label
        if (field.required) {
          // 必填字段：红色字体
          ws[cellRef] = {
            v: headerText,
            s: {
              font: { color: { rgb: 'FF0000' }, bold: true },
              fill: { fgColor: { rgb: 'F0F0F0' } },
              alignment: { horizontal: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          }
        } else {
          // 非必填字段：黑色字体
          ws[cellRef] = {
            v: headerText,
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'F0F0F0' } },
              alignment: { horizontal: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          }
        }
      })

      // 设置列宽
      const colWidths = fields.map(field => {
        const labelLen = field.label.length * 2 + 4
        return { wch: Math.max(labelLen, 15) }
      })
      ws['!cols'] = colWidths

      // 合并提示行单元格
      if (fields.length > 1) {
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: fields.length - 1 } }]
      }

      XLSX.utils.book_append_sheet(workbook, ws, '数据填写')

      // 添加字段说明sheet，帮助用户了解每个字段的填写要求
      const fieldGuide = fields.map(field => {
        let optionsStr = ''
        if (field.options && field.options.length > 0) {
          optionsStr = field.options.map(opt => opt.label || opt.value).join('、')
        }
        return {
          '字段名称': field.label,
          '是否必填': field.required ? '是' : '否',
          '字段类型': field.type === 'text' ? '文本' : 
                     field.type === 'number' ? '数字' : 
                     field.type === 'date' ? '日期' : 
                     field.type === 'select' ? '下拉选择' : 
                     field.type === 'textarea' ? '多行文本' : field.type,
          '可选值': optionsStr,
          '说明': field.description || ''
        }
      })
      const guideSheet = XLSX.utils.json_to_sheet(fieldGuide)
      guideSheet['!cols'] = [
        { wch: 15 },
        { wch: 10 },
        { wch: 12 },
        { wch: 40 },
        { wch: 20 }
      ]
      XLSX.utils.book_append_sheet(workbook, guideSheet, '填写说明')

      // 获取模板类型的中文名称
      const typeLabel = templateTypes.find(t => t.value === template.type)?.label || template.type
      XLSX.writeFile(workbook, `${typeLabel}_数据模板.xlsx`)
      toast.success('数据模板导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败')
    }
  }

  const handleImport = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const template = JSON.parse(e.target.result)
        const templateData = {
          ...template,
          is_default: false
        }
        
        const result = await addTemplate(templateData)
        if (result.success) {
          toast.success('模板导入成功')
          loadTemplates()
        } else {
          toast.error(result.message || '导入失败')
        }
      } catch (error) {
        console.error('导入失败:', error)
        toast.error('导入失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="模板设置"
        subTitle="模板设置的年度工作落地规划"
        right={(
          <div className="flex space-x-3">
            <label className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
              <Upload size={18} />
              <span>导入模板</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Plus size={18} />
              <span>新建模板</span>
            </button>
          </div>
        )}
      />

      {/* 模板表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingTemplate ? '编辑模板' : '新建模板'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="关闭"
              >
                <X size={22} />
              </button>
            </div>
            {/* 内容 */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-field-container">
                  <label className="form-field-label">
                    模板名称<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="form-field-input-wrapper">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({...formData, name: e.target.value})
                        if (formErrors.name && e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, name: undefined }))
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {formErrors.name && <span className="text-red-500 text-xs mt-1 block">{formErrors.name}</span>}
                </div>
                <div className="form-field-container">
                  <label className="form-field-label">
                    模板类型<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="form-field-input-wrapper">
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        setFormData({...formData, type: e.target.value})
                        if (formErrors.type && e.target.value.trim()) {
                          setFormErrors(prev => ({ ...prev, type: undefined }))
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {templateTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formErrors.type && <span className="text-red-500 text-xs mt-1 block">{formErrors.type}</span>}
                </div>
              </div>

              <div className="form-field-container">
                <label className="form-field-label">模板描述</label>
                <div className="form-field-input-wrapper">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md transition-all duration-200 placeholder-gray-400 border-gray-300 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>
              </div>

              {formData.type && fieldMap[formData.type] && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">模板字段预览</label>
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-white/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fieldMap[formData.type].map((field, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                          <span className="text-sm font-semibold text-gray-800">{field.label}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">{field.type}</span>
                            {field.required && (
                              <span className="text-xs text-red-500 px-2 py-1 bg-red-100 rounded">必填</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <span className="inline-flex items-center space-x-2">
                    <Save size={18} />
                    <span>{editingTemplate ? '更新' : '创建'}</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 模板列表 */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-white/50 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">模板列表</h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-purple-600">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">模板名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">类型</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">字段数量</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">
                        {template.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {templateTypes.find(t => t.value === template.type)?.label || template.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {template.fields?.length || 0} 个字段
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {template.created_at ? new Date(template.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      template.is_default 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    }`}>
                      {template.is_default ? '系统默认' : '自定义'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                        title="编辑"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleExport(template)}
                        className="text-green-600 hover:text-green-800 transition-colors duration-200"
                        title="导出"
                      >
                        <Download size={18} />
                      </button>
                      {!template.is_default && (
                        <button
                          onClick={() => handleDelete(template)}
                          className="text-red-600 hover:text-red-800 transition-colors duration-200"
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        itemName={deleteDialog.itemName}
        title="确认删除模板"
        message="确定要删除这个模板吗？此操作不可恢复！"
      />
    </div>
  )
}

export default TemplateSettings
