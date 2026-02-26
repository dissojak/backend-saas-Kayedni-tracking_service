// trackingValidator.js
// Validation chains for tracking events

const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

exports.trackEvent = [
  body('eventType').notEmpty().withMessage('eventType is required'),
  handleValidation,
];

exports.trackBatch = [
  body('events').isArray({ min: 1 }).withMessage('events must be a non-empty array'),
  handleValidation,
];
