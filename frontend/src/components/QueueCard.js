import React from 'react'
import { Link } from 'react-router-dom'

const CATEGORY_ICONS = {
  general: '⬡',
  medical: '✚',
  banking: '◎',
  government: '⬟',
  retail: '◈',
  'tech-support': '⟐',
  other: '◇',
}

export default function QueueCard({ queue, onToggle, onDelete, onReset }) {
  const icon = CATEGORY_ICONS[queue.category] || '◇'
  const waitColor = queue.waitingCount > 20 ? 'var(--red)' : queue.waitingCount > 10 ? 'var(--amber)' : 'var(--green)'

  return (
    <div className="card" style={{
      padding: '20px',
      borderColor: queue.isOpen ? 'var(--border)' : 'rgba(255,51,102,0.2)',
      transition: 'var(--transition)',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = queue.color || 'var(--cyan)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = queue.isOpen ? 'var(--border)' : 'rgba(255,51,102,0.2)'}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: queue.color || 'var(--cyan)',
            border: `1px solid ${queue.color || 'var(--cyan)'}40`,
            background: `${queue.color || 'var(--cyan)'}10`,
          }}>
            {icon}
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--text-primary)',
            }}>
              {queue.name.toUpperCase()}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              marginTop: '2px',
            }}>
              PREFIX: {queue.prefix} · {queue.category.toUpperCase()}
            </div>
          </div>
        </div>

        <span className={`badge ${queue.isOpen ? 'badge-open' : 'badge-closed'}`}>
          <span className="pulse-dot" style={{
            width: 6, height: 6,
            background: 'currentColor',
            color: 'currentColor',
          }} />
          {queue.isOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        background: 'var(--border)',
        marginBottom: '16px',
      }}>
        {[
          { label: 'WAITING', value: queue.waitingCount || 0, color: waitColor },
          { label: 'SERVING', value: queue.servingCount || 0, color: 'var(--cyan)' },
          { label: 'TODAY', value: queue.totalServedToday || 0, color: 'var(--green)' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-card)',
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              color: stat.color,
              fontWeight: 700,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              marginTop: '2px',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Queue code */}
      {queue.currentServing > 0 && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginBottom: '14px',
          padding: '8px 10px',
          background: 'var(--cyan-dim)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ color: 'var(--cyan)' }}>NOW SERVING: </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {queue.prefix}{String(queue.currentServing).padStart(3, '0')}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Link
          to={`/queue/${queue._id}`}
          className="btn btn-primary btn-sm"
          style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
        >
          ◈ MANAGE
        </Link>
        <button
          onClick={() => onToggle(queue._id)}
          className={`btn btn-sm ${queue.isOpen ? 'btn-danger' : 'btn-success'}`}
        >
          {queue.isOpen ? '⊗ CLOSE' : '⊕ OPEN'}
        </button>
        <button
          onClick={() => onReset(queue._id)}
          className="btn btn-ghost btn-sm"
          title="Reset daily counter"
        >
          ↺
        </button>
        <button
          onClick={() => onDelete(queue._id)}
          className="btn btn-danger btn-sm"
          title="Delete queue"
        >
          ✕
        </button>
      </div>

      {/* Kiosk / Display links */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <a
          href={`/kiosk/${queue._id}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '9px' }}
        >
          ⬡ KIOSK VIEW
        </a>
        <a
          href={`/display/${queue._id}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '9px' }}
        >
          ◈ DISPLAY BOARD
        </a>
      </div>
    </div>
  )
}
