const router = require('express').Router()

const mongoose = require('mongoose')

const Department = require('../models/Department')
const Visit = require('../models/Visit')
const Queue = require('../models/Queue')
const Ticket = require('../models/Ticket')
const User = require('../models/User')

const {
  protect,
  authorize,
} = require('../middleware/auth')

const {
  extractIntake,
  validateExtraction,
} = require('../services/aiIntake')

/*
 * Deterministic safety triage.
 *
 * AI is used for language understanding.
 * These rules remain the safety authority.
 */
const triageFromText = (text = '') => {
  const value = text.toLowerCase()

  if (
    /chest pain|difficulty breathing|unconscious|stroke|seizure/.test(
      value
    )
  ) {
    return {
      level: 'emergency',
      rationale:
        'Red-flag symptom detected; immediate clinical review required.',
    }
  }

  if (
    /fever|vomit|bleeding|severe pain/.test(
      value
    )
  ) {
    return {
      level: 'urgent',
      rationale:
        'Symptom pattern indicates same-day review.',
    }
  }

  return {
    level: 'routine',
    rationale:
      'No configured red-flag symptom detected.',
  }
}

/*
 * Safely convert an optional MongoDB id.
 *
 * Empty strings must become null instead of
 * reaching Mongoose ObjectId casting.
 */
const normalizeObjectId = (value) => {
  if (!value) return null

  if (
    typeof value !== 'string' &&
    !mongoose.isValidObjectId(value)
  ) {
    return null
  }

  if (!mongoose.isValidObjectId(value)) {
    return null
  }

  return value
}

/*
 * GET /api/clinic/departments
 */
