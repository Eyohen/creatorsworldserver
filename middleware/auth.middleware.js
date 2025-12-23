const jwt = require('jsonwebtoken');
const db = require('../models');
const { User, Creator, Brand, Admin } = db;

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      req.user = user;
      req.userId = user.id;
      req.userType = user.userType;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Optional auth - attach user if token present but don't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password'] }
      });

      if (user && user.status === 'active') {
        req.user = user;
        req.userId = user.id;
        req.userType = user.userType;
      }
    } catch (error) {
      // Token invalid but that's okay for optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

// Require specific user type
const requireUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for your account type'
      });
    }

    next();
  };
};

// Require creator
const requireCreator = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Creator access required'
      });
    }

    const creator = await Creator.findOne({
      where: { userId: req.user.id }
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    req.creator = creator;
    next();
  } catch (error) {
    console.error('Require creator error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Require brand
const requireBrand = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'brand') {
      return res.status(403).json({
        success: false,
        message: 'Brand access required'
      });
    }

    const brand = await Brand.findOne({
      where: { userId: req.user.id }
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand profile not found'
      });
    }

    req.brand = brand;
    next();
  } catch (error) {
    console.error('Require brand error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Require admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const admin = await Admin.findOne({
      where: { userId: req.user.id }
    });

    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin profile not found or inactive'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Require admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Require admin with specific permissions
const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Super admin has all permissions
      if (req.admin.role === 'super_admin') {
        return next();
      }

      const adminPermissions = req.admin.permissions || {};

      // Check if admin has required permissions
      const hasPermission = permissions.every(permission => {
        const [resource, action] = permission.split(':');
        return adminPermissions[resource] && adminPermissions[resource].includes(action);
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};

// Require email verification
const requireEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }
  next();
};

// Require onboarding completed
const requireOnboardingComplete = async (req, res, next) => {
  try {
    let profile;

    if (req.user.userType === 'creator') {
      profile = await Creator.findOne({ where: { userId: req.user.id } });
    } else if (req.user.userType === 'brand') {
      profile = await Brand.findOne({ where: { userId: req.user.id } });
    } else {
      return next(); // Admin doesn't need onboarding
    }

    if (!profile || !profile.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Please complete onboarding first',
        code: 'ONBOARDING_REQUIRED',
        onboardingStep: profile?.onboardingStep || 1
      });
    }

    next();
  } catch (error) {
    console.error('Onboarding check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireUserType,
  requireCreator,
  requireBrand,
  requireAdmin,
  requirePermission,
  requireEmailVerified,
  requireOnboardingComplete
};
