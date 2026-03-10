const router = require('express').Router()
const Queue = require('../models/Queue')
const Ticket = require('../models/Ticket')
const { protect } = require('../middleware/auth')

// GET dashboard stats
router.get('/dashboard', protect, async (req, res) => {
  try {
    const queues = await Queue.find({ owner: req.user._id }).select('_id')
    const queueIds = queues.map((q) => q._id)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalWaiting, totalServing, completedToday, cancelledToday] = await Promise.all([
      Ticket.countDocuments({ queue: { $in: queueIds }, status: 'waiting' }),
      Ticket.countDocuments({ queue: { $in: queueIds }, status: 'serving' }),
      Ticket.countDocuments({ queue: { $in: queueIds }, status: 'completed', completedAt: { $gte: today } }),
      Ticket.countDocuments({ queue: { $in: queueIds }, status: { $in: ['cancelled', 'no-show'] }, updatedAt: { $gte: today } }),
    ])

    // Hourly breakdown for today
    const hourlyData = await Ticket.aggregate([
      {
        $match: {
          queue: { $in: queueIds },
          status: 'completed',
          completedAt: { $gte: today },
        },
      },
      {
        $group: {
          _id: { $hour: '$completedAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    res.json({
      totalWaiting,
      totalServing,
      completedToday,
      cancelledToday,
      totalQueues: queueIds.length,
      hourlyData,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
