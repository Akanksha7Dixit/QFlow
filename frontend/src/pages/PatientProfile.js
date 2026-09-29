import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { Save, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const initialForm = { name: '', phone: '', dateOfBirth: '', medicalNotes: '' }

function validateProfile(form) {
  const name = form.name.trim()
  if (name.length < 2 || name.length > 100) return 'Name must be between 2 and 100 characters'
  if (form.phone && !/^[+\d][\d\s().-]{6,19}$/.test(form.phone)) return 'Enter a valid phone number'
  if (form.dateOfBirth) {
    const date = new Date(`${form.dateOfBirth}T00:00:00`)
    if (Number.isNaN(date.getTime()) || date > new Date()) return 'Date of birth cannot be in the future'
  }
  if (form.medicalNotes.length > 2000) return 'Medical notes must be 2,000 characters or fewer'
  return ''
}

export default function PatientProfile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
      medicalNotes: user?.medicalNotes || '',
    })
  }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationMessage = validateProfile(form)
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    setSaving(true)
    try {
      const response = await axios.patch('/users/me/profile', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        medicalNotes: form.medicalNotes.trim(),
      })
      updateUser(response.data)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update profile')
    } finally {
      setSaving(false)
    }
  }

  return <Layout><div style={{ padding: '32px', maxWidth: '900px' }}>
    <div className="clinic-page-header"><div><div className="mono text-muted">PATIENT PORTAL / ACCOUNT</div><h1>My <span className="text-cyan">Profile</span></h1><p className="text-secondary">Keep your contact and clinical intake information current.</p></div><div className="badge badge-serving"><UserRound size={13} /> PATIENT RECORD</div></div>
    <form className="card clinic-panel profile-form" onSubmit={handleSubmit}><div className="panel-heading"><span>PROFILE INFORMATION</span><span className="mono text-muted">SELF-SERVICE FIELDS</span></div><div className="profile-readonly"><div><span className="form-label">EMAIL</span><strong>{user?.email || '—'}</strong></div><div><span className="form-label">ROLE</span><strong>{user?.role?.toUpperCase() || 'PATIENT'}</strong></div></div><label className="form-group"><span className="form-label">FULL NAME</span><input className="form-input" value={form.name} maxLength="100" onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><div className="two-column"><label className="form-group"><span className="form-label">PHONE</span><input className="form-input" type="tel" value={form.phone} maxLength="20" onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 555 010 1234" /></label><label className="form-group"><span className="form-label">DATE OF BIRTH</span><input className="form-input" type="date" value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></label></div><label className="form-group"><span className="form-label">MEDICAL NOTES FOR INTAKE</span><textarea className="form-input" rows="6" maxLength="2000" value={form.medicalNotes} onChange={(event) => setForm({ ...form, medicalNotes: event.target.value })} placeholder="Allergies, medications, or relevant history" /><span className="mono text-muted profile-counter">{form.medicalNotes.length}/2000</span></label><button className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'SAVING...' : 'SAVE PROFILE'}</button></form>
  </div></Layout>
}
