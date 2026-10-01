import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { ArrowRight, ClipboardList, HeartPulse, UserRound } from 'lucide-react'

export default function PatientDashboard() {

  const { user } = require('../context/AuthContext').useAuth()
  const [queues, setQueues] = useState([])
  const [ticket, setTicket] = useState(() => JSON.parse(localStorage.getItem('qf_patient_ticket') || 'null'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    axios.get('/queues/public').then((response) => setQueues(response.data)).catch(() => toast.error('Unable to load departments')).finally(() => setLoading(false))
  }, [])

  const joinQueue = async (queue) => {
    try {
      const response = await axios.post(`/tickets/join/${queue._id}`, { customer: { name: user?.name, email: user?.email } })
      setTicket({ ...response.data.ticket, queueName: queue.name, position: response.data.position, estimatedWait: response.data.estimatedWait })
      localStorage.setItem('qf_patient_ticket', JSON.stringify({ ...response.data.ticket, queueName: queue.name, position: response.data.position, estimatedWait: response.data.estimatedWait }))
      toast.success(`You are checked in as ${response.data.ticket.ticketNumber}`)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to join queue') }
  }

  const clearTicket = () => { localStorage.removeItem('qf_patient_ticket'); setTicket(null) }

  
  return <Layout><div style={{ padding: '32px', maxWidth: '1400px' }}>
    <div className="clinic-page-header"><div><div className="mono text-muted">PATIENT PORTAL / NEW VISIT</div><h1>Your <span className="text-cyan">Care Journey</span></h1><p className="text-secondary">Choose a department to begin a structured clinic visit.</p></div><div className="badge badge-serving"><HeartPulse size={13} /> PATIENT</div></div>
    <div className="clinic-stat-grid"><StatCard label="OPEN DEPARTMENTS" value={queues.length} icon="◈" color="cyan" /><StatCard label="ACTIVE TICKET" value={ticket?.ticketNumber || '—'} icon="⏱" color="amber" /><StatCard label="PROFILE" value="READY" icon="✓" color="green" /></div>
    {ticket && <section className="card patient-ticket"><div><span className="mono text-muted">YOUR ACTIVE VISIT / {ticket.queueName}</span><h2>{ticket.ticketNumber}</h2><p className="text-secondary">Position {ticket.position || '—'} · estimated wait {ticket.estimatedWait || 0} minutes</p></div><button className="btn btn-ghost" onClick={clearTicket}>END VISIT</button></section>}
    <div className="panel-heading page-section-heading"><span>START NEW VISIT</span><span className="mono text-muted">{queues.length} DEPARTMENTS AVAILABLE</span></div>
    <div className="patient-department-grid">{loading ? <div className="spinner" /> : queues.map((queue) => <article className="card department-card" key={queue._id}><div className="department-icon"><ClipboardList size={20} /></div><div><h3>{queue.name}</h3><p className="text-secondary">{queue.description || 'General clinical consultation'}</p><div className="mono text-muted">{queue.waitingCount} waiting · ~{queue.avgServiceTime} min/service</div></div><button className="btn btn-primary" onClick={() => joinQueue(queue)} disabled={Boolean(ticket)}><UserRound size={15} /> CHECK IN <ArrowRight size={14} /></button></article>)}</div>
  </div></Layout>
}