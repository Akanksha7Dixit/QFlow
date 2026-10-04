const router = require('express').Router()

const Queue = require('../models/Queue')
const Ticket = require('../models/Ticket')

const {
  protect,
  doctorOrAdmin,
} = require('../middleware/auth')

/*
 * Verify that the authenticated staff member
 * can operate a particular queue.
 */
const canOperateQueue = async (
  user,
  queueId
) => {
  const queue = await Queue.findById(queueId)

  if (!queue) {
    return {
      allowed: false,
      queue: null,
    }
  }

  if (user.role === 'admin') {
    return {
      allowed:
        queue.owner.toString() ===
        user._id.toString(),
      queue,
    }
  }

  if (user.role === 'doctor') {
    const assigned = queue.doctors?.some(
      (doctorId) =>
        doctorId.toString() ===
        user._id.toString()
    )

    return {
      allowed: Boolean(assigned),
      queue,
    }
  }

  return {
    allowed: false,
    queue,
  }
}

/*
 * GET /api/tickets/queue/:queueId
 *
 * Staff-only queue view.
 */
router.get(
  '/queue/:queueId',
  protect,
  doctorOrAdmin,
  async (req, res) => {
    try {
      const access =
        await canOperateQueue(
          req.user,
          req.params.queueId
        )

      if (!access.queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      if (!access.allowed) {
        return res.status(403).json({
          message:
            'You are not assigned to this queue',
        })
      }

      const {
        status,
        limit = 50,
      } = req.query

      const filter = {
        queue: req.params.queueId,
      }

      if (status) {
        filter.status = status
      }

      const tickets =
        await Ticket.find(filter)
          .sort({
            priority: -1,
            position: 1,
          })
          .limit(
            parseInt(limit, 10)
          )
          .lean()

      res.json(tickets)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/tickets/join/:queueId
 *
 * Public endpoint.
 */
router.post(
  '/join/:queueId',
  async (req, res) => {
    try {
      const queue =
        await Queue.findById(
          req.params.queueId
        )

      if (!queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      if (!queue.isOpen) {
        return res.status(400).json({
          message:
            'Queue is currently closed',
        })
      }

      const waitingCount =
        await Ticket.countDocuments({
          queue: queue._id,
          status: 'waiting',
        })

      if (
        waitingCount >=
        queue.maxCapacity
      ) {
        return res.status(400).json({
          message:
            'Queue is at full capacity',
        })
      }

      queue.ticketCounter += 1

      await queue.save()

      const ticketNumber =
        `${queue.prefix}${String(
          queue.ticketCounter
        ).padStart(3, '0')}`

      const estimatedWait =
        waitingCount *
        queue.avgServiceTime

      const ticket =
        await Ticket.create({
          ticketNumber,

          queue: queue._id,

          customer:
            req.body.customer || {},

          /*
           * Priority is intentionally not accepted
           * as a patient-controlled queue privilege.
           */
          priority: false,

          position:
            queue.ticketCounter,

          estimatedWait,
        })

      req.io
        .to(`queue:${queue._id}`)
        .emit(
          'ticket-joined',
          {
            ticket,
            waitingCount:
              waitingCount + 1,
          }
        )

      res.status(201).json({
        ticket,

        estimatedWait,

        position:
          waitingCount + 1,
      })
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/tickets/queue/:queueId/call-next
 *
 * Doctor or admin.
 */
router.post(
  '/queue/:queueId/call-next',
  protect,
  doctorOrAdmin,
  async (req, res) => {
    try {
      const access =
        await canOperateQueue(
          req.user,
          req.params.queueId
        )

      if (!access.queue) {
        return res.status(404).json({
          message: 'Queue not found',
        })
      }

      if (!access.allowed) {
        return res.status(403).json({
          message:
            'You are not assigned to this queue',
        })
      }

      const queue = access.queue

      /*
       * Complete currently serving ticket.
       */
      await Ticket.updateMany(
        {
          queue: queue._id,
          status: 'serving',
        },

        {
          status: 'completed',
          completedAt: new Date(),
        }
      )

      /*
       * Priority tickets first,
       * then normal queue position.
       */
      const next =
        await Ticket.findOne({
          queue: queue._id,
          status: 'waiting',
        }).sort({
          priority: -1,
          position: 1,
        })

      if (!next) {
        return res.status(404).json({
          message:
            'No tickets waiting',
        })
      }

      next.status = 'serving'
      next.calledAt = new Date()
      next.servedBy = req.user._id

      await next.save()

      queue.currentServing =
        next.position

      queue.totalServedToday += 1

      await queue.save()

      req.io
        .to(`queue:${queue._id}`)
        .emit(
          'ticket-called',
          {
            ticket: next,
            queue,
          }
        )

      res.json({
        ticket: next,
        queue,
      })
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * PUT /api/tickets/:id/status
 *
 * Doctor/admin only.
 */
router.put(
  '/:id/status',
  protect,
  doctorOrAdmin,
  async (req, res) => {
    try {
      const {
        status,
        notes,
        consultation,
      } = req.body

      const ticket =
        await Ticket.findById(
          req.params.id
        ).populate('queue')

      if (!ticket) {
        return res.status(404).json({
          message: 'Ticket not found',
        })
      }

      const access =
        await canOperateQueue(
          req.user,
          ticket.queue._id
        )

      if (!access.allowed) {
        return res.status(403).json({
          message:
            'You are not assigned to this queue',
        })
      }

      if (status) {
        ticket.status = status
      }

      if (typeof notes === 'string') {
        ticket.notes = notes
      }

      if (consultation && typeof consultation === 'object') {
        ticket.consultation = {
          notes: consultation.notes ?? ticket.consultation.notes,
          diagnosis: consultation.diagnosis ?? ticket.consultation.diagnosis,
          confirmedAt: new Date(),
        }
      }

      if (
        status === 'completed'
      ) {
        ticket.completedAt =
          new Date()
      }

      if (
        status === 'serving'
      ) {
        ticket.calledAt =
          new Date()

        ticket.servedBy =
          req.user._id
      }

      await ticket.save()

      req.io
        .to(
          `queue:${ticket.queue._id}`
        )
        .emit(
          'ticket-updated',
          ticket
        )

      res.json(ticket)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * GET /api/tickets/track/:ticketNumber/:queueId
 *
 * Public patient ticket tracking.
 */
router.get(
  '/track/:ticketNumber/:queueId',
  async (req, res) => {
    try {
      const ticket =
        await Ticket.findOne({
          ticketNumber:
            req.params.ticketNumber,

          queue:
            req.params.queueId,
        }).populate(
          'queue',
          'name prefix avgServiceTime currentServing'
        )

      if (!ticket) {
        return res.status(404).json({
          message: 'Ticket not found',
        })
      }

      const ahead =
        await Ticket.countDocuments({
          queue: ticket.queue._id,

          status: 'waiting',

          position: {
            $lt: ticket.position,
          },
        })

      res.json({
        ticket,

        ahead,

        estimatedWait:
          ahead *
          ticket.queue
            .avgServiceTime,
      })
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

module.exports = router