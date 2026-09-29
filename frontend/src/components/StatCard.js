import React from 'react'

export default function StatCard({ label, value, icon, color = 'cyan', sublabel, pulse }) {
  return <div className={`metric-block metric-${color}`}>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value ?? '—'}</div>
    {sublabel && <div className="metric-sublabel">{sublabel}</div>}
    {icon && <span className="metric-symbol" aria-hidden="true">{icon}</span>}
    {pulse && <span className="metric-live">Live</span>}
  </div>
}
