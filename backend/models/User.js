const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    /*
     * QueueFlow / Smart Clinic roles
     *
     * patient:
     * Publicly registered users.
     *
     * doctor:
     * Created/managed by administrators.
     *
     * admin:
     * Full system access.
     */
    role: {
      type: String,
      enum: ['admin', 'doctor', 'patient'],
      default: 'patient',
    },

    avatar: {
      type: String,
      default: '',
    },

    phone: {
      type: String,
      default: '',
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    medicalNotes: {
      type: String,
      default: '',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

/*
 * Hash password before saving.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  this.password = await bcrypt.hash(this.password, 12)

  next()
})

/*
 * Compare login password with stored hash.
 */
userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(
    candidatePassword,
    this.password
  )
}

/*
 * Never expose password in API responses.
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject()

  delete obj.password

  return obj
}

module.exports = mongoose.model('User', userSchema)