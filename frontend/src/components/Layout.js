import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity, CalendarDays, ClipboardList, LayoutDashboard, LogOut, Settings2, Stethoscope, UserRound, UsersRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'

const NAV_ITEMS = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/admin/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin'] },
  { path: '/admin/operations', label: 'Operations', icon: Settings2, roles: ['admin'] },
  { path: '/doctor', label: 'My queues', icon: ClipboardList, roles: ['doctor'] },
  { path: '/doctor/consultation', label: 'Consultations', icon: Stethoscope, roles: ['doctor'] },
  { path: '/patient', label: 'Today', icon: LayoutDashboard, roles: ['patient'] },
  { path: '/patient/care', label: 'Care timeline', icon: Activity, roles: ['patient'] },
  { path: '/patient/profile', label: 'Profile', icon: UserRound, roles: ['patient'] },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const location = useLocation()
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role))

  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link to="/" className="brand-lockup"><span className="brand-mark"><Activity size={17} /></span><span><strong>Queueflow</strong><small>Smart clinic operations</small></span></Link>
      <div className="connection-status"><span className={`status-indicator ${connected ? 'is-online' : ''}`} /><span>{connected ? 'Live service' : 'Reconnecting'}</span></div>
      <nav className="app-nav" aria-label="Main navigation">{visibleItems.map(({ path, label, icon: Icon }) => { const active = location.pathname === path || location.pathname.startsWith(`${path}/`); return <Link className={`app-nav-link ${active ? 'is-active' : ''}`} to={path} key={path}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link> })}</nav>
      <div className="sidebar-footer"><div className="sidebar-date"><span>{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span><small>{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</small></div><div className="account-block"><span className="avatar-initial">{user?.name?.charAt(0)?.toUpperCase() || 'Q'}</span><div><strong>{user?.name || 'Clinic user'}</strong><small>{user?.role || 'member'}</small></div><button className="icon-button" onClick={handleLogout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></div></div>
    </aside>
    <main className="app-main">{children}</main>
  </div>
}
