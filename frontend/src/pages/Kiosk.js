import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
axios.defaults.baseURL = API

export default function Kiosk() {
  const { queueId } = useParams()
  const [queue, setQueue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('welcome') // welcome | form | issued | track
  const [form, setForm] = useState({ name: '', phone: '' })
  const [ticket, setTicket] = useState(null)
  const [position, setPosition] = useState(null)
  const [trackNum, setTrackNum] = useState('')
  const [tracked, setTracked] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    axios.get(`/queues/${queueId}/public`)
      .then(res => setQueue(res.data))
      .catch(() => toast.error('Queue not found'))
      .finally(() => setLoading(false))
  }, [queueId])

  const joinQueue = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await axios.post(`/tickets/join/${queueId}`, {
        customer: { name: form.name || 'Guest', phone: form.phone },
      })
      setTicket(res.data.ticket)
      setPosition(res.data.position)
      setStep('issued')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join queue')
    } finally {
      setSubmitting(false)
    }
  }

  const trackTicket = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.get(`/tickets/track/${trackNum.toUpperCase()}/${queueId}`)
      setTracked(res.data)
    } catch {
      toast.error('Ticket not found')
      setTracked(null)
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      zIndex: 1,
    }}>
      <Toaster position="top-center" toastOptions={{
        style: { background:'var(--bg-elevated)', color:'var(--text-primary)', border:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:'12px' }
      }} />

      {/* Background glow */}
      <div style={{
        position:'fixed', inset:0,
        background:'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,245,255,0.05) 0%, transparent 70%)',
        pointerEvents:'none',
      }} />

      <div style={{ width:'100%', maxWidth:'480px', position:'relative', zIndex:1 }}>

        {/* Queue header */}
        {queue && (
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{
              fontFamily:'var(--font-display)',
              fontSize:'28px',
              fontWeight:900,
              color:'var(--cyan)',
              textShadow:'var(--glow-md)',
              letterSpacing:'0.15em',
              marginBottom:'8px',
            }}>
              {queue.name.toUpperCase()}
            </div>
            <span className={`badge ${queue.isOpen ? 'badge-open' : 'badge-closed'}`} style={{ fontSize:'12px', padding:'4px 12px' }}>
              {queue.isOpen ? '● OPEN' : '● CLOSED'}
            </span>
            {queue.isOpen && (
              <div style={{
                marginTop:'12px',
                fontFamily:'var(--font-mono)',
                fontSize:'12px',
                color:'var(--text-muted)',
              }}>
                {queue.waitingCount || 0} people waiting · ~{(queue.waitingCount || 0) * (queue.avgServiceTime || 5)} min estimated
              </div>
            )}
          </div>
        )}

        {/* Now serving display */}
        {queue?.currentlyServing && (
          <div style={{
            textAlign:'center',
            padding:'12px',
            marginBottom:'20px',
            background:'var(--cyan-dim)',
            border:'1px solid var(--cyan)',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.2em' }}>NOW SERVING</div>
            <div style={{
              fontFamily:'var(--font-display)',
              fontSize:'28px',
              color:'var(--cyan)',
              fontWeight:900,
              letterSpacing:'0.2em',
              textShadow:'var(--glow-sm)',
            }}>
              {queue.currentlyServing}
            </div>
          </div>
        )}

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="card animate-fadeInUp" style={{ padding:'32px' }}>
            <div className="corner-brackets" />
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={() => setStep('form')}
                disabled={!queue?.isOpen}
              >
                <span>⊕</span> TAKE A NUMBER
              </button>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setStep('track')}
              >
                ◈ TRACK MY TICKET
              </button>
            </div>
            {!queue?.isOpen && (
              <p style={{
                marginTop:'16px',
                textAlign:'center',
                fontFamily:'var(--font-mono)',
                fontSize:'11px',
                color:'var(--red)',
                letterSpacing:'0.1em',
              }}>
                THIS QUEUE IS CURRENTLY CLOSED
              </p>
            )}
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && (
          <div className="card animate-fadeInUp" style={{ padding:'32px' }}>
            <div className="corner-brackets" />
            <h2 style={{
              fontFamily:'var(--font-display)',
              fontSize:'16px',
              letterSpacing:'0.15em',
              color:'var(--cyan)',
              marginBottom:'8px',
            }}>
              YOUR DETAILS
            </h2>
            <p style={{
              fontFamily:'var(--font-mono)',
              fontSize:'11px',
              color:'var(--text-muted)',
              marginBottom:'24px',
            }}>
              Optional — helps us serve you better
            </p>
            <form onSubmit={joinQueue} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div className="form-group">
                <label className="form-label">YOUR NAME</label>
                <input
                  className="form-input"
                  placeholder="Guest"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">PHONE (OPTIONAL)</label>
                <input
                  className="form-input"
                  placeholder="+1 000 000 0000"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                />
              </div>
              <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                <button type="button" onClick={() => setStep('welcome')} className="btn btn-ghost btn-full">
                  ← BACK
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                  {submitting ? '...' : <><span>⚡</span> JOIN QUEUE</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step: Issued */}
        {step === 'issued' && ticket && (
          <div className="card animate-fadeInUp" style={{ padding:'40px', textAlign:'center' }}>
            <div className="corner-brackets" />
            <div style={{
              fontFamily:'var(--font-mono)',
              fontSize:'11px',
              color:'var(--green)',
              letterSpacing:'0.3em',
              marginBottom:'12px',
            }}>
              ✓ TICKET ISSUED
            </div>
            <div style={{
              fontFamily:'var(--font-display)',
              fontSize:'72px',
              fontWeight:900,
              color:'var(--cyan)',
              textShadow:'var(--glow-lg)',
              letterSpacing:'0.1em',
              lineHeight:1,
              marginBottom:'16px',
            }}>
              {ticket.ticketNumber}
            </div>
            <div style={{
              fontFamily:'var(--font-mono)',
              fontSize:'12px',
              color:'var(--text-muted)',
              marginBottom:'24px',
              lineHeight:1.8,
            }}>
              YOUR POSITION: <span style={{ color:'var(--amber)' }}>#{position}</span><br />
              ESTIMATED WAIT: <span style={{ color:'var(--amber)' }}>~{ticket.estimatedWait || 0} MINUTES</span>
            </div>

            <div style={{
              padding:'12px',
              background:'rgba(0,245,255,0.05)',
              border:'1px solid var(--border)',
              fontFamily:'var(--font-mono)',
              fontSize:'11px',
              color:'var(--text-muted)',
              marginBottom:'24px',
            }}>
              Please remain nearby. You'll be called when it's your turn.
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <button className="btn btn-ghost btn-full" onClick={() => setStep('welcome')}>
                ← MAIN MENU
              </button>
            </div>
          </div>
        )}

        {/* Step: Track */}
        {step === 'track' && (
          <div className="card animate-fadeInUp" style={{ padding:'32px' }}>
            <div className="corner-brackets" />
            <h2 style={{
              fontFamily:'var(--font-display)',
              fontSize:'16px',
              letterSpacing:'0.15em',
              color:'var(--cyan)',
              marginBottom:'20px',
            }}>
              TRACK YOUR TICKET
            </h2>
            <form onSubmit={trackTicket} style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
              <input
                className="form-input"
                placeholder={`${queue?.prefix || 'A'}001`}
                value={trackNum}
                onChange={e => setTrackNum(e.target.value)}
                style={{ textTransform:'uppercase', letterSpacing:'0.2em', fontSize:'18px', fontWeight:500 }}
                required
              />
              <button type="submit" className="btn btn-primary">FIND</button>
            </form>

            {tracked && (
              <div style={{
                padding:'20px',
                background:'var(--bg-surface)',
                border:'1px solid var(--border)',
                marginBottom:'16px',
              }}>
                <div style={{
                  fontFamily:'var(--font-display)',
                  fontSize:'28px',
                  color: STATUS_COLORS[tracked.ticket.status],
                  marginBottom:'8px',
                  letterSpacing:'0.1em',
                }}>
                  {tracked.ticket.ticketNumber}
                </div>
                <span className={`badge badge-${tracked.ticket.status}`}>
                  {tracked.ticket.status.toUpperCase()}
                </span>
                {tracked.ticket.status === 'waiting' && (
                  <div style={{ marginTop:'12px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-muted)' }}>
                    <div>{tracked.ahead} AHEAD OF YOU</div>
                    <div>~{tracked.estimatedWait} MIN ESTIMATED WAIT</div>
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-ghost btn-full" onClick={() => setStep('welcome')}>
              ← BACK
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const STATUS_COLORS = {
  waiting: 'var(--amber)',
  serving: 'var(--cyan)',
  completed: 'var(--green)',
  cancelled: 'var(--red)',
}
