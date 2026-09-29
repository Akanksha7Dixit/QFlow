import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const goToDashboard = () => {
    if (!user) {
      navigate('/login')
      return
    }

    switch (user.role) {
      case 'admin':
        navigate('/admin')
        break

      case 'doctor':
        navigate('/doctor')
        break

      case 'patient':
        navigate('/patient')
        break

      default:
        navigate('/login')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,70,70,0.06) 0%, transparent 70%)',
        }}
      />

      <div
        className="card animate-fadeInUp"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '48px 32px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="corner-brackets" />

        <div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--red)',
            background: 'rgba(255, 70, 70, 0.08)',
            color: 'var(--red)',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 900,
            letterSpacing: '0.2em',
            color: 'var(--red)',
            marginBottom: '12px',
          }}
        >
          ACCESS DENIED
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            color: 'var(--text-primary)',
            marginBottom: '16px',
          }}
        >
          403
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: 1.8,
            color: 'var(--text-muted)',
            maxWidth: '400px',
            margin: '0 auto 28px',
          }}
        >
          Your account does not have permission to access
          this section of QueueFlow.
        </p>

        {user?.role && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              marginBottom: '28px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--cyan)',
              }}
            />

            ROLE: {user.role}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={goToDashboard}
          >
            GO TO DASHBOARD
          </button>

          <Link
            to="/login"
            className="btn btn-ghost"
          >
            <ArrowLeft size={14} />
            LOGIN
          </Link>
        </div>
      </div>
    </div>
  )
}