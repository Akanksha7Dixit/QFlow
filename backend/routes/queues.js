const router = require('express').Router()
const Queue = require('../models/Queue')
const Ticket = require('../models/Ticket')
const { protect, adminOnly } = require('../middleware/auth')

// GET all queues for logged-in admin
router.get('/', protect, async (req, res) => {
  try {
    const queues = await Queue.find({ owner: req.user._id }).lean()
    const enriched = await Promise.all(
      queues.map(async (q) => {
        const waitingCount = await Ticket.countDocuments({ queue: q._id, status: 'waiting' })
        const servingCount = await Ticket.countDocuments({ queue: q._id, status: 'serving' })
        return { ...q, waitingCount, servingCount }
      })
    )
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single queue (public — for customer kiosk view)
router.get('/:id/public', async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.id).lean()
    if (!queue) return res.status(404).json({ message: 'Queue not found' })

    const waitingCount = await Ticket.countDocuments({ queue: queue._id, status: 'waiting' })
    const serving = await Ticket.findOne({ queue: queue._id, status: 'serving' }).lean()

    res.json({ ...queue, waitingCount, currentlyServing: serving?.ticketNumber || null })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})
// POST create queue
router.post('/', protect, async (req, res) => {
  try {
    const queue = await Queue.create({ ...req.body, owner: req.user._id })
    res.status(201).json(queue)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})
// PUT update queue
router.put('/:id', protect, async (req, res) => {
  try {
    const queue = await Queue.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!queue) return res.status(404).json({ message: 'Queue not found' })
    req.io.to(`queue:${queue._id}`).emit('queue-updated', queue)
    res.json(queue)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE queue
router.delete('/:id', protect, async (req, res) => {
  try {
    const queue = await Queue.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
    if (!queue) return res.status(404).json({ message: 'Queue not found' })
    await Ticket.deleteMany({ queue: req.params.id })
    res.json({ message: 'Queue deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST toggle queue open/closed
router.post('/:id/toggle', protect, async (req, res) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, owner: req.user._id })
    if (!queue) return res.status(404).json({ message: 'Queue not found' })
    queue.isOpen = !queue.isOpen
    await queue.save()
    req.io.to(`queue:${queue._id}`).emit('queue-toggled', { isOpen: queue.isOpen })
    res.json(queue)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST reset daily counter
router.post('/:id/reset', protect, async (req, res) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, owner: req.user._id })
    if (!queue) return res.status(404).json({ message: 'Queue not found' })
    queue.ticketCounter = 0
    queue.totalServedToday = 0
    queue.currentServing = 0
    await queue.save()
    await Ticket.updateMany(
      { queue: queue._id, status: { $in: ['waiting', 'serving'] } },
      { status: 'cancelled' }
    )
    req.io.to(`queue:${queue._id}`).emit('queue-reset', queue)
    res.json({ message: 'Queue reset successfully', queue })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
