import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import QueueCard from '../components/QueueCard'
import CreateQueueModal from '../components/CreateQueueModal'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { user } = useAuth()
  const [queues, setQueues] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      const [qRes, sRes] = await Promise.all([
        axios.get('/queues'),
        axios.get('/stats/dashboard'),
      ])
      setQueues(qRes.data)
      setStats(sRes.data)
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000) // refresh every 15s
    return () => clearInterval(interval)
  }, [fetchData])

  const handleToggle = async (id) => {
    try {
      const res = await axios.post(`/queues/${id}/toggle`)
      setQueues(prev => prev.map(q => q._id === id ? { ...q, isOpen: res.data.isOpen } : q))
      toast.success(`Queue ${res.data.isOpen ? 'OPENED' : 'CLOSED'}`)
    } catch { toast.error('Toggle failed') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('DELETE this queue and all its tickets?')) return
    try {
      await axios.delete(`/queues/${id}`)
      setQueues(prev => prev.filter(q => q._id !== id))
      toast.success('Queue deleted')
    } catch { toast.error('Delete failed') }
  }

  const handleReset = async (id) => {
    if (!window.confirm('Reset daily counter? This cancels all active tickets.')) return
    try {
      await axios.post(`/queues/${id}/reset`)
      fetchData()
      toast.success('Queue reset')
    } catch { toast.error('Reset failed') }
  }

  const filteredQueues = queues.filter(q => {
    if (filter === 'open') return q.isOpen
    if (filter === 'closed') return !q.isOpen
    return true
  })

  // Build hourly chart data
  const chartData = Array.from({ length: 24 }, (_, h) => {
    const found = stats?.hourlyData?.find(d => d._id === h)
    return { hour: `${String(h).padStart(2,'0')}:00`, served: found?.count || 0 }
  }).filter(d => {
    const h = parseInt(d.hour)
    return h >= 6 && h <= 22
  })

  if (loading) return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="spinner" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div style={{ padding: '32px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'32px' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              letterSpacing: '0.2em',
              marginBottom: '6px',
            }}>
              COMMAND CENTER / OVERVIEW
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 900,
              color: 'var(--text-primary)',
              letterSpacing: '0.1em',
            }}>
              QUEUE <span style={{ color: 'var(--cyan)', textShadow: 'var(--glow-sm)' }}>CONTROL</span>
            </h1>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '6px',
            }}>
              {queues.length} QUEUES DEPLOYED · OPERATOR: {user?.name?.toUpperCase()}
            </p>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowCreate(true)}
          >
            <span>⊕</span> NEW QUEUE
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <StatCard label="TOTAL QUEUES" value={stats?.totalQueues ?? queues.length} icon="◈" color="cyan" />
          <StatCard label="WAITING NOW" value={stats?.totalWaiting ?? 0} icon="⏱" color="amber" pulse={stats?.totalWaiting > 0} />
          <StatCard label="BEING SERVED" value={stats?.totalServing ?? 0} icon="⚡" color="cyan" pulse={stats?.totalServing > 0} />
          <StatCard label="COMPLETED TODAY" value={stats?.completedToday ?? 0} icon="✓" color="green" />
          <StatCard label="CANCELLED" value={stats?.cancelledToday ?? 0} icon="⊗" color="red" />
        </div>

        {/* Chart */}
        {chartData.some(d => d.served > 0) && (
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <div className="corner-brackets" />
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              color: 'var(--cyan)',
              marginBottom: '20px',
            }}>
              TODAY'S THROUGHPUT — HOURLY BREAKDOWN
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Bar dataKey="served" fill="var(--cyan)" opacity={0.8} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Queue filter */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          <div style={{ display:'flex', gap:'6px' }}>
            {['all','open','closed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              >
                {f.toUpperCase()} {f === 'all' ? `(${queues.length})` : f === 'open' ? `(${queues.filter(q=>q.isOpen).length})` : `(${queues.filter(q=>!q.isOpen).length})`}
              </button>
            ))}
          </div>

          <button onClick={fetchData} className="btn btn-ghost btn-sm">
            ↺ REFRESH
          </button>
        </div>

        {/* Queue grid */}
        {filteredQueues.length === 0 ? (
          <div className="card" style={{
            padding: '60px',
            textAlign: 'center',
            borderStyle: 'dashed',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              opacity: 0.3,
            }}>◈</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}>
              NO QUEUES DEPLOYED
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              ⊕ CREATE FIRST QUEUE
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}>
            {filteredQueues.map(q => (
              <div key={q._id} className="animate-fadeInUp">
                <QueueCard
                  queue={q}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onReset={handleReset}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateQueueModal
          onClose={() => setShowCreate(false)}
          onCreated={newQ => {
            setQueues(prev => [...prev, { ...newQ, waitingCount: 0, servingCount: 0 }])
          }}
        />
      )}
    </Layout>
  )
}
