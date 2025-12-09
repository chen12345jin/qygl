import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, FileText, Download, Upload } from 'lucide-react'
import PageHeaderBanner from '../../components/PageHeaderBanner'
import { toast } from 'react-hot-toast'
import { useData } from '../../contexts/DataContext'
import DeleteConfirmDialog from '../../components/DeleteConfirmDialog'

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

  // 定义字段映射
  const fieldMap = {
    department_target: [
      { key: 'department', label: '部门', type: 'text', required: true },
      { key: 'target_type', label: '目标类型', type: 'select', required: true, options: [
        { value: 'sales', label: '销售目标' },
        { value: 'profit', label: '利润目标' },
        { value: 'cost', label: '成本目标' }
      ]},
      { key: 'target_value', label: '目标值', type: 'number', required: true },
      { key: 'unit', label: '单位', type: 'text', required: true },
      { key: 'description', label: '描述', type: 'textarea', required: false }
    ],
    annual_work_plan: [
      { key: 'title', label: '计划标题', type: 'text', required: true },
      { key: 'department', label: '责任部门', type: 'text', required: true },
      { key: 'start_date', label: '开始日期', type: 'date', required: true },
      { key: 'end_date', label: '结束日期', type: 'date', required: true },
      { key: 'description', label: '计划描述', type: 'textarea', required: true },
      { key: 'priority', label: '优先级', type: 'select', required: true, options: [
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' }
      ]}
    ],
    major_event: [
      { key: 'event_name', label: '事件名称', type: 'text', required: true },
      { key: 'event_type', label: '事件类型', type: 'select', required: true, options: [
        { value: 'strategic', label: '战略性事件' },
        { value: 'operational', label: '运营性事件' },
        { value: 'market', label: '市场性事件' }
      ]},
      { key: 'impact_level', label: '影响程度', type: 'select', required: true, options: [
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' }
      ]},
      { key: 'planned_date', label: '计划日期', type: 'date', required: true },
      { key: 'description', label: '事件描述', type: 'textarea', required: true }
    ],
    monthly_progress: [
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
      { key: 'progress_rate', label: '完成率', type: 'number', required: true },
      { key: 'target_amount', label: '目标金额', type: 'number', required: true },
      { key: 'actual_amount', label: '实际金额', type: 'number', required: true },
      { key: 'notes', label: '备注', type: 'textarea', required: false }
    ],
    action_plan: [
      { key: 'what', label: 'What (做什么)', type: 'text', required: true },
      { key: 'why', label: 'Why (为什么)', type: 'textarea', required: true },
      { key: 'when', label: 'When (什么时候)', type: 'date', required: true },
      { key: 'where', label: 'Where (在哪里)', type: 'text', required: true },
      { key: 'who', label: 'Who (谁来做)', type: 'text', required: true },
      { key: 'how', label: 'How (怎么做)', type: 'textarea', required: true },
      { key: 'how_much', label: 'How Much (多少钱)', type: 'number', required: true }
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
        setTemplates(result.data || [])
      } else {
        console.error('加载模板失败:', result.message)
        setTemplates([])
      }
    } catch (error) {
      console.error('加载模板失败:', error)
      setTemplates([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.type) {
      toast.error('请填写完整信息')
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
          toast.error(result.message || '创建失败')
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
      const dataStr = JSON.stringify(template, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${template.name}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('模板导出成功')
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
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-800 mb-2">
                    模板名称
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-800 mb-2">
                    模板类型
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    {templateTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">模板描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  rows="3"
                />
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
