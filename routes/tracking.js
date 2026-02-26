// tracking.js
// Routes for event tracking

const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const trackingValidator = require('../validators/trackingValidator');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/track - track single event
router.post('/', authMiddleware, ...trackingValidator.trackEvent, trackingController.trackEvent);

// POST /api/track/batch - track multiple events
router.post('/batch', authMiddleware, ...trackingValidator.trackBatch, trackingController.trackBatch);

module.exports = router;
