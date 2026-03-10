import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QueueDetail from './pages/QueueDetail'
import Kiosk from './pages/Kiosk'
import Display from './pages/Display'
import NotFound from './pages/NotFound'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spinner" style={{ margin:'0 auto 16px' }} />
        <p style={{ fontFamily:'var(--font-mono)', color:'var(--cyan)', fontSize:'12px', letterSpacing:'0.2em' }}>
          INITIALIZING...
        </p>
      </div>
    </div>
  )
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/queue/:id" element={<PrivateRoute><QueueDetail /></PrivateRoute>} />
      <Route path="/kiosk/:queueId" element={<Kiosk />} />
      <Route path="/display/:queueId" element={<Display />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-void)' } },
              error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-void)' } },
            }}
          />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  )
}
