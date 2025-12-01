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
      const newSocket = io(window.location.origin, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
        autoConnect: true
      })

      newSocket.on('connect', () => {
        newSocket.emit('join-room', `user-${user.id}`)
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
