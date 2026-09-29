import React, {
  useState,
  useEffect,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  useAuth,
} from '../context/AuthContext'

import toast from 'react-hot-toast'

const BOOT_LINES = [
  'Preparing your clinic workspace',
  'Connecting to live operations',
  'Secure sign-in ready',
]

/*
 * Redirect authenticated users based on role.
 */
const getRoleRoute = (role) => {
  switch (role) {
    case 'admin':
      return '/admin'

    case 'doctor':
      return '/doctor'

    case 'patient':
      return '/patient'

    default:
      return '/unauthorized'
  }
}

export default function Login() {
  const [mode, setMode] =
    useState('login')

  const [form, setForm] =
    useState({
      name: '',
      email: '',
      password: '',
    })

  const [loading, setLoading] =
    useState(false)

  const [bootLines, setBootLines] =
    useState([])

  const [bootDone, setBootDone] =
    useState(false)

  const {
    login,
    register,
    isAuthenticated,
    user,
  } = useAuth()

  const navigate =
    useNavigate()

  /*
   * If a session already exists,
   * send the user to their role dashboard.
   */
  useEffect(() => {
    if (
      isAuthenticated &&
      user?.role
    ) {
      navigate(
        getRoleRoute(user.role),
        { replace: true }
      )
    }
  }, [
    isAuthenticated,
    user,
    navigate,
  ])

  /*
   * Boot animation.
   */
  useEffect(() => {
    let i = 0

    const interval =
      setInterval(() => {
        if (
          i <
          BOOT_LINES.length
        ) {
          setBootLines(
            (prev) => [
              ...prev,
              BOOT_LINES[i],
            ]
          )

          i++
        } else {
          clearInterval(
            interval
          )

          setTimeout(
            () =>
              setBootDone(true),
            400
          )
        }
      }, 260)

    return () =>
      clearInterval(interval)
  }, [])

  /*
   * Submit login/register.
   */
  const handleSubmit =
    async (e) => {
      e.preventDefault()

      setLoading(true)

      try {
        let data

        if (mode === 'login') {
          data = await login(
            form.email,
            form.password
          )

          toast.success(
            'ACCESS GRANTED'
          )
        } else {
          /*
           * AuthContext intentionally sends
           * NO role during registration.
           *
           * Backend creates patient.
           */
          data = await register(
            form.name,
            form.email,
            form.password
          )

          toast.success(
            'PATIENT ACCOUNT INITIALIZED'
          )
        }

        /*
         * Backend returns:
         *
         * data.user.role
         */
        const role =
          data?.user?.role

        navigate(
          getRoleRoute(role),
          { replace: true }
        )
      } catch (err) {
        toast.error(
          err.response?.data
            ?.message ||
            'AUTHENTICATION FAILED'
        )
      } finally {
        setLoading(false)
      }
    }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
      }}
    >
      {/* Radial glow background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(180,123,67,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              fontFamily:
                'var(--font-display)',
              fontSize: '32px',
              fontWeight: 900,
              color: 'var(--cyan)',
              textShadow:
                'var(--glow-md)',
              letterSpacing:
                '0.15em',
              animation:
                'flicker 8s infinite',
            }}
          >
            QUEUEFLOW
          </div>

          <div
            style={{
              fontFamily:
                'var(--font-mono)',
              fontSize: '11px',
              color:
                'var(--text-muted)',
              letterSpacing:
                '0.3em',
              marginTop: '6px',
            }}
          >
            SMART CLINIC OPERATIONS
          </div>
        </div>

        {/* Boot terminal */}
        {!bootDone && (
          <div
            className="card"
            style={{
              padding: '20px',
              marginBottom: '20px',
              background:
                'var(--bg-deep)',
            }}
          >
            {bootLines.map(
              (line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily:
                      'var(--font-mono)',
                    fontSize: '11px',
                    color:
                      i ===
                      bootLines.length -
                        1
                        ? 'var(--cyan)'
                        : 'var(--text-muted)',
                    marginBottom:
                      '4px',
                    animation:
                      'fadeIn 0.3s ease',
                  }}
                >
                  {line}

                  {i ===
                    bootLines.length -
                      1 && (
                    <span
                      style={{
                        display:
                          'inline-block',
                        width: '8px',
                        height: '12px',
                        background:
                          'var(--cyan)',
                        marginLeft: '4px',
                        animation:
                          'flicker 0.8s infinite',
                      }}
                    />
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* Auth card */}
        {bootDone && (
          <div
            className="card card-glow animate-fadeInUp"
            style={{
              padding: '32px',
            }}
          >
            <div className="corner-brackets" />

            {/* Tab selector */}
            <div
              style={{
                display: 'flex',
                marginBottom: '28px',
                borderBottom:
                  '1px solid var(--border)',
              }}
            >
              {[
                'login',
                'register',
              ].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setMode(m)
                  }
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'none',
                    border: 'none',
                    borderBottom:
                      mode === m
                        ? '2px solid var(--cyan)'
                        : '2px solid transparent',
                    color:
                      mode === m
                        ? 'var(--cyan)'
                        : 'var(--text-muted)',
                    fontFamily:
                      'var(--font-display)',
                    fontSize: '11px',
                    letterSpacing:
                      '0.15em',
                    cursor: 'pointer',
                    transition:
                      'var(--transition)',
                    textTransform:
                      'uppercase',
                    marginBottom: '-1px',
                  }}
                >
                  {m === 'login'
                    ? 'AUTHENTICATE'
                    : 'REGISTER'}
                </button>
              ))}
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: '16px',
              }}
            >
              {mode ===
                'register' && (
                <div className="form-group">
                  <label className="form-label">
                    PATIENT NAME
                  </label>

                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter your name"
                    value={
                      form.name
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target
                          .value,
                      })
                    }
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  ACCESS ID (EMAIL)
                </label>

                <input
                  className="form-input"
                  type="email"
                  placeholder="patient@clinic.io"
                  value={
                    form.email
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target
                        .value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  SECURITY KEY (PASSWORD)
                </label>

                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={
                    form.password
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password:
                        e.target.value,
                    })
                  }
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
                style={{
                  marginTop: '8px',
                }}
              >
                {loading ? (
                  <>
                    <div
                      className="spinner"
                      style={{
                        width: 16,
                        height: 16,
                        borderWidth: 1,
                      }}
                    />

                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <span>
                      ⚡
                    </span>

                    {mode ===
                    'login'
                      ? 'GRANT ACCESS'
                      : 'CREATE PATIENT ACCOUNT'}
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: '20px',
                padding: '12px',
                background:
                  'rgba(0,245,255,0.04)',
                border:
                  '1px solid var(--border)',
                fontFamily:
                  'var(--font-mono)',
                fontSize: '10px',
                color:
                  'var(--text-muted)',
              }}
            >
              <span
                style={{
                  color:
                    'var(--amber)',
                }}
              >
                {mode ===
                'register'
                  ? 'PATIENT:'
                  : 'DEMO:'}
              </span>{' '}

              {mode ===
              'register'
                ? 'Public registration creates a patient account. Doctor and admin accounts are managed by administrators.'
                : 'Use credentials for an existing account. Your dashboard is selected automatically according to your role.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}