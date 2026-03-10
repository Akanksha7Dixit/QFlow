console.log("Server starting...");


//for changing dnsservers to avoid dns issues in some environments
require("node:dns").setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
})

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())

// Attach io to req
app.use((req, res, next) => {
  req.io = io
  next()
})

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/queues', require('./routes/queues'))
app.use('/api/tickets', require('./routes/tickets'))
app.use('/api/stats', require('./routes/stats'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', timestamp: new Date(), version: '1.0.0' })
})

// Socket.io events
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`)

  socket.on('join-queue', (queueId) => {
    socket.join(`queue:${queueId}`)
    console.log(`[SOCKET] ${socket.id} joined queue:${queueId}`)
  })

  socket.on('leave-queue', (queueId) => {
    socket.leave(`queue:${queueId}`)
  })

  socket.on('join-admin', (adminId) => {
    socket.join(`admin:${adminId}`)
  })

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`)
  })
})


// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/queueflow')
  .then(() => {
    console.log('[DB] MongoDB connected successfully')
    const PORT = process.env.PORT || 5000
    server.listen(PORT, () => {
      console.log(`[SERVER] QueueFlow running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message)
    process.exit(1)
  })
