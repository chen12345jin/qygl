import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { useLocation } from 'react-router-dom'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const { user } = useAuth()
  const location = useLocation()
  const currentRoomRef = useRef(null)

  useEffect(() => {
    if (user) {
      let serverBase = 'http://localhost:5004'
      const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('SERVER_URL') : ''
      const fromWindow = (typeof window !== 'undefined' && window.SERVER_CONFIG && window.SERVER_CONFIG.BASE_URL)
      if (fromStorage && fromStorage.trim()) {
        serverBase = fromStorage.trim()
      } else if (fromWindow && String(fromWindow).trim()) {
        serverBase = String(fromWindow).trim()
      }
      const newSocket = io(serverBase, {
        path: '/socket.io',
        transports: ['websocket', 'polling'], // 优先使用 websocket
        reconnection: true,
        reconnectionAttempts: 3, // 减少重连尝试次数
        reconnectionDelay: 5000, // 增加重连间隔到5秒
        reconnectionDelayMax: 30000, // 最大重连间隔30秒
        timeout: 20000, // 增加超时时间
        autoConnect: true,
        forceNew: false, // 避免创建多个连接
        withCredentials: true
      })

      newSocket.on('connect', () => {
        newSocket.emit('join-room', `user-${user.id}`)
        const p = location.pathname || ''
        let r = null
        if (p.startsWith('/major-events')) r = 'majorEvents'
        else if (p.startsWith('/monthly-progress')) r = 'monthlyProgress'
        else if (p.startsWith('/action-plans')) r = 'actionPlans'
        else if (p.startsWith('/annual-planning')) r = 'annualWorkPlans'
        else if (p.startsWith('/department-targets')) r = 'departmentTargets'
        else if (p.startsWith('/data-analysis')) {
          // 数据分析页面需要监听所有相关数据更新
          ['departmentTargets', 'majorEvents', 'monthlyProgress', 'annualWorkPlans', 'actionPlans'].forEach(room => {
            newSocket.emit('join-room', room)
          })
          r = 'departmentTargets' // 设为默认房间
        }
        else r = 'notifications'
        currentRoomRef.current = r
        if (r) {
          newSocket.emit('join-room', r)
        }
      })

      newSocket.on('data-updated', (data) => {
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: data }))
      })

      newSocket.on('user-online', (users) => {
        setOnlineUsers(users)
      })

      newSocket.on('connect_error', () => {})
      newSocket.on('reconnect_attempt', () => {})
      newSocket.on('reconnect_error', () => {})
      newSocket.on('reconnect_failed', () => {})

      const handleOnline = () => {
        try { newSocket.connect() } catch {}
      }
      const handleOffline = () => {
        try { newSocket.disconnect() } catch {}
      }
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      setSocket(newSocket)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        newSocket.close()
      }
    }
  }, [user])

  useEffect(() => {
    if (!socket) return
    const p = location.pathname || ''
    let newRooms = []
    let r = null
    
    if (p.startsWith('/major-events')) {
      r = 'majorEvents'
      newRooms = [r]
    } else if (p.startsWith('/monthly-progress')) {
      r = 'monthlyProgress'
      newRooms = [r]
    } else if (p.startsWith('/action-plans')) {
      r = 'actionPlans'
      newRooms = [r]
    } else if (p.startsWith('/annual-planning')) {
      r = 'annualWorkPlans'
      newRooms = [r]
    } else if (p.startsWith('/department-targets')) {
      r = 'departmentTargets'
      newRooms = [r]
    } else if (p.startsWith('/data-analysis')) {
      // 数据分析页面需要监听所有相关数据更新
      newRooms = ['departmentTargets', 'majorEvents', 'monthlyProgress', 'annualWorkPlans', 'actionPlans']
      r = 'departmentTargets' // 设为默认房间
    } else {
      r = 'notifications'
      newRooms = [r]
    }
    
    const prev = currentRoomRef.current
    
    // 如果之前在不同的单一房间，离开之前的房间
    if (prev && !newRooms.includes(prev)) {
      try { socket.emit('leave-room', prev) } catch {}
    }
    
    // 如果之前在数据分析页面，现在离开，需要离开所有相关房间
    if (prev && prev === 'departmentTargets' && !p.startsWith('/data-analysis')) {
      ['departmentTargets', 'majorEvents', 'monthlyProgress', 'annualWorkPlans', 'actionPlans'].forEach(room => {
        try { socket.emit('leave-room', room) } catch {}
      })
    }
    
    // 加入新房间
    newRooms.forEach(room => {
      try { socket.emit('join-room', room) } catch {}
    })
    
    currentRoomRef.current = r
  }, [socket, location.pathname])

  const emitDataUpdate = (room, data) => {
    if (socket) {
      socket.emit('data-update', { room, ...data })
    }
  }

  const value = {
    socket,
    onlineUsers,
    emitDataUpdate
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
