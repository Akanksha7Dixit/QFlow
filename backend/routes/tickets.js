const router = require('express').Router()
const Queue = require('../models/Queue')
const Ticket = require('../models/Ticket')
const { protect } = require('../middleware/auth')

// GET tickets for a queue
router.get('/queue/:queueId', protect, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query
    const filter = { queue: req.params.queueId }
    if (status) filter.status = status

    const tickets = await Ticket.find(filter)
      .sort({ priority: -1, position: 1 })
      .limit(parseInt(limit))
      .lean()
    res.json(tickets)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST join queue (issue new ticket — public endpoint)
router.post('/join/:queueId', async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.queueId)
    if (!queue) return res.status(404).json({ message: 'Queue not found' })
    if (!queue.isOpen) return res.status(400).json({ message: 'Queue is currently closed' })

    const waitingCount = await Ticket.countDocuments({ queue: queue._id, status: 'waiting' })
    if (waitingCount >= queue.maxCapacity) {
      return res.status(400).json({ message: 'Queue is at full capacity' })
    }

    queue.ticketCounter += 1
    await queue.save()

    const ticketNumber = `${queue.prefix}${String(queue.ticketCounter).padStart(3, '0')}`
    const estimatedWait = waitingCount * queue.avgServiceTime

    const ticket = await Ticket.create({
      ticketNumber,
      queue: queue._id,
      customer: req.body.customer || {},
      priority: req.body.priority || false,
      position: queue.ticketCounter,
      estimatedWait,
    })

    // Notify all clients in this queue room
    req.io.to(`queue:${queue._id}`).emit('ticket-joined', { ticket, waitingCount: waitingCount + 1 })

    res.status(201).json({ ticket, estimatedWait, position: waitingCount + 1 })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST call next ticket
router.post('/queue/:queueId/call-next', protect, async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.queueId)
    if (!queue) return res.status(404).json({ message: 'Queue not found' })

    // Mark any currently serving ticket as completed
    await Ticket.updateMany(
      { queue: queue._id, status: 'serving' },
      { status: 'completed', completedAt: new Date() }
    )

    // Get next waiting ticket (priority first, then position)
    const next = await Ticket.findOne({ queue: queue._id, status: 'waiting' })
      .sort({ priority: -1, position: 1 })

    if (!next) {
      return res.status(404).json({ message: 'No tickets waiting' })
    }

    next.status = 'serving'
    next.calledAt = new Date()
    next.servedBy = req.user._id
    await next.save()

    queue.currentServing = next.position
    queue.totalServedToday += 1
    await queue.save()

    req.io.to(`queue:${queue._id}`).emit('ticket-called', { ticket: next, queue })

    res.json({ ticket: next, queue })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT update ticket status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes } = req.body
    const ticket = await Ticket.findById(req.params.id).populate('queue')
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

    ticket.status = status
    if (notes) ticket.notes = notes
    if (status === 'completed') ticket.completedAt = new Date()
    if (status === 'serving') { ticket.calledAt = new Date(); ticket.servedBy = req.user._id }
    await ticket.save()

    req.io.to(`queue:${ticket.queue._id}`).emit('ticket-updated', ticket)
    res.json(ticket)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET check ticket status (public — for customer tracking)
router.get('/track/:ticketNumber/:queueId', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      queue: req.params.queueId,
    }).populate('queue', 'name prefix avgServiceTime currentServing')

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

    const ahead = await Ticket.countDocuments({
      queue: ticket.queue._id,
      status: 'waiting',
      position: { $lt: ticket.position },
    })

    res.json({ ticket, ahead, estimatedWait: ahead * ticket.queue.avgServiceTime })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
