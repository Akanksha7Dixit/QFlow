import React from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext'

import { SocketProvider } from './context/SocketContext'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QueueDetail from './pages/QueueDetail'
import Kiosk from './pages/Kiosk'
import Display from './pages/Display'
import NotFound from './pages/NotFound'
import Unauthorized from './pages/Unauthorized'

/*
 * Loading screen displayed while the authentication
 * state is being restored from the stored JWT.
 */
function AuthLoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          className="spinner"
          style={{ margin: '0 auto 16px' }}
        />

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--cyan)',
            fontSize: '12px',
            letterSpacing: '0.2em',
          }}
        >
          INITIALIZING...
        </p>
      </div>
    </div>
  )
}

/*
 * Protected route.
 *
 * If the user is not authenticated:
 *     → /login
 *
 * If roles are supplied and the user's role is not allowed:
 *     → /unauthorized
 */
function PrivateRoute({ children, roles }) {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  if (
    roles &&
    !roles.includes(user?.role)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    )
  }

  return children
}

/*
 * Application routes.
 */
function AppRoutes() {
  return (
    <Routes>

      {/* =========================
          PUBLIC ROUTES
          ========================= */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />

      {/*
       * Kiosk is intentionally public.
       * Patients can take a token without
       * entering the private dashboard.
       */}
      <Route
        path="/kiosk/:queueId"
        element={<Kiosk />}
      />

      {/*
       * Display is intentionally public.
       * It is designed for TV / waiting-room displays.
       */}
      <Route
        path="/display/:queueId"
        element={<Display />}
      />


      {/* =========================
          ADMIN ROUTES
          ========================= */}

      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['admin']}>
            <Dashboard />
          </PrivateRoute>
        }
      />


      {/* =========================
          DOCTOR ROUTES
          ========================= */}

      {/*
       * Dashboard is temporarily reused here.
       *
       * The dedicated Doctor Dashboard will replace
       * this in the next phase once the doctor-specific
       * functionality is implemented.
       */}
      <Route
        path="/doctor"
        element={
          <PrivateRoute roles={['doctor']}>
            <Dashboard />
          </PrivateRoute>
        }
      />


      {/* =========================
          PATIENT ROUTES
          ========================= */}

      {/*
       * Dashboard is temporarily reused here.
       *
       * The dedicated Patient Dashboard will replace
       * this in the next phase once patient functionality
       * is implemented.
       */}
      <Route
        path="/patient"
        element={
          <PrivateRoute roles={['patient']}>
            <Dashboard />
          </PrivateRoute>
        }
      />


      {/* =========================
          SHARED STAFF ROUTES
          ========================= */}

      {/*
       * Queue management is available to
       * administrators and doctors.
       */}
      <Route
        path="/queue/:id"
        element={
          <PrivateRoute roles={['admin', 'doctor']}>
            <QueueDetail />
          </PrivateRoute>
        }
      />


      {/* =========================
          ROOT ROUTE
          ========================= */}

      {/*
       * Redirect authenticated users according
       * to their role.
       *
       * Unauthenticated users go to login.
       */}
      <Route
        path="/"
        element={<RoleRedirect />}
      />


      {/* =========================
          FALLBACK
          ========================= */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  )
}

/*
 * Redirect the root URL according to the
 * authenticated user's role.
 */
function RoleRedirect() {
  const {
    user,
    isAuthenticated,
    loading,
  } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  switch (user?.role) {
    case 'admin':
      return (
        <Navigate
          to="/admin"
          replace
        />
      )

    case 'doctor':
      return (
        <Navigate
          to="/doctor"
          replace
        />
      )

    case 'patient':
      return (
        <Navigate
          to="/patient"
          replace
        />
      )

    default:
      return (
        <Navigate
          to="/unauthorized"
          replace
        />
      )
  }
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>

          <AppRoutes />

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              },
            }}
          />

        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  )
}