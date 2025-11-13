import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import DeleteConfirmDialog from '../components/DeleteConfirmDialog'

const Major = () => {
  const { getMajorEvents, addMajorEvent, updateMajorEvent, deleteMajorEvent } = useData()
  const [majorEvents, setMajorEvents] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '' })
  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    importance: '',
    description: '',
    responsible: '',
    monthly_plan: ''
  })

  const dimensions = ['产品供应链', '团队建设', '渠道流量', '其他动作']
  const eventTypes = ['战略性事件', '运营性事件', '风险性事件', '机会性事件']
  const importanceLevels = ['高', '中', '低']

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    const result = await getMajorEvents()
    if (result.success) {
      setMajorEvents(result.data || [])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const eventData = {
      ...formData,
      year: new Date().getFullYear(),
      department_id: 1 // 默认部门ID，可以根据需要调整
    }
    
    if (editingId) {
      const result = await updateMajorEvent(editingId, eventData)
      if (result.success) {
        loadEvents()
        resetForm()
      }
    } else {
      const result = await addMajorEvent(eventData)
      if (result.success) {
        loadEvents()
        resetForm()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      event_name: '',
      event_type: '',
      importance: '',
      description: '',
      responsible: '',
      monthly_plan: ''
    })
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (item) => {
    // 将后端数据映射到表单字段
    setFormData({
      event_name: item.event_name || '',
      event_type: item.event_type || '',
      importance: item.importance || '',
      description: item.description || '',
      responsible: item.responsible || '',
      monthly_plan: item.monthly_plan || ''
    })
    setIsEditing(true)
    setEditingId(item.id)
  }

  const handleDelete = (event) => {
    setDeleteDialog({
      isOpen: true,
      id: event.id,
      name: event.event_name
    })
  }

  const confirmDelete = async () => {
    const result = await deleteMajorEvent(deleteDialog.id)
    if (result.success) {
      loadEvents()
    }
    setDeleteDialog({ isOpen: false, id: null, name: '' })
  }

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, id: null, name: '' })
  }

  const getEventsByDimension = (dimension) => {
    // 根据维度筛选事件，这里使用event_type作为维度
    return majorEvents.filter(event => event.event_type === dimension)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">大事件提醒</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>新增事件</span>
          </button>
        </div>

        {isEditing && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事件名称
                </label>
                <input
                  type="text"
                  value={formData.event_name}
                  onChange={(e) => setFormData({...formData, event_name: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事件类型
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">请选择</option>
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重要性
                </label>
                <select
                  value={formData.importance}
                  onChange={(e) => setFormData({...formData, importance: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">请选择</option>
                  {importanceLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  核心事项说明
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  责任人
                </label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={(e) => setFormData({...formData, responsible: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  月度分配
                </label>
                <input
                  type="text"
                  value={formData.monthly_plan}
                  onChange={(e) => setFormData({...formData, monthly_plan: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 mt-4">
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save size={16} />
                <span>{editingId ? '更新' : '保存'}</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary flex items-center space-x-2"
              >
                <X size={16} />
                <span>取消</span>
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-red-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left">事件类型</th>
                <th className="px-4 py-3 text-left">事件名称</th>
                <th className="px-4 py-3 text-left">重要性</th>
                <th className="px-4 py-3 text-left">核心事项说明</th>
                <th className="px-4 py-3 text-left">责任人</th>
                <th className="px-4 py-3 text-left">月度分配</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {eventTypes.map(eventType => {
                const events = getEventsByDimension(eventType)
                if (events.length === 0) {
                  return (
                    <tr key={eventType}>
                      <td className="table-cell bg-red-100 font-medium">{eventType}</td>
                      <td className="table-cell" colSpan="6">暂无数据</td>
                    </tr>
                  )
                }
                return events.map((event, index) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    {index === 0 && (
                      <td 
                        className="table-cell bg-red-100 font-medium" 
                        rowSpan={events.length}
                      >
                        {eventType}
                      </td>
                    )}
                    <td className="table-cell">{event.event_name}</td>
                    <td className="table-cell">{event.importance}</td>
                    <td className="table-cell">{event.description}</td>
                    <td className="table-cell">{event.responsible}</td>
                    <td className="table-cell">{event.monthly_plan}</td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(event)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              })}
              {majorEvents.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    暂无数据，请添加大事件
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        itemName={deleteDialog.name}
        itemType="大事件"
      />
    </div>
  )
}

export default Major
