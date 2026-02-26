const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message);
  const statusCode = err.statusCode || err.code || 500;
  res.status(statusCode).json({ success: false, message: err.message || 'An error occurred' });
};
