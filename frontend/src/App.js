import React from 'react'

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import {
  Toaster,
} from 'react-hot-toast'

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext'

import {
  SocketProvider,
} from './context/SocketContext'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QueueDetail from './pages/QueueDetail'
import Kiosk from './pages/Kiosk'
import Display from './pages/Display'
import NotFound from './pages/NotFound'
import Unauthorized from './pages/Unauthorized'
import Doctors from './pages/Doctors'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientDashboard from './pages/PatientDashboard'
import AdminOperations from './pages/AdminOperations'
import PatientCare from './pages/PatientCare'
import DoctorConsultation from './pages/DoctorConsultation'
import PatientProfile from './pages/PatientProfile'

/*
 * Authentication loading screen.
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
      <div
        style={{
          textAlign: 'center',
        }}
      >
        <div
          className="spinner"
          style={{
            margin: '0 auto 16px',
          }}
        />

        <p
          style={{
            fontFamily:
              'var(--font-mono)',
            color:
              'var(--cyan)',
            fontSize: '12px',
            letterSpacing:
              '0.2em',
          }}
        >
          INITIALIZING...
        </p>
      </div>
    </div>
  )
}

/*
 * Role-protected route.
 */
function PrivateRoute({
  children,
  roles,
}) {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth()

  if (loading) {
    return (
      <AuthLoadingScreen />
    )
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
    !roles.includes(
      user?.role
    )
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
 * Redirect according to role.
 */
function RoleRedirect() {
  const {
    user,
    isAuthenticated,
    loading,
  } = useAuth()

  if (loading) {
    return (
      <AuthLoadingScreen />
    )
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

function AppRoutes() {
  return (
    <Routes>

      {/* Public authentication */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/unauthorized"
        element={
          <Unauthorized />
        }
      />

      <Route
        path="/admin/doctors"
        element={
          <PrivateRoute>
            <Doctors />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/operations"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminOperations />
          </PrivateRoute>
        }
      />

      {/* Public kiosk */}
      <Route
        path="/kiosk/:queueId"
        element={<Kiosk />}
      />

      {/* Public waiting-room display */}
      <Route
        path="/display/:queueId"
        element={<Display />}
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <PrivateRoute
            roles={['admin']}
          >
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Doctor */}
      <Route
        path="/doctor"
        element={
          <PrivateRoute
            roles={['doctor']}
          >
            <DoctorDashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/doctor/consultation"
        element={
          <PrivateRoute roles={['doctor']}>
            <DoctorConsultation />
          </PrivateRoute>
        }
      />

      {/* Patient */}
      <Route
        path="/patient"
        element={
          <PrivateRoute
            roles={['patient']}
          >
            <PatientDashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/patient/care"
        element={
          <PrivateRoute roles={['patient']}>
            <PatientCare />
          </PrivateRoute>
        }
      />

      <Route
        path="/patient/profile"
        element={
          <PrivateRoute roles={['patient']}>
            <PatientProfile />
          </PrivateRoute>
        }
      />

      {/* Queue management */}
      <Route
        path="/queue/:id"
        element={
          <PrivateRoute
            roles={[
              'admin',
              'doctor',
            ]}
          >
            <QueueDetail />
          </PrivateRoute>
        }
      />

      {/* Root */}
      <Route
        path="/"
        element={
          <RoleRedirect />
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <NotFound />
        }
      />

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
            position="top-right"
            toastOptions={{
              duration: 3000,

              style: {
                background:
                  'var(--bg-elevated)',

                color:
                  'var(--text-primary)',

                border:
                  '1px solid var(--border)',

                fontFamily:
                  'var(--font-mono)',

                fontSize: '12px',
              },
            }}
          />

        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  )
}