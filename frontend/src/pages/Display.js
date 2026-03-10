import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'
axios.defaults.baseURL = API

export default function Display() {
  const { queueId } = useParams()
  const [queue, setQueue] = useState(null)
  const [serving, setServing] = useState(null)
  const [waiting, setWaiting] = useState([])
  const [recent, setRecent] = useState([])
  const [time, setTime] = useState(new Date())
  const [flashNew, setFlashNew] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [qRes, tRes] = await Promise.all([
          axios.get(`/queues/${queueId}/public`),
          axios.get(`/tickets/queue/${queueId}?limit=50`, {
            headers: { Authorization: '' } // skip auth for display
          }).catch(() => ({ data: [] })),
        ])
        setQueue(qRes.data)

        const all = tRes.data
        setServing(all.find(t => t.status === 'serving') || null)
        setWaiting(all.filter(t => t.status === 'waiting').slice(0, 10))
        setRecent(all.filter(t => t.status === 'completed').slice(0, 5))
      } catch {}
    }
    load()

    const socket = io(SOCKET_URL)
    socket.emit('join-queue', queueId)

    socket.on('ticket-called', ({ ticket, queue: q }) => {
      setServing(ticket)
      setQueue(q)
      setFlashNew(true)
      setTimeout(() => setFlashNew(false), 3000)
      setWaiting(prev => prev.filter(t => t._id !== ticket._id))
    })

    socket.on('ticket-joined', ({ ticket, waitingCount }) => {
      setWaiting(prev => [...prev, ticket].slice(0, 10))
    })

    socket.on('queue-toggled', ({ isOpen }) => {
      setQueue(prev => prev ? { ...prev, isOpen } : prev)
    })

    return () => socket.disconnect()
  }, [queueId])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      position: 'relative',
      zIndex: 1,
      overflow: 'hidden',
    }}>
      {/* Animated scan line */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)',
        opacity: 0.4,
        animation: 'scanline 6s linear infinite',
        zIndex: 9997,
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '40px',
        paddingBottom: '24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            color: 'var(--text-muted)',
            letterSpacing: '0.3em',
            marginBottom: '4px',
          }}>
            QUEUE DISPLAY SYSTEM
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            fontWeight: 900,
            color: 'var(--cyan)',
            textShadow: 'var(--glow-md)',
            letterSpacing: '0.15em',
          }}>
            {queue?.name?.toUpperCase() || 'LOADING...'}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
          }}>
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '2px',
          }}>
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', flex: 1 }}>

        {/* Left: Now serving */}
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.3em',
            color: 'var(--text-muted)',
            marginBottom: '16px',
          }}>
            ── NOW SERVING ──
          </div>

          <div style={{
            background: flashNew ? 'rgba(0,245,255,0.1)' : 'var(--bg-card)',
            border: `2px solid ${flashNew ? 'var(--cyan)' : 'rgba(0,245,255,0.3)'}`,
            padding: '48px',
            textAlign: 'center',
            transition: 'all 0.5s ease',
            boxShadow: flashNew ? 'var(--glow-lg)' : 'none',
            marginBottom: '32px',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(80px, 15vw, 160px)',
              fontWeight: 900,
              color: 'var(--cyan)',
              textShadow: flashNew ? 'var(--glow-lg)' : 'var(--glow-md)',
              letterSpacing: '0.1em',
              lineHeight: 1,
              animation: flashNew ? 'flicker 0.5s' : 'none',
            }}>
              {serving?.ticketNumber || '---'}
            </div>

            {serving?.customer?.name && serving.customer.name !== 'Anonymous' && (
              <div style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '24px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginTop: '16px',
                letterSpacing: '0.05em',
              }}>
                {serving.customer.name.toUpperCase()}
              </div>
            )}

            {!serving && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '16px',
                color: 'var(--text-muted)',
                letterSpacing: '0.2em',
                marginTop: '16px',
              }}>
                STAND BY...
              </div>
            )}
          </div>

          {/* Recently served */}
          {recent.length > 0 && (
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
                marginBottom: '12px',
              }}>
                ── RECENTLY SERVED ──
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {recent.map(t => (
                  <div key={t._id} style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    color: 'var(--green)',
                    padding: '8px 16px',
                    border: '1px solid rgba(0,255,136,0.2)',
                    background: 'rgba(0,255,136,0.05)',
                    letterSpacing: '0.1em',
                    opacity: 0.6,
                  }}>
                    {t.ticketNumber}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Queue list */}
        <div>
          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            background: 'var(--border)',
            marginBottom: '24px',
          }}>
            {[
              { label: 'WAITING', value: waiting.length, color: 'var(--amber)' },
              { label: 'STATUS', value: queue?.isOpen ? 'OPEN' : 'CLOSED', color: queue?.isOpen ? 'var(--green)' : 'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-card)',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '28px',
                  color: s.color,
                  fontWeight: 700,
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.1em',
                  marginTop: '4px',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Waiting list */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            marginBottom: '12px',
          }}>
            ── UPCOMING ──
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {waiting.length === 0 ? (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                letterSpacing: '0.15em',
                border: '1px dashed var(--border)',
              }}>
                QUEUE EMPTY
              </div>
            ) : (
              waiting.map((t, i) => (
                <div key={t._id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: i === 0 ? 'rgba(255,184,0,0.08)' : 'var(--bg-card)',
                  border: `1px solid ${i === 0 ? 'rgba(255,184,0,0.3)' : 'var(--border)'}`,
                  transition: 'all 0.3s',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    color: i === 0 ? 'var(--amber)' : 'var(--text-secondary)',
                    letterSpacing: '0.1em',
                    fontWeight: 700,
                  }}>
                    {t.ticketNumber}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                  }}>
                    <div>POS #{i + 1}</div>
                    {i === 0 && <div style={{ color: 'var(--amber)', marginTop: '2px' }}>NEXT UP</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '40px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--text-muted)',
        letterSpacing: '0.15em',
      }}>
        <span>QUEUEFLOW DISPLAY SYSTEM v3.1.4</span>
        <span>LIVE — REAL-TIME UPDATES ACTIVE</span>
      </div>
    </div>
  )
}
