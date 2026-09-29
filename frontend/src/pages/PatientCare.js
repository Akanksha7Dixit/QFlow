import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { Bell, CalendarDays, ClipboardList, History, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const emptyIntake = { chiefComplaint: '', naturalLanguage: '', symptoms: '', duration: '', history: '', department: '' }

function ExtractionResult({ extraction }) {
  if (!extraction) return null
  if (extraction.status !== 'complete') return <div className="ai-result ai-result-muted"><strong>AI processing unavailable</strong><span>The structured intake and safety triage were saved. Clinic staff can continue manually.</span></div>
  return <div className="ai-result"><div className="panel-heading"><span>INTAKE UNDERSTANDING</span><span className="badge badge-serving">NON-DIAGNOSTIC</span></div><div className="ai-result-grid"><div><strong>Symptoms</strong><span>{extraction.symptoms?.join(', ') || 'Not provided'}</span></div><div><strong>Duration</strong><span>{extraction.duration || 'Missing'}</span></div><div><strong>Possible department</strong><span>{extraction.possibleDepartment || 'Needs review'}</span></div><div><strong>Urgency signal</strong><span>{extraction.urgency}</span></div></div>{extraction.missingInformation?.length > 0 && <p className="ai-missing">Additional information requested: {extraction.missingInformation.join(', ')}</p>}</div>
}

export default function PatientCare() {
  const { user } = useAuth()
  const [tab, setTab] = useState('intake')
  const [departments, setDepartments] = useState([])
  const [visits, setVisits] = useState([])
  const [form, setForm] = useState(emptyIntake)
  const [appointment, setAppointment] = useState({ department: '', appointmentAt: '' })
  const [notice, setNotice] = useState('Live care updates enabled')
  const [processing, setProcessing] = useState(false)
  const [lastExtraction, setLastExtraction] = useState(null)

  const load = async () => {
    try {
      const [departmentResponse, visitResponse] = await Promise.all([axios.get('/clinic/departments'), axios.get('/clinic/visits')])
      setDepartments(departmentResponse.data)
      setVisits(visitResponse.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load care data')
    }
  }

  useEffect(() => { load() }, [])

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const submitIntake = async (event) => {
    event.preventDefault()
    setProcessing(true)
    setLastExtraction(null)
    setNotice('Analyzing intake...')
    try {
      const response = await axios.post('/clinic/visits', {
        ...form,
        symptoms: form.symptoms.split(',').map((item) => item.trim()).filter(Boolean),
      })
      setLastExtraction(response.data.aiExtraction)
      setNotice(response.data.aiExtraction?.status === 'complete' ? 'Intake understood and routed' : 'Intake saved for clinic review')
      toast.success('Intake saved')
      setForm(emptyIntake)
      await load()
    } catch (error) {
      setNotice('Live care updates enabled')
      toast.error(error.response?.data?.message || 'Unable to save intake')
    } finally {
      setProcessing(false)
    }
  }

  const book = async (event) => {
    event.preventDefault()
    try {
      await axios.post('/clinic/appointments', appointment)
      toast.success('Appointment request saved')
      setNotice('Appointment added to your care timeline')
      await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to book appointment') }
  }

  const nav = [['intake', 'INTAKE', ClipboardList], ['history', 'HISTORY', History], ['appointments', 'APPOINTMENTS', CalendarDays], ['notifications', 'NOTIFICATIONS', Bell]]

  return <Layout><div style={{ padding: '32px', maxWidth: '1200px' }}>
    <div className="clinic-page-header"><div><div className="mono text-muted">PATIENT CARE / {user?.name?.toUpperCase()}</div><h1>Care <span className="text-cyan">Timeline</span></h1><p className="text-secondary">Structured intake, patient language, and follow-up planning.</p></div><div className="badge badge-serving"><Bell size={13} /> {notice}</div></div>
    <div className="ops-tabs">{nav.map(([key, label, Icon]) => <button className={`ops-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)} key={key}><Icon size={15} /> {label}</button>)}</div>
    {tab === 'intake' && <><form className="card clinic-panel intake-form" onSubmit={submitIntake}><div className="panel-heading"><span>STRUCTURED PATIENT INTAKE</span><span className="mono text-muted">AI EXTRACTION + RULE TRIAGE</span></div><label className="form-group"><span className="form-label">CHIEF COMPLAINT</span><input className="form-input" value={form.chiefComplaint} onChange={(event) => updateForm('chiefComplaint', event.target.value)} placeholder="Short description of the problem" required /></label><label className="form-group"><span className="form-label">DESCRIBE IT IN YOUR OWN WORDS</span><textarea className="form-input" rows="4" maxLength="5000" value={form.naturalLanguage} onChange={(event) => updateForm('naturalLanguage', event.target.value)} placeholder="For example: I have had fever and cough for three days and feel very tired." /><span className="mono text-muted form-hint">This is used for structured information extraction, not diagnosis.</span></label><label className="form-group"><span className="form-label">SYMPTOMS</span><input className="form-input" value={form.symptoms} onChange={(event) => updateForm('symptoms', event.target.value)} placeholder="Separate known symptoms with commas" /></label><div className="two-column"><label className="form-group"><span className="form-label">DURATION</span><input className="form-input" value={form.duration} onChange={(event) => updateForm('duration', event.target.value)} placeholder="e.g. 3 days" /></label><label className="form-group"><span className="form-label">DEPARTMENT</span><select className="form-input" value={form.department} onChange={(event) => updateForm('department', event.target.value)}><option value="">Auto-route for review</option>{departments.map((department) => <option value={department._id} key={department._id}>{department.name}</option>)}</select></label></div><label className="form-group"><span className="form-label">RELEVANT HISTORY</span><textarea className="form-input" rows="4" maxLength="2000" value={form.history} onChange={(event) => updateForm('history', event.target.value)} placeholder="Allergies, medications, prior conditions, or say not known" /></label><button className="btn btn-primary" disabled={processing}><Send size={15} /> {processing ? 'ANALYZING INTAKE...' : 'SUBMIT INTAKE'}</button></form><ExtractionResult extraction={lastExtraction} /></>}
    {tab === 'history' && <section className="care-list">{visits.filter((visit) => visit.status !== 'intake').map((visit) => <article className="card care-record" key={visit._id}><div><span className="mono text-muted">{new Date(visit.createdAt).toLocaleDateString()} · {visit.department?.name || 'Routing pending'}</span><h3>{visit.intake?.chiefComplaint || 'Visit'}</h3><p className="text-secondary">{visit.aiExtraction?.symptoms?.join(', ') || visit.consultation?.aiSummary || visit.triage?.rationale || 'Awaiting clinical review.'}</p></div><span className={`badge badge-${visit.status === 'completed' ? 'completed' : 'waiting'}`}>{visit.status}</span></article>)}{!visits.length && <p className="text-muted">Your history will appear here after your first intake.</p>}</section>}
    {tab === 'appointments' && <section className="card clinic-panel"><div className="panel-heading"><span>REQUEST APPOINTMENT</span></div><form className="two-column" onSubmit={book}><select className="form-input" value={appointment.department} onChange={(event) => setAppointment({ ...appointment, department: event.target.value })} required><option value="">Select department</option>{departments.map((department) => <option value={department._id} key={department._id}>{department.name}</option>)}</select><input className="form-input" type="datetime-local" value={appointment.appointmentAt} onChange={(event) => setAppointment({ ...appointment, appointmentAt: event.target.value })} required /><button className="btn btn-primary">REQUEST SLOT</button></form></section>}
    {tab === 'notifications' && <section className="card clinic-panel"><div className="notice-item"><Bell size={17} color="var(--cyan)" /><div><strong>Notifications are live</strong><p className="text-secondary">{notice}. Queue calls and appointment changes will appear here.</p></div></div></section>}
  </div></Layout>
}
