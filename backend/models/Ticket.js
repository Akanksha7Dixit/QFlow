const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true },
    queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true },
    customer: {
      name: { type: String, default: 'Anonymous' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'completed', 'cancelled', 'no-show'],
      default: 'waiting',
    },
    priority: { type: Boolean, default: false },
    position: { type: Number, required: true },
    servedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
    calledAt: { type: Date, default: null },
    servedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    estimatedWait: { type: Number, default: 0 }, // minutes
    serviceTime: { type: Number, default: 0 }, // actual service duration in seconds
    rating: { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true }
)

ticketSchema.index({ queue: 1, status: 1 })
ticketSchema.index({ ticketNumber: 1, queue: 1 })

module.exports = mongoose.model('Ticket', ticketSchema)
