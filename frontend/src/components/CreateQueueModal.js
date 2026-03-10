import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const CATEGORIES = ['general','medical','banking','government','retail','tech-support','other']
const COLORS = ['#00f5ff','#ffb800','#00ff88','#ff3366','#a855f7','#f97316','#06b6d4']

export default function CreateQueueModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'general',
    prefix: 'A',
    maxCapacity: 100,
    avgServiceTime: 5,
    color: '#00f5ff',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('/queues', form)
      toast.success('QUEUE INITIALIZED')
      onCreated(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'FAILED TO CREATE QUEUE')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(2,4,8,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card animate-fadeInUp" style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '32px',
      }}>
        <div className="corner-brackets" />

        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              color: 'var(--cyan)',
              letterSpacing: '0.15em',
            }}>
              INITIALIZE NEW QUEUE
            </h2>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}>
              Configure queue parameters
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              width: 32, height: 32,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">QUEUE NAME *</label>
            <input
              className="form-input"
              placeholder="e.g. GENERAL SERVICES"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea
              className="form-input"
              placeholder="Brief description..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">CATEGORY</label>
              <select
                className="form-input"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">TICKET PREFIX</label>
              <input
                className="form-input"
                placeholder="A"
                value={form.prefix}
                onChange={e => setForm({ ...form, prefix: e.target.value.toUpperCase().slice(0, 3) })}
                maxLength={3}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">MAX CAPACITY</label>
              <input
                className="form-input"
                type="number"
                min={1} max={999}
                value={form.maxCapacity}
                onChange={e => setForm({ ...form, maxCapacity: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">AVG SERVICE (MIN)</label>
              <input
                className="form-input"
                type="number"
                min={1} max={120}
                value={form.avgServiceTime}
                onChange={e => setForm({ ...form, avgServiceTime: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ACCENT COLOR</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 32, height: 32,
                    background: c,
                    border: form.color === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    boxShadow: form.color === c ? `0 0 12px ${c}` : 'none',
                    transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-full">
              CANCEL
            </button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 1 }} /> CREATING...</>
              ) : (
                <><span>⊕</span> DEPLOY QUEUE</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
