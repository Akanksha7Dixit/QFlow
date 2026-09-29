const router = require('express').Router()

const Queue = require('../models/Queue')
const Ticket = require('../models/Ticket')

const {
  protect,
  adminOnly,
  doctorOrAdmin,
} = require('../middleware/auth')

/*
 * GET /api/queues
 *
 * Admin:
 *     queues owned by admin
 *
 * Doctor:
 *     queues where doctor is assigned
 */
router.get(
  '/',
  protect,
  doctorOrAdmin,
  async (req, res) => {
    try {
      let filter

      if (req.user.role === 'admin') {
        filter = {
          owner: req.user._id,
        }
      } else {
        filter = {
          doctors: req.user._id,
        }
      }

      const queues = await Queue.find(filter)
        .populate(
          'doctors',
          'name email role avatar'
        )
        .lean()

      const enriched = await Promise.all(
        queues.map(async (queue) => {
          const [
            waitingCount,
            servingCount,
          ] = await Promise.all([
            Ticket.countDocuments({
              queue: queue._id,
              status: 'waiting',
            }),

            Ticket.countDocuments({
              queue: queue._id,
              status: 'serving',
            }),
          ])

          return {
            ...queue,
            waitingCount,
            servingCount,
          }
        })
      )

      res.json(enriched)
    } catch (err) {
      console.error('[QUEUES GET]', err)

      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * GET /api/queues/:id/public
 *
 * Public endpoint used by kiosk/display.
 */
router.get(
  '/:id/public',
  async (req, res) => {
    try {
      const queue =
        await Queue.findById(
          req.params.id
        ).lean()

      if (!queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      const [
        waitingCount,
        serving,
      ] = await Promise.all([
        Ticket.countDocuments({
          queue: queue._id,
          status: 'waiting',
        }),

        Ticket.findOne({
          queue: queue._id,
          status: 'serving',
        }).lean(),
      ])

      res.json({
        ...queue,

        waitingCount,

        currentlyServing:
          serving?.ticketNumber || null,
      })
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/queues
 *
 * Only admins create queues.
 */
router.post(
  '/',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const queue = await Queue.create({
        ...req.body,
        owner: req.user._id,
        doctors: [],
      })

      res.status(201).json(queue)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * PUT /api/queues/:id
 *
 * Only the owning admin can update queue configuration.
 */
router.put(
  '/:id',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const queue =
        await Queue.findOneAndUpdate(
          {
            _id: req.params.id,
            owner: req.user._id,
          },

          req.body,

          {
            new: true,
            runValidators: true,
          }
        )

      if (!queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      req.io
        .to(`queue:${queue._id}`)
        .emit(
          'queue-updated',
          queue
        )

      res.json(queue)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * DELETE /api/queues/:id
 */
router.delete(
  '/:id',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const queue =
        await Queue.findOneAndDelete({
          _id: req.params.id,
          owner: req.user._id,
        })

      if (!queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      await Ticket.deleteMany({
        queue: req.params.id,
      })

      res.json({
        message: 'Queue deleted',
      })
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/queues/:id/toggle
 */
router.post(
  '/:id/toggle',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const queue =
        await Queue.findOne({
          _id: req.params.id,
          owner: req.user._id,
        })

      if (!queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      queue.isOpen = !queue.isOpen

      await queue.save()

      req.io
        .to(`queue:${queue._id}`)
        .emit(
          'queue-toggled',
          {
            isOpen: queue.isOpen,
          }
        )

      res.json(queue)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/queues/:id/reset
 */
router.post(
  '/:id/reset',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const queue =
        await Queue.findOne({
          _id: req.params.id,
          owner: req.user._id,
        })

      if (!queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      queue.ticketCounter = 0
      queue.totalServedToday = 0
      queue.currentServing = 0

      await queue.save()

      await Ticket.updateMany(
        {
          queue: queue._id,

          status: {
            $in: [
              'waiting',
              'serving',
            ],
          },
        },

        {
          status: 'cancelled',
        }
      )

      req.io
        .to(`queue:${queue._id}`)
        .emit(
          'queue-reset',
          queue
        )

      res.json({
        message:
          'Queue reset successfully',

        queue,
      })
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

module.exports = router