const router = require('express').Router()
const Department = require('../models/Department')
const Visit = require('../models/Visit')
const Queue = require('../models/Queue')
const { protect, authorize } = require('../middleware/auth')
const { extractIntake, validateExtraction } = require('../services/aiIntake')

const triageFromText = (text = '') => {
  const value = text.toLowerCase()
  if (/chest pain|difficulty breathing|unconscious|stroke|seizure/.test(value)) return { level: 'emergency', rationale: 'Red-flag symptom detected; immediate clinical review required.' }
  if (/fever|vomit|bleeding|severe pain/.test(value)) return { level: 'urgent', rationale: 'Symptom pattern indicates same-day review.' }
  return { level: 'routine', rationale: 'No configured red-flag symptom detected.' }
}

router.get('/departments', protect, async (req, res) => {
  try { res.json(await Department.find({ isActive: true }).populate('queue', 'name prefix')) } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/departments', protect, authorize('admin'), async (req, res) => {
  try { res.status(201).json(await Department.create(req.body)) } catch (err) { res.status(400).json({ message: err.message }) }
})

router.patch('/departments/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!department) return res.status(404).json({ message: 'Department not found' })
    res.json(department)
  } catch (err) { res.status(400).json({ message: err.message }) }
})

router.post('/visits', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can submit intake' })

    const {
      chiefComplaint = '',
      naturalLanguage = '',
      symptoms = [],
      duration = '',
      history = '',
      department,
      ticket,
    } = req.body

    if (typeof chiefComplaint !== 'string' || chiefComplaint.length > 2000) return res.status(400).json({ message: 'Chief complaint must be 2,000 characters or fewer' })
    if (typeof naturalLanguage !== 'string' || naturalLanguage.length > 5000) return res.status(400).json({ message: 'Natural-language intake must be 5,000 characters or fewer' })
    if (!Array.isArray(symptoms) || symptoms.length > 30 || symptoms.some((item) => typeof item !== 'string' || item.length > 160)) return res.status(400).json({ message: 'Symptoms must be a list of short text values' })
    if (typeof duration !== 'string' || duration.length > 200 || typeof history !== 'string' || history.length > 2000) return res.status(400).json({ message: 'Intake fields are too long' })

    const originalText = naturalLanguage.trim() || chiefComplaint.trim()
    const aiInput = { chief_complaint: chiefComplaint.trim(), natural_language: originalText, symptoms, duration: duration.trim(), history: history.trim(), selected_department: department || null }
    const aiResult = await extractIntake(aiInput)
    let aiExtraction = { status: 'unavailable', processedAt: new Date(), error: aiResult.error || null }
    let extractedSymptoms = symptoms

    if (aiResult.ok) {
      const extraction = validateExtraction(aiResult.data)
      aiExtraction = {
        status: 'complete',
        symptoms: extraction.symptoms,
        duration: extraction.duration,
        severity: extraction.severity,
        severityIndicators: extraction.severity_indicators,
        relevantHistory: extraction.relevant_history,
        missingInformation: extraction.missing_information,
        possibleDepartment: extraction.possible_department,
        urgency: extraction.urgency,
        redFlags: extraction.red_flags,
        confidence: extraction.confidence,
        provider: extraction.provider,
        model: extraction.model,
        extractionVersion: extraction.extraction_version,
        processedAt: new Date(),
        error: null,
      }
      extractedSymptoms = extraction.symptoms
    }

    // AI supplies language understanding; deterministic rules retain safety authority.
    const triage = triageFromText(`${originalText} ${extractedSymptoms.join(' ')}`)
    const visit = await Visit.create({ patient: req.user._id, ticket, department, intake: { chiefComplaint, originalText, symptoms, duration, history, extractedAt: new Date() }, aiExtraction, triage, status: 'triaged', audit: [{ action: 'intake-created', actor: req.user._id }, { action: `ai-extraction-${aiExtraction.status}`, actor: req.user._id }] })
    res.status(201).json(visit)
  } catch (err) { res.status(400).json({ message: err.message }) }
})

router.get('/visits', protect, async (req, res) => {
  try {
    let filter = {}
    if (req.user.role === 'patient') filter = { patient: req.user._id }
    if (req.user.role === 'doctor') {
      const assignedQueues = await Queue.find({ doctors: req.user._id }).select('_id')
      const assignedDepartments = await Department.find({ queue: { $in: assignedQueues.map((queue) => queue._id) } }).select('_id')
      filter = { $or: [{ doctor: req.user._id }, { department: { $in: assignedDepartments.map((department) => department._id) } }] }
    }
    res.json(await Visit.find(filter).populate('patient', 'name email').populate('doctor', 'name email').populate('department', 'name code').sort({ createdAt: -1 }))
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.patch('/visits/:id', protect, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const existingVisit = await Visit.findById(req.params.id)
    if (!existingVisit) return res.status(404).json({ message: 'Visit not found' })
    if (req.user.role === 'doctor') {
      const department = existingVisit.department ? await Department.findById(existingVisit.department).select('queue') : null
      const assignedQueue = department?.queue ? await Queue.findOne({ _id: department.queue, doctors: req.user._id }).select('_id') : null
      const directlyAssigned = existingVisit.doctor?.toString() === req.user._id.toString()
      if (!directlyAssigned && !assignedQueue) return res.status(403).json({ message: 'You are not assigned to this visit' })
    }
    const updates = {}
    if (req.body.status) updates.status = req.body.status
    if (req.body.consultation) updates.consultation = { ...req.body.consultation, confirmedAt: new Date() }
    if (req.body.doctor) updates.doctor = req.body.doctor
    const visit = await Visit.findByIdAndUpdate(req.params.id, { $set: updates, $push: { audit: { action: 'visit-updated', actor: req.user._id } } }, { new: true })
    res.json(visit)
  } catch (err) { res.status(400).json({ message: err.message }) }
})

router.post('/appointments', protect, async (req, res) => {
  try {
    const visit = await Visit.create({ patient: req.user.role === 'patient' ? req.user._id : req.body.patient, doctor: req.body.doctor, department: req.body.department, appointmentAt: req.body.appointmentAt, status: 'intake', audit: [{ action: 'appointment-created', actor: req.user._id }] })
    res.status(201).json(visit)
  } catch (err) { res.status(400).json({ message: err.message }) }
})

module.exports = router
