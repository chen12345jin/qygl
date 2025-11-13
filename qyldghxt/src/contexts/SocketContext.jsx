import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

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

  useEffect(() => {
    if (user) {
      // 通过前端同域与默认 path '/socket.io'，由 Vite 代理到后端 5004
      const newSocket = io(window.location.origin, { path: '/socket.io' })
      
      newSocket.on('connect', () => {
        console.log('Socket连接成功')
        newSocket.emit('join-room', `user-${user.id}`)
      })

      newSocket.on('data-updated', (data) => {
        // 处理实时数据更新
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: data }))
      })

      newSocket.on('user-online', (users) => {
        setOnlineUsers(users)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [user])

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
