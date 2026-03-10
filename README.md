# QueueFlow — Digital Queue Management System

A full-stack MERN application for managing digital queues with real-time updates.

**Design Theme:** Neon-Noir Cyberpunk Terminal — dark backgrounds, electric cyan & amber accents, Orbitron/IBM Plex Mono typography, scanline overlays, and grid texture backgrounds.

---

## 🏗 Architecture

```
queueflow/
├── backend/                  # Node.js + Express + MongoDB + Socket.io
│   ├── models/
│   │   ├── User.js           # Auth model (bcrypt passwords)
│   │   ├── Queue.js          # Queue configuration
│   │   └── Ticket.js         # Individual ticket tracking
│   ├── routes/
│   │   ├── auth.js           # Register / Login / Me
│   │   ├── queues.js         # CRUD + toggle + reset
│   │   ├── tickets.js        # Join, call-next, status updates, track
│   │   └── stats.js          # Dashboard stats + hourly breakdown
│   ├── middleware/
│   │   └── auth.js           # JWT protect, adminOnly, agentOrAdmin
│   └── server.js             # Express + Socket.io bootstrap
│
└── frontend/                 # React 18 + React Router 6
    └── src/
        ├── context/
        │   ├── AuthContext.js    # JWT auth state + axios defaults
        │   └── SocketContext.js  # Socket.io client wrapper
        ├── components/
        │   ├── Layout.js         # Sidebar + nav + live clock
        │   ├── StatCard.js       # Animated metric card
        │   ├── QueueCard.js      # Queue overview card
        │   └── CreateQueueModal.js
        └── pages/
            ├── Login.js          # Boot animation + auth form
            ├── Dashboard.js      # Command center overview
            ├── QueueDetail.js    # Full queue management panel
            ├── Kiosk.js          # Public ticket issuance screen
            └── Display.js        # TV/monitor display board
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET

npm install
npm run dev
# Server starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# App starts on http://localhost:3000
```

---

## 🔑 Environment Variables

**Backend `.env`:**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/queueflow
JWT_SECRET=your_super_secret_key_here
NODE_ENV=development
```

**Frontend (optional `.env`):**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 🌐 Pages & Routes

| Route | Description | Auth |
|-------|-------------|------|
| `/login` | Authentication | Public |
| `/` | Dashboard — overview of all queues | Admin |
| `/queue/:id` | Queue management panel | Admin |
| `/kiosk/:queueId` | Customer ticket kiosk | Public |
| `/display/:queueId` | TV display board | Public |

---

## ⚡ Features

### Real-Time (Socket.io)
- Live ticket updates across all connected clients
- Instant "Now Serving" display on the board
- Queue open/close broadcasts
- New ticket notifications

### Queue Management
- Create multiple queues with custom prefix, color, category
- Open / Close queues
- Reset daily counters
- Call next ticket (priority-first FIFO)
- Per-ticket status: Waiting → Serving → Completed / No-Show / Cancelled

### Ticket Lifecycle
- Customer joins via kiosk (public)
- Admin issues tickets manually
- Priority tickets jump the queue
- Count-up estimated wait times
- Full audit trail with timestamps

### Analytics
- Live stat cards (waiting, serving, completed, cancelled)
- Hourly throughput bar chart (Recharts)
- Per-queue today's totals

### UI/UX
- Cyberpunk terminal aesthetic with scanlines + grid overlay
- Smooth animations (fadeInUp, tickerIn, flicker)
- Orbitron display font + IBM Plex Mono
- Magnetic glow effects on interactive elements
- Responsive sidebar layout

---

## 🎨 Design System

```css
--bg-void: #020408      /* Deepest background */
--bg-deep: #050d14      /* Sidebar background */
--bg-card: #0d1d35      /* Card surfaces */
--cyan: #00f5ff         /* Primary accent + glow */
--amber: #ffb800        /* Warning / waiting state */
--red: #ff3366          /* Danger / closed / cancel */
--green: #00ff88        /* Success / completed / open */

Fonts:
  Display:  Orbitron (headings, numbers, ticket IDs)
  Mono:     IBM Plex Mono (labels, timestamps, code)
  UI:       Rajdhani (body text, descriptions)
```

---

## 📡 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/queues                     # All queues (admin)
POST   /api/queues                     # Create queue
GET    /api/queues/:id/public          # Public queue info
PUT    /api/queues/:id                 # Update queue
DELETE /api/queues/:id                 # Delete queue
POST   /api/queues/:id/toggle          # Open/close
POST   /api/queues/:id/reset           # Reset daily

GET    /api/tickets/queue/:queueId     # Get tickets
POST   /api/tickets/join/:queueId      # Join queue (public)
POST   /api/tickets/queue/:id/call-next# Call next ticket
PUT    /api/tickets/:id/status         # Update status
GET    /api/tickets/track/:num/:queueId# Track ticket (public)

GET    /api/stats/dashboard            # Dashboard stats
```
