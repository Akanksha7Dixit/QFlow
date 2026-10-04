import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { CheckCircle2, FileText, Sparkles } from 'lucide-react'

function AiIntakeSummary({ visit }) {
  const extraction = visit?.aiExtraction
  if (!extraction || extraction.status !== 'complete') return <div className="ai-result ai-result-muted"><strong>AI intake summary unavailable</strong><span>Review the original patient intake and continue with manual clinical review.</span></div>
  return <div className="ai-result"><div className="panel-heading"><span>AI INTAKE SUMMARY</span><span className="badge badge-serving">REVIEW REQUIRED</span></div><div className="ai-result-grid"><div><strong>Symptoms</strong><span>{extraction.symptoms?.join(', ') || 'Not provided'}</span></div><div><strong>Duration</strong><span>{extraction.duration || 'Missing'}</span></div><div><strong>Relevant history</strong><span>{extraction.relevantHistory?.join(', ') || 'Not provided'}</span></div><div><strong>Missing information</strong><span>{extraction.missingInformation?.join(', ') || 'None identified'}</span></div><div><strong>Routing signal</strong><span>{extraction.possibleDepartment || 'Needs review'} / {extraction.urgency}</span></div><div><strong>Red flags</strong><span>{extraction.redFlags?.join(', ') || 'None identified'}</span></div></div><p className="mono text-muted">Provider: {extraction.provider || 'unknown'} · Model: {extraction.model || 'unknown'} · Version: {extraction.extractionVersion || 'unknown'}</p></div>
}

