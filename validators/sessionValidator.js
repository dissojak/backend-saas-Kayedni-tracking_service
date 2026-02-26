// sessionValidator.js
// Validation chains for session endpoints

const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

exports.startSession = [
  body('userId').optional().isString(),
  handleValidation,
];

exports.endSession = [
  handleValidation,
];
