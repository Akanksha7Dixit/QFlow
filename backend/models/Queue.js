const mongoose = require('mongoose')

const queueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    category: {
      type: String,
      enum: [
        'general',
        'medical',
        'banking',
        'government',
        'retail',
        'tech-support',
        'other',
      ],
      default: 'medical',
    },

    /*
     * Administrator who owns/manages the queue.
     */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /*
     * Doctors assigned to this queue/department.
     */
    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    isOpen: {
      type: Boolean,
      default: true,
    },

    maxCapacity: {
      type: Number,
      default: 100,
      min: 1,
    },

    avgServiceTime: {
      type: Number,
      default: 5,
      min: 1,
    },

    currentServing: {
      type: Number,
      default: 0,
    },

    totalServedToday: {
      type: Number,
      default: 0,
    },

    prefix: {
      type: String,
      default: 'A',
      maxlength: 3,
      trim: true,
      uppercase: true,
    },

    ticketCounter: {
      type: Number,
      default: 0,
    },

    color: {
      type: String,
      default: '#00f5ff',
    },

    /*
     * Kept for compatibility with the existing
     * queue system.
     */
    priority: {
      type: Boolean,
      default: false,
    },

    workingHours: {
      open: {
        type: String,
        default: '09:00',
      },

      close: {
        type: String,
        default: '17:00',
      },
    },
  },
  {
    timestamps: true,
  }
)

queueSchema.virtual('activeTickets', {
  ref: 'Ticket',

  localField: '_id',

  foreignField: 'queue',

  match: {
    status: {
      $in: ['waiting', 'serving'],
    },
  },
})

module.exports = mongoose.model(
  'Queue',
  queueSchema
)