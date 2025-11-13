import React from 'react'
import { Menu, LogOut, User, Bell, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useNavigate } from 'react-router-dom'

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth()
  const { onlineUsers } = useSocket()
  const navigate = useNavigate()
  const [unread, setUnread] = React.useState(0)

  React.useEffect(() => {
    const load = () => {
      try {
        const list = JSON.parse(localStorage.getItem('notifications') || '[]')
        const count = Array.isArray(list) ? list.filter(n => !n.read).length : 0
        setUnread(count)
      } catch {
        setUnread(0)
      }
    }
    load()
    const handler = () => load()
    window.addEventListener('notificationsUpdated', handler)
    return () => window.removeEventListener('notificationsUpdated', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users size={16} />
            <span>在线用户: {onlineUsers.length}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/system/notifications')}
            className="text-gray-600 hover:text-gray-800 p-2 rounded hover:bg-gray-100 relative"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          
          <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => navigate('/system/profile')}
            >
              <User size={20} className="text-gray-600" />
              <div className="text-sm">
                <div className="font-medium text-gray-800">{user?.username}</div>
                <div className="text-gray-600">{user?.role} - {user?.department}</div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors px-3 py-2 rounded hover:bg-gray-100"
            >
              <LogOut size={18} />
              <span>退出</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
