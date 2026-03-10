import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      textAlign: 'center',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '120px',
        fontWeight: 900,
        color: 'var(--red)',
        textShadow: '0 0 40px rgba(255,51,102,0.4)',
        lineHeight: 1,
        letterSpacing: '0.1em',
        animation: 'glitch 3s infinite',
      }}>
        404
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '14px',
        color: 'var(--text-muted)',
        letterSpacing: '0.3em',
        margin: '20px 0 32px',
      }}>
        SECTOR NOT FOUND — SIGNAL LOST
      </div>
      <Link to="/" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
        ← RETURN TO BASE
      </Link>
    </div>
  )
}
