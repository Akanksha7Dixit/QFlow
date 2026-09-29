const router = require('express').Router()
const User = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth')

const PROFILE_FIELDS = ['name', 'phone', 'dateOfBirth', 'medicalNotes']

const validateProfile = (payload) => {
  const unknownFields = Object.keys(payload).filter((field) => !PROFILE_FIELDS.includes(field))
  if (unknownFields.length) return `Unsupported profile field: ${unknownFields[0]}`

  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string' || payload.name.trim().length < 2 || payload.name.trim().length > 100) {
      return 'Name must be between 2 and 100 characters'
    }
  }

  if (payload.phone !== undefined && payload.phone !== '' && (typeof payload.phone !== 'string' || !/^\+[\d\s().-]{7,19}$|^[\d\s().-]{7,19}$/.test(payload.phone.trim()))) {
    return 'Enter a valid phone number'
  }

  if (payload.dateOfBirth !== undefined && payload.dateOfBirth !== null && payload.dateOfBirth !== '') {
    const date = new Date(payload.dateOfBirth)
    if (Number.isNaN(date.getTime()) || date > new Date()) return 'Date of birth cannot be in the future'
  }

  if (payload.medicalNotes !== undefined && (typeof payload.medicalNotes !== 'string' || payload.medicalNotes.length > 2000)) {
    return 'Medical notes must be 2,000 characters or fewer'
  }

  return null
}

// Patient profile is self-service; email, role, and account state remain server-controlled.
router.get('/me/profile', protect, (req, res) => {
  res.json(req.user)
})

const updateProfile = async (req, res) => {
  try {
    const validationMessage = validateProfile(req.body)
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    PROFILE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field]
    })
    await req.user.save()
    res.json(req.user)
  } catch (err) {
    res.status(400).json({ message: err.message || 'Unable to update profile' })
  }
}

router.patch('/me/profile', protect, updateProfile)

// Backward-compatible alias for clients using the original endpoint.
router.patch('/me', protect, updateProfile)

// ============================================================
// GET ALL DOCTORS
// Admin only
// ============================================================
router.get('/doctors', protect, adminOnly, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' })
      .select('-password')
      .sort({ createdAt: -1 })

    res.json(doctors)
  } catch (err) {
    console.error('[GET DOCTORS]', err)

    res.status(500).json({
      message: err.message || 'Failed to fetch doctors'
    })
  }
})

// ============================================================
// CREATE DOCTOR
// Admin only
// ============================================================
router.post('/doctors', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await User.findOne({
      email: normalizedEmail
    })

    if (existingUser) {
      return res.status(400).json({
        message: 'A user with this email already exists'
      })
    }

    const doctor = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'doctor',
      isActive: true
    })

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor
    })
  } catch (err) {
    console.error('[CREATE DOCTOR]', err)

    res.status(500).json({
      message: err.message || 'Failed to create doctor'
    })
  }
})

// ============================================================
// UPDATE DOCTOR
// Admin only
// ============================================================
router.put('/doctors/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body

    const doctor = await User.findOne({
      _id: req.params.id,
      role: 'doctor'
    })

    if (!doctor) {
      return res.status(404).json({
        message: 'Doctor not found'
      })
    }

    if (name !== undefined) {
      doctor.name = name.trim()
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase()

      const emailExists = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: doctor._id }
      })

      if (emailExists) {
        return res.status(400).json({
          message: 'Another user already uses this email'
        })
      }

      doctor.email = normalizedEmail
    }

    if (password !== undefined && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({
          message: 'Password must be at least 6 characters'
        })
      }

      doctor.password = password
    }

    await doctor.save()

    res.json({
      message: 'Doctor updated successfully',
      doctor
    })
  } catch (err) {
    console.error('[UPDATE DOCTOR]', err)

    res.status(500).json({
      message: err.message || 'Failed to update doctor'
    })
  }
})

// ============================================================
// ACTIVATE / DEACTIVATE DOCTOR
// Admin only
// ============================================================
router.patch('/doctors/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be true or false'
      })
    }

    const doctor = await User.findOne({
      _id: req.params.id,
      role: 'doctor'
    })

    if (!doctor) {
      return res.status(404).json({
        message: 'Doctor not found'
      })
    }

    doctor.isActive = isActive

    await doctor.save()

    res.json({
      message: isActive
        ? 'Doctor activated successfully'
        : 'Doctor deactivated successfully',
      doctor
    })
  } catch (err) {
    console.error('[DOCTOR STATUS]', err)

    res.status(500).json({
      message: err.message || 'Failed to update doctor status'
    })
  }
})

module.exports = router