const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const { validate, validations } = require('../middleware/validate.middleware');

// Public routes
router.post('/register',
  validations.register,
  validate,
  authController.register
);

router.post('/login',
  validations.login,
  validate,
  authController.login
);

router.post('/logout', authController.logout);

router.post('/forgot-password',
  validations.forgotPassword,
  validate,
  authController.forgotPassword
);

router.post('/reset-password',
  validations.resetPassword,
  validate,
  authController.resetPassword
);

router.get('/verify-email', authController.verifyEmail);

router.post('/resend-verification',
  validations.forgotPassword,
  validate,
  authController.resendVerification
);

// Google OAuth
router.post('/google', authController.googleAuth);

// Token refresh
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);

router.put('/change-password',
  verifyToken,
  authController.changePassword
);

module.exports = router;
