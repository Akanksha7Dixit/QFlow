import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { useSocket } from '../context/SocketContext'

const STATUS_ORDER = ['waiting', 'serving', 'completed', 'cancelled']
const STATUS_COLORS = {
  waiting: 'var(--amber)',
  serving: 'var(--cyan)',
  completed: 'var(--green)',
  cancelled: 'var(--red)',
  'no-show': 'var(--text-muted)',
}

export default function QueueDetail() {
  const { id } = useParams()
  const { joinQueue, on, off } = useSocket()
  const [queue, setQueue] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)
  const [activeTab, setActiveTab] = useState('waiting')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinForm, setJoinForm] = useState({ name: '', phone: '', priority: false })
  const [joining, setJoining] = useState(false)

  const fetchQueue = useCallback(async () => {
    try {
      const [qRes, tRes] = await Promise.all([
        axios.get(`/queues/${id}/public`),
        axios.get(`/tickets/queue/${id}?limit=100`),
      ])
      setQueue(qRes.data)
      setTickets(tRes.data)
    } catch (err) {
      toast.error('Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchQueue()
    joinQueue(id)

    const handlers = {
      'ticket-joined': ({ ticket }) => {
        setTickets(prev => [...prev, ticket])
        toast('NEW TICKET: ' + ticket.ticketNumber, { icon: '⬡' })
      },
      'ticket-called': ({ ticket, queue: q }) => {
        setTickets(prev => prev.map(t =>
          t._id === ticket._id ? ticket :
          t.status === 'serving' && t._id !== ticket._id ? { ...t, status: 'completed' } : t
        ))
        setQueue(q)
        toast.success(`NOW SERVING: ${ticket.ticketNumber}`)
      },
      'ticket-updated': (ticket) => {
        setTickets(prev => prev.map(t => t._id === ticket._id ? ticket : t))
      },
      'queue-updated': (q) => setQueue(q),
      'queue-toggled': ({ isOpen }) => setQueue(prev => ({ ...prev, isOpen })),
      'queue-reset': () => { fetchQueue(); toast('QUEUE RESET', { icon: '↺' }) },
    }

    Object.entries(handlers).forEach(([event, handler]) => on(event, handler))
    return () => Object.entries(handlers).forEach(([event, handler]) => off(event, handler))
  }, [id, fetchQueue, joinQueue, on, off])

  const callNext = async () => {
    setCalling(true)
    try {
      const res = await axios.post(`/tickets/queue/${id}/call-next`)
      toast.success(`CALLED: ${res.data.ticket.ticketNumber}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'No tickets waiting')
    } finally {
      setCalling(false)
    }
  }

  const updateStatus = async (ticketId, status) => {
    try {
      await axios.put(`/tickets/${ticketId}/status`, { status })
      toast.success(`Status → ${status.toUpperCase()}`)
    } catch { toast.error('Update failed') }
  }

  const joinQueue2 = async (e) => {
    e.preventDefault()
    setJoining(true)
    try {
      const res = await axios.post(`/tickets/join/${id}`, {
        customer: { name: joinForm.name, phone: joinForm.phone },
        priority: joinForm.priority,
      })
      toast.success(`ISSUED: ${res.data.ticket.ticketNumber} · Position #${res.data.position}`)
      setShowJoinForm(false)
      setJoinForm({ name: '', phone: '', priority: false })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join queue')
    } finally {
      setJoining(false)
    }
  }

  const filteredTickets = tickets.filter(t => t.status === activeTab)
  const waitingCount = tickets.filter(t => t.status === 'waiting').length
  const servingTicket = tickets.find(t => t.status === 'serving')

  if (loading) return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="spinner" />
      </div>
    </Layout>
  )

  if (!queue) return (
    <Layout>
      <div style={{ padding:'40px', textAlign:'center' }}>
        <p style={{ fontFamily:'var(--font-display)', color:'var(--red)' }}>QUEUE NOT FOUND</p>
        <Link to="/" className="btn btn-ghost" style={{ marginTop:'16px', textDecoration:'none' }}>← BACK</Link>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div style={{ padding:'32px', position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'6px' }}>
              <Link to="/" style={{
                fontFamily:'var(--font-mono)',
                fontSize:'11px',
                color:'var(--text-muted)',
                textDecoration:'none',
                letterSpacing:'0.1em',
              }}>
                ← BACK
              </Link>
              <span style={{ color:'var(--border)' }}>/</span>
              <span style={{
                fontFamily:'var(--font-mono)',
                fontSize:'11px',
                color:'var(--text-muted)',
                letterSpacing:'0.1em',
              }}>
                QUEUE MANAGEMENT
              </span>
            </div>
            <h1 style={{
              fontFamily:'var(--font-display)',
              fontSize:'24px',
              fontWeight:900,
              letterSpacing:'0.12em',
              color:'var(--text-primary)',
            }}>
              {queue.name.toUpperCase()}
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginTop:'6px' }}>
              <span className={`badge ${queue.isOpen ? 'badge-open' : 'badge-closed'}`}>
                {queue.isOpen ? '● OPEN' : '● CLOSED'}
              </span>
              <span style={{
                fontFamily:'var(--font-mono)',
                fontSize:'10px',
                color:'var(--text-muted)',
                letterSpacing:'0.1em',
              }}>
                PREFIX: {queue.prefix} · MAX: {queue.maxCapacity}
              </span>
            </div>
          </div>

          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <button
              onClick={() => setShowJoinForm(true)}
              className="btn btn-amber"
              disabled={!queue.isOpen}
            >
              ⊕ ISSUE TICKET
            </button>
            <button
              onClick={callNext}
              className="btn btn-primary btn-lg"
              disabled={calling || waitingCount === 0}
            >
              {calling ? (
                <><div className="spinner" style={{width:14,height:14,borderWidth:1}} /> CALLING...</>
              ) : (
                <>⚡ CALL NEXT ({waitingCount})</>
              )}
            </button>
          </div>
        </div>

        {/* Now serving banner */}
        {servingTicket && (
          <div className="animate-tickerIn" style={{
            background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan)',
            padding: '16px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--glow-sm)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
              <span className="pulse-dot" style={{ background:'var(--cyan)', color:'var(--cyan)', width:10, height:10 }} />
              <div>
                <div style={{
                  fontFamily:'var(--font-mono)',
                  fontSize:'10px',
                  color:'var(--text-muted)',
                  letterSpacing:'0.2em',
                  marginBottom:'2px',
                }}>
                  NOW SERVING
                </div>
                <div style={{
                  fontFamily:'var(--font-display)',
                  fontSize:'32px',
                  fontWeight:900,
                  color:'var(--cyan)',
                  textShadow:'var(--glow-md)',
                  letterSpacing:'0.2em',
                }}>
                  {servingTicket.ticketNumber}
                </div>
              </div>
              {servingTicket.customer?.name && servingTicket.customer.name !== 'Anonymous' && (
                <div style={{
                  fontFamily:'var(--font-mono)',
                  fontSize:'13px',
                  color:'var(--text-secondary)',
                }}>
                  {servingTicket.customer.name}
                  {servingTicket.customer.phone && (
                    <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>
                      {servingTicket.customer.phone}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => updateStatus(servingTicket._id, 'completed')} className="btn btn-success btn-sm">
                ✓ COMPLETE
              </button>
              <button onClick={() => updateStatus(servingTicket._id, 'no-show')} className="btn btn-ghost btn-sm">
                ✗ NO-SHOW
              </button>
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <div style={{
          display:'flex',
          gap:'2px',
          marginBottom:'16px',
          borderBottom:'1px solid var(--border)',
        }}>
          {STATUS_ORDER.map(status => {
            const count = tickets.filter(t => t.status === status).length
            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                style={{
                  padding:'10px 16px',
                  background:'none',
                  border:'none',
                  borderBottom: activeTab === status ? `2px solid ${STATUS_COLORS[status]}` : '2px solid transparent',
                  color: activeTab === status ? STATUS_COLORS[status] : 'var(--text-muted)',
                  fontFamily:'var(--font-display)',
                  fontSize:'11px',
                  letterSpacing:'0.1em',
                  cursor:'pointer',
                  transition:'var(--transition)',
                  marginBottom:'-1px',
                }}
              >
                {status.toUpperCase()} ({count})
              </button>
            )
          })}
        </div>

        {/* Ticket list */}
        {filteredTickets.length === 0 ? (
          <div style={{
            textAlign:'center',
            padding:'60px',
            fontFamily:'var(--font-mono)',
            color:'var(--text-muted)',
            fontSize:'12px',
            letterSpacing:'0.15em',
          }}>
            NO {activeTab.toUpperCase()} TICKETS
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {filteredTickets.map((ticket, idx) => (
              <div
                key={ticket._id}
                className={`ticket-card animate-fadeInUp ${ticket.status === 'serving' ? 'serving' : ''} ${ticket.priority ? 'priority' : ''}`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
                    {/* Ticket number */}
                    <div style={{
                      fontFamily:'var(--font-display)',
                      fontSize:'22px',
                      fontWeight:700,
                      color: STATUS_COLORS[ticket.status],
                      textShadow: ticket.status === 'serving' ? 'var(--glow-sm)' : 'none',
                      minWidth:'80px',
                      letterSpacing:'0.1em',
                    }}>
                      {ticket.ticketNumber}
                    </div>

                    {/* Customer info */}
                    <div>
                      <div style={{
                        fontFamily:'var(--font-ui)',
                        fontSize:'14px',
                        fontWeight:600,
                        color:'var(--text-primary)',
                      }}>
                        {ticket.customer?.name || 'Anonymous'}
                      </div>
                      {ticket.customer?.phone && (
                        <div style={{
                          fontFamily:'var(--font-mono)',
                          fontSize:'10px',
                          color:'var(--text-muted)',
                          marginTop:'2px',
                        }}>
                          {ticket.customer.phone}
                        </div>
                      )}
                    </div>

                    {/* Wait info */}
                    {ticket.status === 'waiting' && (
                      <div style={{
                        fontFamily:'var(--font-mono)',
                        fontSize:'11px',
                        color:'var(--amber)',
                        background:'var(--amber-dim)',
                        border:'1px solid rgba(255,184,0,0.3)',
                        padding:'4px 8px',
                      }}>
                        ~{ticket.estimatedWait || 0} min wait
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span className={`badge badge-${ticket.status}`}>
                      {ticket.status.toUpperCase()}
                    </span>

                    {ticket.status === 'waiting' && (
                      <>
                        <button
                          onClick={() => updateStatus(ticket._id, 'serving')}
                          className="btn btn-primary btn-sm"
                        >
                          ▶ SERVE
                        </button>
                        <button
                          onClick={() => updateStatus(ticket._id, 'cancelled')}
                          className="btn btn-danger btn-sm"
                        >
                          ✕
                        </button>
                      </>
                    )}

                    {ticket.status === 'serving' && (
                      <>
                        <button
                          onClick={() => updateStatus(ticket._id, 'completed')}
                          className="btn btn-success btn-sm"
                        >
                          ✓ DONE
                        </button>
                        <button
                          onClick={() => updateStatus(ticket._id, 'no-show')}
                          className="btn btn-ghost btn-sm"
                        >
                          NO-SHOW
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Time info */}
                <div style={{
                  marginTop:'8px',
                  fontFamily:'var(--font-mono)',
                  fontSize:'9px',
                  color:'var(--text-muted)',
                  display:'flex',
                  gap:'16px',
                }}>
                  <span>ISSUED: {new Date(ticket.createdAt).toLocaleTimeString()}</span>
                  {ticket.calledAt && <span>CALLED: {new Date(ticket.calledAt).toLocaleTimeString()}</span>}
                  {ticket.completedAt && <span>DONE: {new Date(ticket.completedAt).toLocaleTimeString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue ticket modal */}
      {showJoinForm && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(2,4,8,0.9)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:'20px',
          backdropFilter:'blur(4px)',
        }}
          onClick={e => e.target === e.currentTarget && setShowJoinForm(false)}
        >
          <div className="card animate-fadeInUp" style={{ width:'100%', maxWidth:'400px', padding:'28px' }}>
            <div className="corner-brackets" />
            <h3 style={{
              fontFamily:'var(--font-display)',
              fontSize:'14px',
              letterSpacing:'0.15em',
              color:'var(--cyan)',
              marginBottom:'20px',
            }}>
              ISSUE NEW TICKET
            </h3>
            <form onSubmit={joinQueue2} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div className="form-group">
                <label className="form-label">CUSTOMER NAME</label>
                <input
                  className="form-input"
                  placeholder="Optional"
                  value={joinForm.name}
                  onChange={e => setJoinForm({...joinForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">PHONE</label>
                <input
                  className="form-input"
                  placeholder="Optional"
                  value={joinForm.phone}
                  onChange={e => setJoinForm({...joinForm, phone: e.target.value})}
                />
              </div>
              <label style={{
                display:'flex', alignItems:'center', gap:'10px',
                fontFamily:'var(--font-mono)', fontSize:'11px',
                color:'var(--amber)', cursor:'pointer',
                padding:'10px',
                background: joinForm.priority ? 'var(--amber-dim)' : 'transparent',
                border:'1px solid',
                borderColor: joinForm.priority ? 'rgba(255,184,0,0.4)' : 'var(--border)',
                transition:'var(--transition)',
              }}>
                <input
                  type="checkbox"
                  checked={joinForm.priority}
                  onChange={e => setJoinForm({...joinForm, priority: e.target.checked})}
                  style={{ accentColor:'var(--amber)', width:14, height:14 }}
                />
                PRIORITY TICKET
              </label>
              <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                <button type="button" onClick={() => setShowJoinForm(false)} className="btn btn-ghost btn-full">
                  CANCEL
                </button>
                <button type="submit" className="btn btn-amber btn-full" disabled={joining}>
                  {joining ? '...' : '⊕ ISSUE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
