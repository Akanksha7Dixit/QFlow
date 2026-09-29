import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { ArrowRight, CheckCircle2, Clock3, Stethoscope } from 'lucide-react'

export default function DoctorDashboard() {
  const [queues, setQueues] = useState([])
  const [tickets, setTickets] = useState([])
  const [selectedQueue, setSelectedQueue] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadQueues = async () => {
    try {
      const response = await axios.get('/queues')
      setQueues(response.data)
      setSelectedQueue((current) => current || response.data[0] || null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load assigned queues')
    } finally {
      setLoading(false)
    }
  }

  const loadTickets = async (queue) => {
    if (!queue) return
    try {
      const response = await axios.get(`/tickets/queue/${queue._id}`)
      setTickets(response.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load waiting patients')
    }
  }

  useEffect(() => { loadQueues() }, [])
  useEffect(() => { loadTickets(selectedQueue) }, [selectedQueue])

  const callNext = async () => {
    if (!selectedQueue) return
    try {
      await axios.post(`/tickets/queue/${selectedQueue._id}/call-next`)
      toast.success('Next patient called')
      await Promise.all([loadQueues(), loadTickets(selectedQueue)])
    } catch (error) {
      toast.error(error.response?.data?.message || 'No patient is waiting')
    }
  }

  const finishVisit = async (ticket) => {
    try {
      await axios.put(`/tickets/${ticket._id}/status`, { status: 'completed' })
      toast.success(`${ticket.ticketNumber} saved to patient history`)
      await Promise.all([loadQueues(), loadTickets(selectedQueue)])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to complete visit')
    }
  }

  const serving = tickets.find((ticket) => ticket.status === 'serving')
  const waiting = tickets.filter((ticket) => ticket.status === 'waiting')

  return (
    <Layout>
      <div style={{ padding: '32px', maxWidth: '1400px' }}>
        <div className="clinic-page-header">
          <div>
            <div className="mono text-muted">CLINICAL OPERATIONS / TODAY</div>
            <h1>Doctor <span className="text-cyan">Workspace</span></h1>
            <p className="text-secondary">Assigned queues, patient intake, and consultation handoff.</p>
          </div>
          <div className="badge badge-serving"><Stethoscope size={13} /> ON DUTY</div>
        </div>

        <div className="clinic-stat-grid">
          <StatCard label="ASSIGNED QUEUES" value={queues.length} icon="◈" color="cyan" />
          <StatCard label="WAITING PATIENTS" value={waiting.length} icon="⏱" color="amber" pulse={waiting.length > 0} />
          <StatCard label="CURRENT VISIT" value={serving?.ticketNumber || '—'} icon="⚡" color="green" />
        </div>

        <div className="clinic-workspace-grid">
          <section className="card clinic-panel">
            <div className="panel-heading"><span>ASSIGNED QUEUES</span><span className="text-muted mono">{queues.length} ACTIVE</span></div>
            {loading ? <div className="spinner" /> : queues.length === 0 ? <p className="text-muted">No queues assigned yet.</p> : queues.map((queue) => (
              <button key={queue._id} className={`queue-select ${selectedQueue?._id === queue._id ? 'is-selected' : ''}`} onClick={() => setSelectedQueue(queue)}>
                <span><strong>{queue.name}</strong><small>{queue.category} / {queue.prefix}</small></span>
                <span className="mono text-amber">{queue.waitingCount || 0} waiting</span>
              </button>
            ))}
          </section>

          <section className="card clinic-panel clinic-queue-panel">
            <div className="panel-heading"><span>{selectedQueue?.name || 'PATIENT QUEUE'}</span><span className="badge badge-open">LIVE</span></div>
            {serving && <div className="current-patient"><div><span className="mono text-muted">NOW IN CONSULTATION</span><strong>{serving.ticketNumber}</strong></div><button className="btn btn-success" onClick={() => finishVisit(serving)}><CheckCircle2 size={15} /> COMPLETE VISIT</button></div>}
            <div className="next-action"><div><span className="mono text-muted">NEXT PATIENT</span><h2>{waiting[0]?.ticketNumber || 'QUEUE CLEAR'}</h2></div><button className="btn btn-primary btn-lg" onClick={callNext} disabled={!waiting.length}><ArrowRight size={16} /> CALL NEXT</button></div>
            <div className="panel-heading"><span>WAITING ROOM</span><span className="mono text-muted">{waiting.length} PATIENTS</span></div>
            {waiting.length === 0 ? <p className="text-muted">No patients are waiting in this queue.</p> : waiting.map((ticket, index) => <div className="patient-row" key={ticket._id}><span className="queue-position">{String(index + 1).padStart(2, '0')}</span><strong>{ticket.ticketNumber}</strong><span className="text-secondary">{ticket.customer?.name || 'Walk-in patient'}</span><span className="mono text-muted"><Clock3 size={13} /> {ticket.estimatedWait || 0} min</span></div>)}
          </section>
        </div>
      </div>
    </Layout>
  )
}