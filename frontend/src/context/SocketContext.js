import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socketRef.current.on('connect', () => setConnected(true))
    socketRef.current.on('disconnect', () => setConnected(false))
    return () => socketRef.current?.disconnect()
  }, [])

  const joinQueue = (queueId) => socketRef.current?.emit('join-queue', queueId)
  const leaveQueue = (queueId) => socketRef.current?.emit('leave-queue', queueId)
  const on = (event, handler) => socketRef.current?.on(event, handler)
  const off = (event, handler) => socketRef.current?.off(event, handler)

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinQueue, leaveQueue, on, off }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