router.get(
  '/departments',
  protect,
  async (req, res) => {
    try {
      const departments =
        await Department.find({
          isActive: true,
        }).populate(
          'queue',
          'name prefix'
        )

      res.json(departments)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/clinic/departments
 *
 * Admin only.
 */
router.post(
  '/departments',
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const department =
        await Department.create(
          req.body
        )

      res.status(201).json(
        department
      )
    } catch (err) {
      res.status(400).json({
        message: err.message,
      })
    }
  }
)

/*
 * PATCH /api/clinic/departments/:id
 *
 * Admin only.
 */
router.patch(
  '/departments/:id',
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const department =
        await Department.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        )

      if (!department) {
        return res.status(404).json({
          message:
            'Department not found',
        })
      }

      res.json(department)
    } catch (err) {
      res.status(400).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/clinic/visits
 *
 * Patient submits clinical intake.
 *
 * Important workflow:
 *
 * Patient ticket
 *      ↓
 * Ticket queue
 *      ↓
 * Department
 *      ↓
 * Visit
 *
 * The ticket therefore provides a reliable
 * department when the patient selected
 * "Auto-route for review".
 */
router.post(
  '/visits',
  protect,
  async (req, res) => {
    try {
      if (
        req.user.role !== 'patient'
      ) {
        return res.status(403).json({
          message:
            'Only patients can submit intake',
        })
      }

      const {
        chiefComplaint = '',
        naturalLanguage = '',
        symptoms = [],
        duration = '',
        history = '',
      } = req.body

      /*
       * Normalize optional IDs.
       */
      const requestedDepartment =
        normalizeObjectId(
          req.body.department
        )

      const requestedTicket =
        normalizeObjectId(
          req.body.ticket
        )

      /*
       * Validate intake.
       */
      if (
        typeof chiefComplaint !==
        'string' ||
        chiefComplaint.length > 2000
      ) {
        return res.status(400).json({
          message:
            'Chief complaint must be 2,000 characters or fewer',
        })
      }

      if (
        typeof naturalLanguage !==
        'string' ||
        naturalLanguage.length > 5000
      ) {
        return res.status(400).json({
          message:
            'Natural-language intake must be 5,000 characters or fewer',
        })
      }

      if (
        !Array.isArray(symptoms) ||
        symptoms.length > 30 ||
        symptoms.some(
          (item) =>
            typeof item !==
            'string' ||
            item.length > 160
        )
      ) {
        return res.status(400).json({
          message:
            'Symptoms must be a list of short text values',
        })
      }

      if (
        typeof duration !==
        'string' ||
        duration.length > 200 ||
        typeof history !==
        'string' ||
        history.length > 2000
      ) {
        return res.status(400).json({
          message:
            'Intake fields are too long',
        })
      }

      /*
       * Resolve ticket.
       */
      let ticket = null

      if (requestedTicket) {
        ticket =
          await Ticket.findById(
            requestedTicket
          ).populate(
            'queue'
          )

        if (!ticket) {
          return res.status(404).json({
            message:
              'Ticket not found',
          })
        }
      }

      /*
       * Resolve department.
       *
       * Priority:
       *
       * 1. Explicit department selected
       * 2. Department belonging to ticket queue
       * 3. null — AI/routing can handle it later
       */
      let departmentId =
        requestedDepartment

      /*
       * If the patient has a ticket,
       * derive its department from the queue.
       */
      if (
        !departmentId &&
        ticket?.queue?._id
      ) {
        const queueDepartment =
          await Department.findOne({
            queue:
              ticket.queue._id,
            isActive: true,
          }).select('_id')

        if (queueDepartment) {
          departmentId =
            queueDepartment._id
        }
      }

      /*
       * If an explicit department was supplied,
       * make sure it actually exists.
       */
      if (departmentId) {
        const departmentExists =
          await Department.exists({
            _id: departmentId,
            isActive: true,
          })

        if (!departmentExists) {
          return res.status(400).json({
            message:
              'Selected department is not available',
          })
        }
      }

      /*
       * Prepare text for AI extraction.
       */
      const originalText =
        naturalLanguage.trim() ||
        chiefComplaint.trim()

      const aiInput = {
        chief_complaint:
          chiefComplaint.trim(),

        natural_language:
          originalText,

        symptoms,

        duration:
          duration.trim(),

        history:
          history.trim(),

        /*
         * AI receives the selected department
         * only as context.
         */
        selected_department:
          departmentId
            ? departmentId.toString()
            : null,
      }

      /*
       * AI extraction.
       */
      const aiResult =
        await extractIntake(
          aiInput
        )

      /*
       * Safe default when AI service
       * is unavailable.
       */
      let aiExtraction = {
        status: 'unavailable',
        processedAt: new Date(),
        error:
          aiResult.error ||
          null,
      }

      let extractedSymptoms =
        symptoms

      /*
       * Validate AI response before
       * storing it.
       */
      if (aiResult.ok) {
        const extraction =
          validateExtraction(
            aiResult.data
          )

        aiExtraction = {
          status: 'complete',

          symptoms:
            extraction.symptoms,

          duration:
            extraction.duration,

          severity:
            extraction.severity,

          severityIndicators:
            extraction.severity_indicators,

          relevantHistory:
            extraction.relevant_history,

          missingInformation:
            extraction.missing_information,

          possibleDepartment:
            extraction.possible_department,

          urgency:
            extraction.urgency,

          redFlags:
            extraction.red_flags,

          confidence:
            extraction.confidence,

          provider:
            extraction.provider,

          model:
            extraction.model,

          extractionVersion:
            extraction.extraction_version,

          processedAt:
            new Date(),

          error: null,
        }

        extractedSymptoms =
          extraction.symptoms
      }

      /*
       * Deterministic triage remains
       * independent from AI.
       */
      const triage =
        triageFromText(
          `${originalText} ${extractedSymptoms.join(
            ' '
          )}`
        )

      if (ticket) {
        ticket.priorityLevel = triage.level
        await ticket.save()

        if (ticket.queue?._id) {
          req.io
            .to(`queue:${ticket.queue._id}`)
            .emit('ticket-updated', ticket)
        }
      }

      /*
       * Create visit.
       */
      const visit =
        await Visit.create({
          patient:
            req.user._id,

          doctor: null,

          ticket:
            ticket?._id ||
            null,

          department:
            departmentId ||
            null,

          intake: {
            chiefComplaint,

            originalText,

            symptoms,

            duration,

            history,

            extractedAt:
              new Date(),
          },

          aiExtraction,

          triage,

          status:
            'triaged',

          audit: [
            {
              action:
                'intake-created',
              actor:
                req.user._id,
            },

            {
              action:
                `ai-extraction-${aiExtraction.status}`,
              actor:
                req.user._id,
            },

            ...(ticket
              ? [
                {
                  action:
                    'ticket-linked',
                  actor:
                    req.user._id,
                },
              ]
              : []),

            ...(departmentId
              ? [
                {
                  action:
                    'department-routed',
                  actor:
                    req.user._id,
                },
              ]
              : []),
          ],
        })

      /*
       * Return populated visit so the
       * frontend immediately receives
       * department/ticket information.
       */
      const populatedVisit =
        await Visit.findById(
          visit._id
        )
          .populate(
            {
              path: 'ticket',
              select: 'ticketNumber status position priorityLevel queue',
              populate: {
                path: 'queue',
                select: 'name category prefix',
              },
            }
          )
          .populate(
            'department',
            'name code'
          )

      res.status(201).json(
        populatedVisit
      )
    } catch (err) {
      console.error(
        '[CLINIC] Visit creation failed:',
        err
      )

      res.status(400).json({
        message: err.message,
      })
    }
  }
)

/*
 * GET /api/clinic/visits
 */
router.get(
  '/visits',
  protect,
  async (req, res) => {
    try {
      let filter = {}

      /*
       * Patients only see their own visits.
       */
      if (
        req.user.role ===
        'patient'
      ) {
        filter = {
          patient:
            req.user._id,
        }
      }

      /*
       * Doctors see:
       *
       * - visits directly assigned to them
       * - visits belonging to departments
       *   connected to their assigned queues
       */
      if (
        req.user.role ===
        'doctor'
      ) {
        console.log(
          '[DOCTOR VISITS] Doctor:',
          req.user._id
        )

        const assignedQueues =
          await Queue.find({
            doctors:
              req.user._id,
          }).select('_id name')

        console.log(
          '[DOCTOR VISITS] Assigned queues:',
          assignedQueues
        )

        const queueIds =
          assignedQueues.map(
            (queue) =>
              queue._id
          )

        const activeTickets =
          await Ticket.find({
            queue: {
              $in: queueIds,
            },
            status: {
              $in: ['waiting', 'serving'],
            },
          }).select('_id customer.email createdAt')

        const activeTicketIds = activeTickets.map(
          (ticket) => ticket._id
        )

        const activePatientEmails = [
          ...new Set(
            activeTickets
              .map((ticket) => ticket.customer?.email?.trim().toLowerCase())
              .filter(Boolean)
          ),
        ]
        const activePatients = activePatientEmails.length
          ? await User.find({
            email: {
              $in: activePatientEmails,
            },
            role: 'patient',
          }).select('_id email')
          : []

        const patientsByEmail = new Map(
          activePatients.map((patient) => [
            patient.email,
            patient._id,
          ])
        )

        const activePatientVisitFilters = activeTickets
          .map((ticket) => {
            const email = ticket.customer?.email?.trim().toLowerCase()
            const patientId = email && patientsByEmail.get(email)

            if (!patientId) return null

            return {
              patient: patientId,
              status: {
                $in: ['intake', 'triaged', 'in-consultation'],
              },
            }
          })
          .filter(Boolean)

        console.log(
          '[DOCTOR VISITS] Queue IDs:',
          queueIds
        )

        const assignedDepartments =
          await Department.find({
            queue: {
              $in: queueIds,
            },
            isActive: true,
          }).select(
            '_id name queue'
          )

        console.log(
          '[DOCTOR VISITS] Assigned departments:',
          assignedDepartments
        )

        const departmentIds =
          assignedDepartments.map(
            (department) =>
              department._id
          )

        console.log(
          '[DOCTOR VISITS] Department IDs:',
          departmentIds
        )
        filter = {
          $or: [
            {
              doctor: req.user._id,
              status: {
                $in: [
                  'intake',
                  'triaged',
                  'in-consultation',
                ],
              },
            },
            {
              department: {
                $in: departmentIds,
              },
              status: {
                $in: [
                  'intake',
                  'triaged',
                  'in-consultation',
                ],
              },
            },
            {
              ticket: {
                $in: activeTicketIds,
              },
              status: {
                $in: [
                  'intake',
                  'triaged',
                  'in-consultation',
                ],
              },
            },
            ...activePatientVisitFilters,
          ],
        }

        console.log(
          '[DOCTOR VISITS] Final filter:',
          filter
        )
      }

      /*
       * Admin sees all visits.
       */
      const visits =
        await Visit.find(
          filter
        )
          .populate(
            'patient',
            'name email'
          )
          .populate(
            'doctor',
            'name email'
          )
          .populate(
            {
              path: 'ticket',
              select: 'ticketNumber status position queue',
              populate: {
                path: 'queue',
                select: 'name category prefix',
              },
            }
          )
          .populate(
            'department',
            'name code'
          )
          .sort({
            createdAt: -1,
          })

      res.json(visits)
    } catch (err) {
      res.status(500).json({
        message: err.message,
      })
    }
  }
)

/*
 * PATCH /api/clinic/visits/:id
 *
 * Doctor/admin consultation updates.
 */
router.patch(
  '/visits/:id',
  protect,
  authorize(
    'admin',
    'doctor'
  ),
  async (req, res) => {
    try {
      const existingVisit =
        await Visit.findById(
          req.params.id
        )

      if (!existingVisit) {
        return res.status(404).json({
          message:
            'Visit not found',
        })
      }

      /*
       * Doctors can only update
       * visits belonging to their
       * assigned department/queue.
       */
      if (req.user.role === 'doctor') {
        const department =
          existingVisit.department
            ? await Department.findById(
              existingVisit.department
            ).select('queue')
            : null

        const linkedTicket =
          existingVisit.ticket
            ? await Ticket.findById(
              existingVisit.ticket
            ).select('queue')
            : null

        const visitQueueIds = [
          department?.queue,
          linkedTicket?.queue,
        ].filter(Boolean)

        const assignedQueue =
          visitQueueIds.length
            ? await Queue.findOne({
              _id: {
                $in: visitQueueIds,
              },
              doctors:
                req.user._id,
            }).select('_id')
            : null

        const directlyAssigned =
          existingVisit.doctor?.toString() ===
          req.user._id.toString()

        if (
          !directlyAssigned &&
          !assignedQueue
        ) {
          return res.status(403).json({
            message:
              'You are not assigned to this visit',
          })
        }
      }

      const updates = {}

      if (req.body.status) {
        updates.status =
          req.body.status
      }

      if (
        req.body.consultation
      ) {
        updates.consultation = {
          ...req.body.consultation,
          confirmedAt:
            new Date(),
        }
      }

      if (req.body.doctor) {
        updates.doctor =
          req.body.doctor
      }

      const visit =
        await Visit.findByIdAndUpdate(
          req.params.id,
          {
            $set: updates,

            $push: {
              audit: {
                action:
                  'visit-updated',
                actor:
                  req.user._id,
              },
            },
          },
          {
            new: true,
          }
        )
          .populate(
            'patient',
            'name email'
          )


          .populate(
            'doctor',
            'name email'
          )
          .populate(
            'department',
            'name code'
          )

      res.json(visit)
    } catch (err) {
      res.status(400).json({
        message: err.message,
      })
    }
  }
)

/*
 * POST /api/clinic/appointments
 */
router.post(
  '/appointments',
  protect,
  async (req, res) => {
    try {
      const department =
        normalizeObjectId(
          req.body.department
        )

      if (!department) {
        return res.status(400).json({
          message:
            'A valid department is required',
        })
      }

      const visit =
        await Visit.create({
          patient:
            req.user.role ===
              'patient'
              ? req.user._id
              : req.body.patient,

          doctor:
            req.body.doctor ||
            null,

          department,

          appointmentAt:
            req.body.appointmentAt,

          status:
            'intake',

          audit: [
            {
              action:
                'appointment-created',
              actor:
                req.user._id,
            },
          ],
        })

      res.status(201).json(
        visit
      )
    } catch (err) {
      res.status(400).json({
        message: err.message,
      })
    }
  }
)

module.exports = router