export default function DoctorConsultation() {
  const [visits, setVisits] = useState([])
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [diagnosis, setDiagnosis] = useState('')

  const load = async () => {
    try {
      const [visitResponse, queueResponse] = await Promise.all([
        axios.get('/clinic/visits'),
        axios.get('/queues')
      ])
      const visitRecords = visitResponse.data
      const queueTickets = await Promise.all(
        queueResponse.data.map(async (queue) => {
          const response = await axios.get(`/tickets/queue/${queue._id}`)
          return response.data
            .filter((ticket) => ['waiting', 'serving'].includes(ticket.status))
            .map((ticket) => ({ ...ticket, queueName: queue.name }))
        })
      )
      const linkedTicketIds = new Set(
        visitRecords
          .map((visit) => visit.ticket?._id || visit.ticket)
          .filter(Boolean)
          .map(String)
      )
      const visitPatientEmails = new Set(
        visitRecords
          .filter((visit) => ['intake', 'triaged', 'in-consultation'].includes(visit.status))
          .map((visit) => visit.patient?.email?.trim().toLowerCase())
          .filter(Boolean)
      )
      const ticketRecords = queueTickets.flat()
        .filter((ticket) => {
          const email = ticket.customer?.email?.trim().toLowerCase()
          const linkedByPatient = email
            && visitPatientEmails.has(email)
            && visitRecords.some((visit) =>
              visit.patient?.email?.trim().toLowerCase() === email
              && ['intake', 'triaged', 'in-consultation'].includes(visit.status)
            )

          return !linkedTicketIds.has(String(ticket._id)) && !linkedByPatient
        })
        .map((ticket) => ({
          ...ticket,
          recordType: 'ticket',
          patient: { name: ticket.customer?.name || 'Queue patient' },
          intake: {
            chiefComplaint: `${ticket.ticketNumber} · ${ticket.queueName}`,
            originalText: `Queue check-in for ${ticket.ticketNumber}`,
          },
          triage: { level: 'routine' },
          consultation: ticket.consultation,
        }))
      const records = [...visitRecords, ...ticketRecords]
      setVisits(records)
      setSelected((current) => records.find(
        (record) => record._id === current?._id && record.recordType === current?.recordType
      ) || records[0] || null)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load consultations') }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setNotes(selected?.consultation?.notes || ''); setDiagnosis(selected?.consultation?.diagnosis || '') }, [selected])

  const suggestSummary = () => {
    if (!selected) return
    const extraction = selected.aiExtraction
    setNotes((current) => current || `Reviewed ${extraction?.symptoms?.join(', ') || selected.intake?.chiefComplaint || 'presenting concern'}${extraction?.duration ? ` for ${extraction.duration}` : ''}. Clinical assessment and plan documented below.`)
  }

  const chiefComplaint = selected?.intake?.chiefComplaint
    || (selected?.recordType === 'ticket' ? 'Not provided at queue check-in' : selected?.intake?.originalText)
    || 'Not provided'
  const symptoms = selected?.intake?.symptoms?.length
    ? selected.intake.symptoms.join(', ')
    : selected?.aiExtraction?.symptoms?.join(', ') || 'Not provided'
  const department = selected?.department?.name
    || selected?.ticket?.queue?.name
    || selected?.queueName
    || 'Not assigned'

  const complete = async () => {
    if (!selected) return
    try {
      if (selected.recordType === 'ticket') {
        await axios.put(`/tickets/${selected._id}/status`, {
          consultation: { notes, diagnosis }
        })
      } else {
        await axios.patch(`/clinic/visits/${selected._id}`, {
          status: 'completed',
          consultation: { notes, diagnosis, aiSummary: notes }
        })
      }
      toast.success('Consultation saved')
      await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to save consultation') }
  }

  return (
    <Layout>
      <div style={{ padding: '32px', maxWidth: '1400px' }}>
        <div className="clinic-page-header">
          <div>
            <div className="mono text-muted">DOCTOR / CONSULTATION ROOM</div>
            <h1>Clinical <span className="text-cyan">Workspace</span></h1>
            <p className="text-secondary">AI organizes intake; the doctor reviews, corrects, and confirms the record.</p>
          </div>
          <div className="badge badge-serving"><FileText size={13} /> DOCUMENTATION</div>
        </div>
        <div className="consult-grid">
          <section className="card clinic-panel">
            <div className="panel-heading">
              <span>ACTIVE PATIENTS</span>
              <span className="mono text-muted">{visits.length} RECORDS</span>
            </div>
            {visits.map((visit) => (
              <button
                className={`queue-select ${selected?._id === visit._id && selected?.recordType === visit.recordType ? 'is-selected' : ''}`}
                key={`${visit.recordType || 'visit'}-${visit._id}`}
                onClick={() => setSelected(visit)}
              >
                <span>
                  <strong>{visit.patient?.name || 'Patient'}</strong>
                  <small>{visit.intake?.chiefComplaint || 'No complaint'} · {visit.status}</small>
                </span>
                <span className="mono text-amber">{visit.triage?.level || 'routine'}</span>
              </button>
            ))}
          </section>
          <section className="card clinic-panel">
            {selected ? (
              <>
                <div className="panel-heading">
                  <span>{selected.patient?.name || 'PATIENT'} / INTAKE</span>
                  <span className="badge badge-waiting">{selected.triage?.level || 'routine'}</span>
                </div>
                <div className="intake-summary">
                  <p><strong>Chief complaint</strong>{chiefComplaint}</p>
                  <p><strong>Symptoms</strong>{symptoms}</p>
                  <p><strong>Duration</strong>{selected.intake?.duration || selected.aiExtraction?.duration || 'Not provided'}</p>
                  <p><strong>Department</strong>{department}</p>
                  <p><strong>Original patient entry</strong>{selected.intake?.originalText || selected.intake?.chiefComplaint || 'Not provided'}</p>
                  <p><strong>History</strong>{selected.intake?.history || 'Not provided'}</p>
                  <p><strong>Safety rationale</strong>{selected.triage?.rationale || 'No rationale available'}</p>
                </div>
                <AiIntakeSummary visit={selected} />
                <div className="panel-heading">
                  <span>CONSULTATION NOTES</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={suggestSummary}>
                    <Sparkles size={14} /> DRAFT SUMMARY
                  </button>
                </div>
                <textarea
                  className="form-input"
                  rows="6"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Document findings and plan"
                />
                <input
                  className="form-input consultation-diagnosis"
                  value={diagnosis}
                  onChange={(event) => setDiagnosis(event.target.value)}
                  placeholder="Diagnosis / assessment"
                />
                <button className="btn btn-success" onClick={complete}>
                  <CheckCircle2 size={15} />
                  {selected.recordType === 'ticket' ? 'SAVE CONSULTATION' : 'CONFIRM & SAVE VISIT'}
                </button>
              </>
            ) : (
              <p className="text-muted">No consultation records are waiting.</p>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}
