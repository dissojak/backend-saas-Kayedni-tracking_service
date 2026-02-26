// rateLimiter.js
// Rate limiting middleware for tracking endpoints

const rateLimit = require('express-rate-limit');

const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { success: false, message: 'Too many requests, slow down' },
});

module.exports = trackingLimiter;
