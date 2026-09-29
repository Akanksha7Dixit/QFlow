import React from 'react'
import { ArrowUpRight, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function QueueCard({ queue, onToggle, onDelete, onReset }) {
  const waitTone = queue.waitingCount > 20 ? 'delayed' : queue.waitingCount > 10 ? 'priority' : 'calm'
  return <article className="queue-card">
    <div className="queue-card-head"><div><span className="queue-kicker">{queue.category || 'General'} queue</span><h3>{queue.name}</h3><span className="queue-meta">Prefix {queue.prefix} · {queue.avgServiceTime || 5} min average</span></div><span className={`status-label ${queue.isOpen ? 'status-open' : 'status-closed'}`}><span />{queue.isOpen ? 'Open' : 'Closed'}</span></div>
    <div className="queue-card-stats"><div><strong className={`queue-number ${waitTone}`}>{queue.waitingCount || 0}</strong><span>Waiting</span></div><div><strong>{queue.servingCount || 0}</strong><span>In consultation</span></div><div><strong>{queue.totalServedToday || 0}</strong><span>Completed today</span></div></div>
    {queue.currentServing > 0 && <div className="queue-now"><span>Now consulting</span><strong>{queue.prefix}{String(queue.currentServing).padStart(3, '0')}</strong></div>}
    <div className="queue-card-actions"><Link to={`/queue/${queue._id}`} className="btn btn-primary btn-sm"><ArrowUpRight size={15} /> Manage queue</Link><button onClick={() => onToggle(queue._id)} className={`btn btn-sm ${queue.isOpen ? 'btn-danger' : 'btn-success'}`}>{queue.isOpen ? 'Close' : 'Open'}</button><button onClick={() => onReset(queue._id)} className="icon-button" title="Reset queue" aria-label="Reset queue"><RotateCcw size={15} /></button><button onClick={() => onDelete(queue._id)} className="icon-button is-danger" title="Delete queue" aria-label="Delete queue"><Trash2 size={15} /></button></div>
    <div className="queue-card-links"><a href={`/kiosk/${queue._id}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Kiosk</a><a href={`/display/${queue._id}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Display board</a></div>
  </article>
}
