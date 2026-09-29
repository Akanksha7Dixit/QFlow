const router = require('express').Router()

const Queue = require('../models/Queue')
const Ticket = require('../models/Ticket')

const {
  protect,
  doctorOrAdmin,
} = require('../middleware/auth')

router.get(
  '/dashboard',
  protect,
  doctorOrAdmin,
  async (req, res) => {
    try {
      let queueFilter

      if (req.user.role === 'admin') {
        queueFilter = {
          owner: req.user._id,
        }
      } else {
        queueFilter = {
          doctors: req.user._id,
        }
      }

      const queues =
        await Queue.find(
          queueFilter
        ).select('_id')

      const queueIds =
        queues.map(
          (queue) => queue._id
        )

      const today =
        new Date()

      today.setHours(
        0,
        0,
        0,
        0
      )

      const [
        totalWaiting,
        totalServing,
        completedToday,
        cancelledToday,
      ] = await Promise.all([
        Ticket.countDocuments({
          queue: {
            $in: queueIds,
          },

          status: 'waiting',
        }),

        Ticket.countDocuments({
          queue: {
            $in: queueIds,
          },

          status: 'serving',
        }),

        Ticket.countDocuments({
          queue: {
            $in: queueIds,
          },

          status: 'completed',

          completedAt: {
            $gte: today,
          },
        }),

        Ticket.countDocuments({
          queue: {
            $in: queueIds,
          },

          status: {
            $in: [
              'cancelled',
              'no-show',
            ],
          },

          updatedAt: {
            $gte: today,
          },
        }),
      ])

      const hourlyData =
        await Ticket.aggregate([
          {
            $match: {
              queue: {
                $in: queueIds,
              },

              status:
                'completed',

              completedAt: {
                $gte: today,
              },
            },
          },

          {
            $group: {
              _id: {
                $hour:
                  '$completedAt',
              },

              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ])

      res.json({
        totalWaiting,
        totalServing,
        completedToday,
        cancelledToday,
        totalQueues:
          queueIds.length,
        hourlyData,
      })
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

module.exports = router