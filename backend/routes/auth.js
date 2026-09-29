const jwt = require('jsonwebtoken')
const User = require('../models/User')

/*
 * Authenticate a request using JWT.
 */
const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized — no token',
    })
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    )

    const user = await User.findById(decoded.id).select(
      '-password'
    )

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'This account has been deactivated',
      })
    }

    req.user = user

    next()
  } catch (error) {
    return res.status(401).json({
      message: 'Not authorized — invalid token',
    })
  }
}

/*
 * Admin-only middleware.
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next()
  }

  return res.status(403).json({
    message: 'Admin access required',
  })
}

/*
 * Doctor OR admin.
 */
const doctorOrAdmin = (req, res, next) => {
  if (
    ['admin', 'doctor'].includes(req.user?.role)
  ) {
    return next()
  }

  return res.status(403).json({
    message: 'Doctor or Admin access required',
  })
}

/*
 * Any authenticated clinic user.
 */
const authenticatedUser = (req, res, next) => {
  if (req.user) {
    return next()
  }

  return res.status(401).json({
    message: 'Authentication required',
  })
}

/*
 * Generic role middleware.
 *
 * Usage:
 *
 * authorize('admin')
 * authorize('admin', 'doctor')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied',
      })
    }

    next()
  }
}

module.exports = {
  protect,
  adminOnly,
  doctorOrAdmin,
  authenticatedUser,
  authorize,
}