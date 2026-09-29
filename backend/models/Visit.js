const mongoose = require('mongoose')

const visitSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    status: { type: String, enum: ['intake', 'triaged', 'in-consultation', 'completed', 'cancelled'], default: 'intake' },
    intake: {
      chiefComplaint: { type: String, default: '' },
      originalText: { type: String, default: '' },
      symptoms: [{ type: String }],
      duration: { type: String, default: '' },
      history: { type: String, default: '' },
      extractedAt: { type: Date, default: null },
    },
    aiExtraction: {
      status: { type: String, enum: ['pending', 'complete', 'unavailable', 'invalid'], default: 'pending' },
      symptoms: [{ type: String }],
      duration: { type: String, default: null },
      severity: { type: String, enum: ['low', 'moderate', 'high'], default: 'low' },
      severityIndicators: [{ type: String }],
      relevantHistory: [{ type: String }],
      missingInformation: [{ type: String }],
      possibleDepartment: { type: String, default: null },
      urgency: { type: String, enum: ['routine', 'soon', 'urgent', 'emergency'], default: 'routine' },
      redFlags: [{ type: String }],
      confidence: { type: Number, min: 0, max: 1, default: 0 },
      provider: { type: String, default: null },
      model: { type: String, default: null },
      extractionVersion: { type: String, default: null },
      processedAt: { type: Date, default: null },
      error: { type: String, default: null },
    },
    triage: {
      level: { type: String, enum: ['routine', 'soon', 'urgent', 'emergency'], default: 'routine' },
      rationale: { type: String, default: '' },
      routedBy: { type: String, default: 'rules' },
    },
    consultation: {
      notes: { type: String, default: '' },
      diagnosis: { type: String, default: '' },
      aiSummary: { type: String, default: '' },
      confirmedAt: { type: Date, default: null },
    },
    appointmentAt: { type: Date, default: null },
    audit: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
)

visitSchema.index({ patient: 1, createdAt: -1 })
visitSchema.index({ doctor: 1, status: 1 })

module.exports = mongoose.model('Visit', visitSchema)
