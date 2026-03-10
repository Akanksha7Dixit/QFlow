import React from 'react'

export default function StatCard({ label, value, icon, color = 'var(--cyan)', sublabel, pulse }) {
  const colorMap = {
    cyan: 'var(--cyan)',
    amber: 'var(--amber)',
    red: 'var(--red)',
    green: 'var(--green)',
  }
  const c = colorMap[color] || color

  return (
    <div className="card" style={{
      padding: '20px 24px',
      borderColor: `${c}30`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '80px',
        height: '80px',
        background: `radial-gradient(circle, ${c}15 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 700,
            color: c,
            textShadow: `0 0 20px ${c}60`,
            lineHeight: 1,
            letterSpacing: '0.05em',
          }}>
            {value ?? '—'}
          </div>
          {sublabel && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              marginTop: '6px',
            }}>
              {sublabel}
            </div>
          )}
        </div>

        <div style={{
          width: '40px',
          height: '40px',
          border: `1px solid ${c}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: c,
          flexShrink: 0,
          position: 'relative',
        }}>
          {pulse && (
            <span
              className="pulse-dot"
              style={{
                position: 'absolute',
                top: -4, right: -4,
                width: 8, height: 8,
                background: c,
                color: c,
              }}
            />
          )}
          {icon}
        </div>
      </div>

      {/* Bottom border accent */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        height: '2px',
        width: '100%',
        background: `linear-gradient(90deg, ${c}, transparent)`,
      }} />
    </div>
  )
}
