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
  const YEAR = 2025
  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    importance: '',
    description: '',
    responsible: '',
    monthly_plan: ''
  })

  const EVENT_TYPES = [
    { value: 'strategic', label: '战略性事件' },
    { value: 'operational', label: '运营性事件' },
    { value: 'risk', label: '风险性事件' },
    { value: 'opportunity', label: '机会性事件' }
  ]
  const IMPORTANCE_LEVELS = [
    { value: 'critical', label: '非常重要' },
    { value: 'high', label: '重要' },
    { value: 'medium', label: '一般' },
    { value: 'low', label: '较低' }
  ]

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    const result = await getMajorEvents({ year: YEAR })
    if (result.success) {
      setMajorEvents(result.data || [])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const month = parseInt(String(formData.monthly_plan || '').trim())
    const planned_date = !isNaN(month) && month >= 1 && month <= 12
      ? `${YEAR}-${String(month).padStart(2, '0')}-01`
      : ''
    const eventData = {
      event_name: formData.event_name,
      event_type: formData.event_type,
      importance: formData.importance,
      description: formData.description,
      responsible_person: formData.responsible,
      planned_date,
      year: YEAR,
      department_id: 1
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
    const month = item.planned_date ? (new Date(item.planned_date).getMonth() + 1) : ''
    setFormData({
      event_name: item.event_name || '',
      event_type: item.event_type || '',
      importance: item.importance || '',
      description: item.description || '',
      responsible: item.responsible_person || '',
      monthly_plan: month || ''
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

  const getEventsByDimension = (typeValue) => {
    return majorEvents.filter(event => event.event_type === typeValue)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">大事件提醒（2025 同步）</h1>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">事件类型</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="form-input"
                  required
                >
                  <option value="">请选择</option>
                  {EVENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重要性</label>
                <select
                  value={formData.importance}
                  onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                  className="form-input"
                  required
                >
                  <option value="">请选择</option>
                  {IMPORTANCE_LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">计划月份</label>
                <select
                  value={formData.monthly_plan}
                  onChange={(e) => setFormData({ ...formData, monthly_plan: e.target.value })}
                  className="form-input"
                  required
                >
                  <option value="">请选择</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
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
              {EVENT_TYPES.map(et => {
                const events = getEventsByDimension(et.value)
                if (events.length === 0) {
                  return (
                    <tr key={et.value}>
                      <td className="table-cell bg-red-100 font-medium">{et.label}</td>
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
                        {et.label}
                      </td>
                    )}
                    <td className="table-cell">{event.event_name}</td>
                    <td className="table-cell">{IMPORTANCE_LEVELS.find(l => l.value === event.importance)?.label || '-'}</td>
                    <td className="table-cell">{event.description}</td>
                    <td className="table-cell">{event.responsible_person || '-'}</td>
                    <td className="table-cell">{event.planned_date ? `${new Date(event.planned_date).getMonth() + 1}月` : '-'}</td>
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
