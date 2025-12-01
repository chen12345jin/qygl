import React, { useEffect, useState } from 'react'
import { Bell, ArrowLeft, Mail, AlertTriangle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'

const Notifications = () => {
  const navigate = useNavigate()
  const { getNotifications } = useData()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getNotifications()
        if (res.success && Array.isArray(res.data)) {
          const normalized = res.data.map(n => ({
            id: n.id,
            type: n.type || 'info',
            title: n.title || '系统公告',
            message: n.message || n.content || '',
            time: n.published_at || n.release_time || new Date().toLocaleString('zh-CN'),
            read: n.read ?? false
          }))
          setNotifications(normalized)
          saveAndNotify(normalized)
        } else {
          const cached = JSON.parse(localStorage.getItem('notifications') || '[]')
          setNotifications(Array.isArray(cached) ? cached : [])
        }
      } catch (e) {
        const cached = JSON.parse(localStorage.getItem('notifications') || '[]')
        setNotifications(Array.isArray(cached) ? cached : [])
      }
    }
    load()
  }, [])

  const saveAndNotify = (list) => {
    setNotifications(list)
    // Before saving, ensure the list is clean and serializable to prevent circular structure errors.
    const serializableList = list.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      time: item.time,
      read: item.read,
    }));
    localStorage.setItem('notifications', JSON.stringify(serializableList))
    window.dispatchEvent(new Event('notificationsUpdated'))
  }

  const getIcon = (type) => {
    switch (type) {
      case 'info': return <Bell className="text-blue-500" size={20} />
      case 'warning': return <AlertTriangle className="text-yellow-500" size={20} />
      case 'success': return <CheckCircle className="text-green-500" size={20} />
      default: return <Bell className="text-gray-500" size={20} />
    }
  }

  const getBgColor = (type) => {
    switch (type) {
      case 'info': return 'bg-blue-50 border-blue-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'success': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 标题区域 */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              <div className="p-3 bg-gradient-to-r from-white/20 to-white/30 rounded-lg shadow-lg">
                <Bell size={24} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                通知中心
              </h1>
            </div>
            <p className="text-blue-100 text-lg">查看和管理系统通知消息</p>
          </div>
        </div>

        {/* 通知列表 */}
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`group relative p-6 rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${getBgColor(notification.type)} ${!notification.read ? 'ring-2 ring-blue-400' : ''}`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
                        未读
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3 leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {notification.time}
                    </span>
                    <div className="flex space-x-2">
                      {!notification.read && (
                        <button 
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                          onClick={() => {
                            const list = notifications.map(n => n.id === notification.id ? { ...n, read: true } : n)
                            saveAndNotify(list)
                          }}
                        >
                          标记已读
                        </button>
                      )}
                      <button 
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                        onClick={() => {
                          const list = notifications.filter(n => n.id !== notification.id)
                          saveAndNotify(list)
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无通知</h3>
            <p className="text-gray-500">当有新的系统通知时，它们会显示在这里</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications
