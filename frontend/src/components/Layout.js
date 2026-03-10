import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'

const NAV_ITEMS = [
  { path: '/', label: 'COMMAND CENTER', icon: '◈' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const location = useLocation()
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'var(--bg-deep)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 900,
            color: 'var(--cyan)',
            textShadow: 'var(--glow-sm)',
            letterSpacing: '0.15em',
          }}>
            QUEUE<span style={{ color: 'var(--amber)' }}>FLOW</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            letterSpacing: '0.2em',
            marginTop: '4px',
          }}>
            v3.1.4 — OPERATIONAL
          </div>
        </div>

        {/* Status */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span
            className="pulse-dot"
            style={{
              background: connected ? 'var(--green)' : 'var(--red)',
              color: connected ? 'var(--green)' : 'var(--red)',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: connected ? 'var(--green)' : 'var(--red)',
            letterSpacing: '0.1em',
          }}>
            {connected ? 'LIVE CONNECTED' : 'RECONNECTING'}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                textDecoration: 'none',
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                color: location.pathname === item.path ? 'var(--cyan)' : 'var(--text-secondary)',
                background: location.pathname === item.path ? 'var(--cyan-dim)' : 'transparent',
                borderLeft: location.pathname === item.path ? '2px solid var(--cyan)' : '2px solid transparent',
                marginBottom: '4px',
                transition: 'var(--transition)',
              }}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Time */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
        }}>
          <div style={{ color: 'var(--cyan)', fontSize: '16px', fontWeight: 500 }}>
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
          </div>
        </div>

        {/* User */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              color: 'var(--text-primary)',
              letterSpacing: '0.05em',
            }}>
              {user?.name?.toUpperCase()}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--cyan)',
              letterSpacing: '0.1em',
            }}>
              {user?.role?.toUpperCase()}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: '6px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              cursor: 'pointer',
              letterSpacing: '0.1em',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--red)'; e.target.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)' }}
          >
            EXIT
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
