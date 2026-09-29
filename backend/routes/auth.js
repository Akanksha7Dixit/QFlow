const router = require('express').Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { protect } = require('../middleware/auth')

const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  )
}

// ============================================================
// PUBLIC REGISTRATION
// Public registration ALWAYS creates a PATIENT.
// The client cannot choose the role.
// ============================================================
router.post('/register', async (req, res) => {
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

    const exists = await User.findOne({
      email: normalizedEmail
    })

    if (exists) {
      return res.status(400).json({
        message: 'Email already registered'
      })
    }

    // IMPORTANT:
    // Never accept role from req.body.
    // Every public registration is a patient.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'patient'
    })

    const token = signToken(user._id)

    res.status(201).json({
      token,
      user
    })
  } catch (err) {
    console.error('[AUTH REGISTER]', err)

    res.status(500).json({
      message: err.message || 'Registration failed'
    })
  }
})

// ============================================================
// LOGIN
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const user = await User.findOne({
      email: normalizedEmail
    })

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account has been deactivated'
      })
    }

    const passwordMatches = await user.comparePassword(password)

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid credentials'
      })
    }

    const token = signToken(user._id)

    res.json({
      token,
      user
    })
  } catch (err) {
    console.error('[AUTH LOGIN]', err)

    res.status(500).json({
      message: err.message || 'Login failed'
    })
  }
})

// ============================================================
// CURRENT USER
// ============================================================
router.get('/me', protect, (req, res) => {
  res.json(req.user)
})

module.exports = router