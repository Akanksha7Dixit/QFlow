import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { ArrowRight, CheckCircle2, Clock3, Stethoscope } from 'lucide-react'
import { useSocket } from '../context/SocketContext'

const PRIORITY_COLORS = {
  emergency: 'var(--red)',
  urgent: 'var(--amber)',
  soon: 'var(--cyan)',
  routine: 'var(--text-muted)',
}
const PRIORITY_ORDER = {
  emergency: 0,
  urgent: 1,
  soon: 2,
  routine: 3,
}

export default function DoctorDashboard() {
  const { joinQueue, leaveQueue, on, off } = useSocket()
  const [queues, setQueues] = useState([])
  const [tickets, setTickets] = useState([])
  const [selectedQueue, setSelectedQueue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const ticketRequestRef = useRef(0)

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

  const loadTickets = useCallback(async (queue) => {
    if (!queue) return
    const requestId = ++ticketRequestRef.current
    setTicketsLoading(true)

    try {
      const response = await axios.get(
        `/tickets/queue/${queue._id}?status=waiting,serving&limit=500`
      )
      if (requestId === ticketRequestRef.current) {
        setTickets(response.data)
        setQueues((current) => current.map((item) =>
          item._id === queue._id
            ? {
              ...item,
              waitingCount: response.data.filter(
                (ticket) => ticket.status === 'waiting'
              ).length,
              servingCount: response.data.filter(
                (ticket) => ticket.status === 'serving'
              ).length,
            }
            : item
        ))
      }
    } catch (error) {
      if (requestId === ticketRequestRef.current) {
        setTickets([])
        toast.error(error.response?.data?.message || 'Unable to load waiting patients')
      }
    } finally {
      if (requestId === ticketRequestRef.current) {
        setTicketsLoading(false)
      }
    }
  }, [])

  useEffect(() => { loadQueues() }, [])
  useEffect(() => {
    setTickets([])
    loadTickets(selectedQueue)
  }, [loadTickets, selectedQueue])

  useEffect(() => {
    if (!selectedQueue) return undefined

    const queueId = selectedQueue._id
    joinQueue(queueId)

    const upsertTicket = (ticket) => {
      setTickets((current) => {
        const exists = current.some((item) => item._id === ticket._id)
        return exists
          ? current.map((item) => item._id === ticket._id ? ticket : item)
          : [...current, ticket]
      })
    }

    const handleTicketCalled = ({ ticket }) => {
      setTickets((current) =>
        current.map((item) => item._id === ticket._id ? ticket : item)
      )
    }

    const handleTicketJoined = ({ ticket }) => upsertTicket(ticket)

    on('ticket-joined', handleTicketJoined)
    on('ticket-updated', upsertTicket)
    on('ticket-called', handleTicketCalled)

    return () => {
      off('ticket-joined', handleTicketJoined)
      off('ticket-updated', upsertTicket)
      off('ticket-called', handleTicketCalled)
      leaveQueue(queueId)
    }
  }, [selectedQueue?._id, joinQueue, leaveQueue, on, off])

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

  const servingTickets = tickets.filter((ticket) => ticket.status === 'serving')
  const serving = servingTickets[0]
  const waiting = tickets
    .filter((ticket) => ticket.status === 'waiting')
    .sort((a, b) => {
      const aLevel = a.priorityLevel || (a.priority ? 'urgent' : 'routine')
      const bLevel = b.priorityLevel || (b.priority ? 'urgent' : 'routine')
      return (PRIORITY_ORDER[aLevel] ?? PRIORITY_ORDER.routine) -
        (PRIORITY_ORDER[bLevel] ?? PRIORITY_ORDER.routine) ||
        a.position - b.position
    })
  const priorityLabel = (ticket) =>
    (ticket?.priorityLevel || (ticket?.priority ? 'urgent' : 'routine')).toUpperCase()

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
                <span className="mono text-amber">
                  {(queue._id === selectedQueue?._id
                    ? waiting.length
                    : queue.waitingCount) || 0} waiting
                </span>
              </button>
            ))}
          </section>

          <section className="card clinic-panel clinic-queue-panel">
            <div className="panel-heading"><span>{selectedQueue?.name || 'PATIENT QUEUE'}</span><span className="badge badge-open">LIVE</span></div>
            {servingTickets.map((ticket) => <div className="current-patient" key={ticket._id}><div><span className="mono text-muted">NOW IN CONSULTATION</span><strong>{ticket.ticketNumber} — {priorityLabel(ticket)}</strong></div><button className="btn btn-success" onClick={() => finishVisit(ticket)}><CheckCircle2 size={15} /> COMPLETE VISIT</button></div>)}
            <div className="next-action"><div><span className="mono text-muted">NEXT PATIENT</span><h2>{ticketsLoading ? 'LOADING QUEUE...' : waiting[0] ? `${waiting[0].ticketNumber} — ${priorityLabel(waiting[0])}` : 'QUEUE CLEAR'}</h2></div><button className="btn btn-primary btn-lg" onClick={callNext} disabled={ticketsLoading || !waiting.length}><ArrowRight size={16} /> CALL NEXT</button></div>
            <div className="panel-heading"><span>WAITING ROOM</span><span className="mono text-muted">{waiting.length} PATIENTS</span></div>
            {ticketsLoading ? <p className="text-muted">Loading active patients...</p> : waiting.length === 0 ? <p className="text-muted">No patients are waiting in this queue.</p> : waiting.map((ticket, index) => {
              const level = (ticket.priorityLevel || (ticket.priority ? 'urgent' : 'routine')).toLowerCase()
              return <div className="patient-row" key={ticket._id}><span className="queue-position">{String(index + 1).padStart(2, '0')}</span><strong>{ticket.ticketNumber} — <span style={{ color: PRIORITY_COLORS[level] || PRIORITY_COLORS.routine }}>{priorityLabel(ticket)}</span></strong><span className="text-secondary">{ticket.customer?.name || 'Walk-in patient'}</span><span className="mono text-muted"><Clock3 size={13} /> {ticket.estimatedWait || 0} min</span></div>
            })}
          </section>
        </div>
      </div>
    </Layout>
  )
}