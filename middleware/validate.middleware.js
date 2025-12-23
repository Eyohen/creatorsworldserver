const { validationResult, body, param, query } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Common validation rules
const validations = {
  // Auth validations
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('userType')
      .isIn(['creator', 'brand'])
      .withMessage('User type must be creator or brand')
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  forgotPassword: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number')
  ],

  // Creator profile validations
  creatorProfile: [
    body('displayName')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Display name must be 2-100 characters'),
    body('bio')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Bio must be less than 1000 characters'),
    body('stateId')
      .optional()
      .isUUID()
      .withMessage('Invalid state ID'),
    body('cityId')
      .optional()
      .isUUID()
      .withMessage('Invalid city ID')
  ],

  // Brand profile validations
  brandProfile: [
    body('companyName')
      .optional()
      .isLength({ min: 2, max: 200 })
      .withMessage('Company name must be 2-200 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('industryId')
      .optional()
      .isUUID()
      .withMessage('Invalid industry ID'),
    body('website')
      .optional()
      .isURL()
      .withMessage('Invalid website URL')
  ],

  // Rate card validations
  rateCard: [
    body('platform')
      .isIn(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'other'])
      .withMessage('Invalid platform'),
    body('contentType')
      .isIn(['post', 'story', 'reel', 'video', 'short', 'live', 'tweet', 'thread', 'article', 'other'])
      .withMessage('Invalid content type'),
    body('priceType')
      .isIn(['fixed', 'range', 'negotiable'])
      .withMessage('Invalid price type'),
    body('price')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('priceMin')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum price must be a positive number'),
    body('priceMax')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Maximum price must be a positive number')
  ],

  // Portfolio item validations
  portfolioItem: [
    body('title')
      .isLength({ min: 1, max: 200 })
      .withMessage('Title is required and must be less than 200 characters'),
    body('type')
      .isIn(['image', 'video', 'link', 'case_study'])
      .withMessage('Invalid portfolio item type'),
    body('mediaUrl')
      .optional()
      .isURL()
      .withMessage('Invalid media URL'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters')
  ],

  // Collaboration request validations
  collaborationRequest: [
    body('creatorId')
      .isUUID()
      .withMessage('Invalid creator ID'),
    body('campaignTitle')
      .isLength({ min: 5, max: 200 })
      .withMessage('Campaign title must be 5-200 characters'),
    body('campaignBrief')
      .isLength({ min: 20 })
      .withMessage('Campaign brief must be at least 20 characters'),
    body('startDate')
      .isISO8601()
      .withMessage('Invalid start date'),
    body('endDate')
      .isISO8601()
      .withMessage('Invalid end date'),
    body('budgetAmount')
      .isInt({ min: 5000 })
      .withMessage('Budget must be at least 5000 Naira')
  ],

  // Review validations
  review: [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Comment must be less than 2000 characters'),
    body('communicationRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Communication rating must be between 1 and 5'),
    body('qualityRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Quality rating must be between 1 and 5'),
    body('professionalismRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Professionalism rating must be between 1 and 5'),
    body('timelinessRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Timeliness rating must be between 1 and 5')
  ],

  // Bank account validations
  bankAccount: [
    body('bankCode')
      .notEmpty()
      .withMessage('Bank code is required'),
    body('accountNumber')
      .matches(/^\d{10}$/)
      .withMessage('Account number must be 10 digits'),
    body('accountName')
      .isLength({ min: 2, max: 200 })
      .withMessage('Account name is required')
  ],

  // Payout request validations
  payoutRequest: [
    body('amount')
      .isInt({ min: 5000 })
      .withMessage('Minimum payout amount is 5000 Naira'),
    body('bankAccountId')
      .isUUID()
      .withMessage('Invalid bank account ID')
  ],

  // Message validations
  message: [
    body('content')
      .isLength({ min: 1, max: 5000 })
      .withMessage('Message must be 1-5000 characters')
  ],

  // Search/filter validations
  creatorSearch: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive number'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('minPrice')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Min price must be a positive number'),
    query('maxPrice')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max price must be a positive number'),
    query('minFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Min followers must be a positive number'),
    query('maxFollowers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max followers must be a positive number'),
    query('minRating')
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage('Min rating must be between 0 and 5')
  ],

  // UUID param validation
  uuidParam: (paramName = 'id') => [
    param(paramName)
      .isUUID()
      .withMessage(`Invalid ${paramName}`)
  ]
};

module.exports = {
  validate,
  validations
};
