import React, { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Stethoscope,
  UserCheck,
  UserX,
  Pencil,
  X
} from 'lucide-react'

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'

function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  })

  const fetchDoctors = async () => {
    try {
      setLoading(true)

      const token = localStorage.getItem('qf_token')

      const res = await axios.get(`${API}/users/doctors`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      setDoctors(res.data)
    } catch (error) {
      console.error(error)
      toast.error(
        error.response?.data?.message || 'Failed to load doctors'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  const openCreateModal = () => {
    setEditingDoctor(null)

    setForm({
      name: '',
      email: '',
      password: ''
    })

    setShowModal(true)
  }

  const openEditModal = (doctor) => {
    setEditingDoctor(doctor)

    setForm({
      name: doctor.name || '',
      email: doctor.email || '',
      password: ''
    })

    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return

    setShowModal(false)
    setEditingDoctor(null)

    setForm({
      name: '',
      email: '',
      password: ''
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setForm((previous) => ({
      ...previous,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('Doctor name is required')
      return
    }

    if (!form.email.trim()) {
      toast.error('Doctor email is required')
      return
    }

    if (!editingDoctor && form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (editingDoctor && form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      setSaving(true)

      const token = localStorage.getItem('qf_token')

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }

      if (editingDoctor) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim()
        }

        if (form.password.trim()) {
          payload.password = form.password
        }

        await axios.put(
          `${API}/users/doctors/${editingDoctor._id}`,
          payload,
          config
        )

        toast.success('Doctor updated successfully')
      } else {
        await axios.post(
          `${API}/users/doctors`,
          {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password
          },
          config
        )

        toast.success('Doctor created successfully')
      }

      closeModal()
      fetchDoctors()
    } catch (error) {
      console.error(error)

      toast.error(
        error.response?.data?.message ||
          `Failed to ${editingDoctor ? 'update' : 'create'} doctor`
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleDoctorStatus = async (doctor) => {
    const action = doctor.isActive ? 'deactivate' : 'activate'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${doctor.name}?`
    )

    if (!confirmed) return

    try {
      const token = localStorage.getItem('qf_token')

      await axios.patch(
        `${API}/users/doctors/${doctor._id}/status`,
        {
          isActive: !doctor.isActive
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      toast.success(
        doctor.isActive
          ? 'Doctor deactivated'
          : 'Doctor activated'
      )

      fetchDoctors()
    } catch (error) {
      console.error(error)

      toast.error(
        error.response?.data?.message ||
          'Failed to update doctor status'
      )
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary, #05070a)',
        color: 'var(--text-primary, #fff)',
        padding: '32px'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <Link
              to="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--cyan, #00f5ff)',
                textDecoration: 'none',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,245,255,0.08)',
                  border: '1px solid rgba(0,245,255,0.25)'
                }}
              >
                <Stethoscope
                  size={24}
                  color="var(--cyan, #00f5ff)"
                />
              </div>

              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '28px',
                    fontWeight: 700
                  }}
                >
                  Doctors
                </h1>

                <p
                  style={{
                    margin: '5px 0 0',
                    color: 'var(--text-secondary, #8b95a7)',
                    fontSize: '14px'
                  }}
                >
                  Manage clinic doctors and their access
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              background: 'var(--cyan, #00f5ff)',
              color: '#001014',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            Add Doctor
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div
              style={{
                color: '#8b95a7',
                fontSize: '13px',
                marginBottom: '8px'
              }}
            >
              Total Doctors
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700
              }}
            >
              {doctors.length}
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div
              style={{
                color: '#8b95a7',
                fontSize: '13px',
                marginBottom: '8px'
              }}
            >
              Active Doctors
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700
              }}
            >
              {doctors.filter((doctor) => doctor.isActive).length}
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div
              style={{
                color: '#8b95a7',
                fontSize: '13px',
                marginBottom: '8px'
              }}
            >
              Inactive Doctors
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700
              }}
            >
              {doctors.filter((doctor) => !doctor.isActive).length}
            </div>
          </div>
        </div>

        {/* Doctor list */}
        <div
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '60px',
                textAlign: 'center',
                color: '#8b95a7'
              }}
            >
              Loading doctors...
            </div>
          ) : doctors.length === 0 ? (
            <div
              style={{
                padding: '70px 30px',
                textAlign: 'center'
              }}
            >
              <Stethoscope
                size={42}
                style={{ opacity: 0.4, marginBottom: '14px' }}
              />

              <h3 style={{ margin: '0 0 8px' }}>
                No doctors yet
              </h3>

              <p
                style={{
                  margin: '0 0 20px',
                  color: '#8b95a7'
                }}
              >
                Create your first doctor account.
              </p>

              <button
                onClick={openCreateModal}
                style={{
                  border: 'none',
                  borderRadius: '9px',
                  padding: '10px 16px',
                  background: 'var(--cyan, #00f5ff)',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                Add Doctor
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: '700px'
                }}
              >
                <thead>
                  <tr>
                    <th style={headerStyle}>Doctor</th>
                    <th style={headerStyle}>Email</th>
                    <th style={headerStyle}>Status</th>
                    <th style={headerStyle}>Created</th>
                    <th style={{ ...headerStyle, textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor._id}>
                      <td style={cellStyle}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0,245,255,0.1)',
                              color: 'var(--cyan, #00f5ff)',
                              fontWeight: 700
                            }}
                          >
                            {doctor.name?.charAt(0)?.toUpperCase() ||
                              'D'}
                          </div>

                          <strong>{doctor.name}</strong>
                        </div>
                      </td>

                      <td style={cellStyle}>
                        {doctor.email}
                      </td>

                      <td style={cellStyle}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 9px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            background: doctor.isActive
                              ? 'rgba(34,197,94,0.1)'
                              : 'rgba(239,68,68,0.1)',
                            color: doctor.isActive
                              ? '#4ade80'
                              : '#f87171'
                          }}
                        >
                          {doctor.isActive ? (
                            <UserCheck size={13} />
                          ) : (
                            <UserX size={13} />
                          )}

                          {doctor.isActive
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </td>

                      <td style={cellStyle}>
                        {doctor.createdAt
                          ? new Date(
                              doctor.createdAt
                            ).toLocaleDateString()
                          : '—'}
                      </td>

                      <td
                        style={{
                          ...cellStyle,
                          textAlign: 'right'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px'
                          }}
                        >
                          <button
                            onClick={() =>
                              openEditModal(doctor)
                            }
                            title="Edit doctor"
                            style={actionButtonStyle}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            onClick={() =>
                              toggleDoctorStatus(doctor)
                            }
                            title={
                              doctor.isActive
                                ? 'Deactivate doctor'
                                : 'Activate doctor'
                            }
                            style={{
                              ...actionButtonStyle,
                              color: doctor.isActive
                                ? '#f87171'
                                : '#4ade80'
                            }}
                          >
                            {doctor.isActive ? (
                              <UserX size={15} />
                            ) : (
                              <UserCheck size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal()
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(0,0,0,0.7)'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '16px',
              padding: '26px',
              background: '#0b1017',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '21px'
                  }}
                >
                  {editingDoctor
                    ? 'Edit Doctor'
                    : 'Create Doctor'}
                </h2>

                <p
                  style={{
                    margin: '6px 0 0',
                    color: '#8b95a7',
                    fontSize: '13px'
                  }}
                >
                  {editingDoctor
                    ? 'Update doctor account details'
                    : 'Create a new doctor account'}
                </p>
              </div>

              <button
                onClick={closeModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#8b95a7',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>
                Doctor Name
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Dr. John Doe"
                style={inputStyle}
              />

              <label style={labelStyle}>
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="doctor@clinic.com"
                style={inputStyle}
              />

              <label style={labelStyle}>
                {editingDoctor
                  ? 'New Password (optional)'
                  : 'Password'}
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={
                  editingDoctor
                    ? 'Leave blank to keep current password'
                    : 'Minimum 6 characters'
                }
                style={inputStyle}
              />

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '13px',
                  marginTop: '10px',
                  background: 'var(--cyan, #00f5ff)',
                  color: '#001014',
                  fontWeight: 700,
                  cursor: saving
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving
                  ? 'Saving...'
                  : editingDoctor
                    ? 'Update Doctor'
                    : 'Create Doctor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const headerStyle = {
  padding: '15px 18px',
  textAlign: 'left',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#6f7a8d',
  borderBottom: '1px solid rgba(255,255,255,0.07)'
}

const cellStyle = {
  padding: '17px 18px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: '13px',
  color: '#c7cfdb'
}

const actionButtonStyle = {
  width: '34px',
  height: '34px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#00f5ff',
  cursor: 'pointer'
}

const labelStyle = {
  display: 'block',
  marginBottom: '7px',
  marginTop: '16px',
  color: '#aab4c3',
  fontSize: '13px'
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 13px',
  borderRadius: '9px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#060a0f',
  color: '#fff',
  outline: 'none',
  fontSize: '14px'
}

export default Doctors