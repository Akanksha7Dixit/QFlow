import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { BarChart3, ClipboardCheck, FileText, Link2, Plus, ShieldCheck } from 'lucide-react'

const tabs = [
  ['departments', 'DEPARTMENTS', ClipboardCheck],
  ['assignments', 'ASSIGNMENTS', Link2],
  ['analytics', 'ANALYTICS', BarChart3],
  ['reports', 'REPORTS', FileText],
  ['audit', 'AUDIT LOG', ShieldCheck],
]

export default function AdminOperations() {
  const [tab, setTab] = useState('departments')
  const [departments, setDepartments] = useState([])
  const [queues, setQueues] = useState([])
  const [doctors, setDoctors] = useState([])
  const [visits, setVisits] = useState([])
  const [stats, setStats] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '' })

  const load = async () => {
    try {
      const [d, q, u, v, s] = await Promise.all([
        axios.get('/clinic/departments'), axios.get('/queues'), axios.get('/users/doctors'), axios.get('/clinic/visits'), axios.get('/stats/dashboard'),
      ])
      setDepartments(d.data); setQueues(q.data); setDoctors(u.data); setVisits(v.data); setStats(s.data)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load operations data') }
  }
  useEffect(() => { load() }, [])

  const createDepartment = async (event) => {
    event.preventDefault()
    try { await axios.post('/clinic/departments', form); setForm({ name: '', code: '', description: '' }); toast.success('Department created'); load() } catch (error) { toast.error(error.response?.data?.message || 'Unable to create department') }
  }
  const assignDoctor = async (queue, doctorId) => {
    const ids = (queue.doctors || []).map((doctor) => doctor._id || doctor)
    const next = ids.includes(doctorId) ? ids.filter((id) => id !== doctorId) : [...ids, doctorId]
    try { await axios.put(`/queues/${queue._id}`, { doctors: next }); toast.success('Assignment updated'); load() } catch (error) { toast.error(error.response?.data?.message || 'Assignment failed') }
  }

  return <Layout><div style={{ padding: '32px', maxWidth: '1400px' }}>
    <div className="clinic-page-header"><div><div className="mono text-muted">ADMINISTRATION / CLINIC CONTROL</div><h1>Operations <span className="text-cyan">Hub</span></h1><p className="text-secondary">Departments, staffing, throughput, and security evidence in one place.</p></div><div className="badge badge-open">SYSTEM OPERATIONAL</div></div>
    <div className="ops-tabs">{tabs.map(([key, label, Icon]) => <button className={`ops-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)} key={key}><Icon size={15} /> {label}</button>)}</div>
    {tab === 'departments' && <section className="card clinic-panel"><div className="panel-heading"><span>DEPARTMENT DIRECTORY</span><span className="mono text-muted">{departments.length} ACTIVE</span></div><form className="inline-form" onSubmit={createDepartment}><input className="form-input" placeholder="Department name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><input className="form-input" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /><input className="form-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><button className="btn btn-primary"><Plus size={15} /> ADD</button></form>{departments.map((department) => <div className="ops-row" key={department._id}><strong>{department.name}</strong><span className="badge badge-serving">{department.code}</span><span className="text-secondary">{department.description || 'No routing description'}</span></div>)}</section>}
    {tab === 'assignments' && <section className="card clinic-panel"><div className="panel-heading"><span>QUEUE / DOCTOR MATRIX</span><span className="mono text-muted">SELECT TO TOGGLE</span></div>{queues.map((queue) => <div className="assignment-row" key={queue._id}><div><strong>{queue.name}</strong><small>{queue.category} · {queue.waitingCount || 0} waiting</small></div><div className="doctor-pills">{doctors.map((doctor) => { const assigned = (queue.doctors || []).some((item) => (item._id || item) === doctor._id); return <button className={`doctor-pill ${assigned ? 'assigned' : ''}`} key={doctor._id} onClick={() => assignDoctor(queue, doctor._id)}>{assigned ? '✓ ' : ''}{doctor.name}</button> })}</div></div>)}</section>}
    {(tab === 'analytics' || tab === 'reports') && <section className="clinic-stat-grid"><div className="card report-card"><span className="mono text-muted">WAITING NOW</span><strong>{stats?.totalWaiting || 0}</strong><p className="text-secondary">Live demand across assigned queues</p></div><div className="card report-card"><span className="mono text-muted">COMPLETED TODAY</span><strong>{stats?.completedToday || 0}</strong><p className="text-secondary">Visits closed by staff</p></div><div className="card report-card"><span className="mono text-muted">SERVICE RATE</span><strong>{stats?.completedToday && stats?.totalWaiting ? Math.round((stats.completedToday / (stats.completedToday + stats.totalWaiting)) * 100) : 0}%</strong><p className="text-secondary">Completed versus current demand</p></div><div className="card report-card"><span className="mono text-muted">VISIT RECORDS</span><strong>{visits.length}</strong><p className="text-secondary">Clinical records available for reporting</p></div></section>}
    {tab === 'audit' && <section className="card clinic-panel"><div className="panel-heading"><span>SECURITY / AUDIT TRAIL</span><span className="mono text-muted">{visits.length} VISIT RECORDS</span></div>{visits.slice(0, 20).map((visit) => <div className="ops-row" key={visit._id}><ShieldCheck size={15} color="var(--green)" /><strong>{visit.patient?.name || 'Patient'}</strong><span className="text-secondary">{visit.audit?.at(-1)?.action || 'visit-created'}</span><span className="mono text-muted">{new Date(visit.updatedAt).toLocaleString()}</span></div>)}</section>}
  </div></Layout>
}
