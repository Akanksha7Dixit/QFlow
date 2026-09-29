const mongoose = require('mongoose')

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#00f5ff' },
    isActive: { type: Boolean, default: true },
    queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', default: null },
    rules: [{ type: String }],
  },
  { timestamps: true }
)

departmentSchema.index({ code: 1 }, { unique: true })

module.exports = mongoose.model('Department', departmentSchema)
