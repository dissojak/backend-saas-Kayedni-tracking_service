const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const profileAggregator = require('../services/profileAggregator');
const logger = require('../utils/logger');

// GET /api/analytics/overview - admin dashboard overview
router.get('/overview', authMiddleware, analyticsController.getOverview);

// GET /api/analytics/business/:id - business-specific insights
router.get('/business/:id', authMiddleware, analyticsController.getBusinessInsights);

// GET /api/analytics/user/:id/profile - user behavior profile
router.get('/user/:id/profile', authMiddleware, analyticsController.getUserProfile);

// GET /api/analytics/trends - time-series trend data
router.get('/trends', authMiddleware, analyticsController.getTrends);

// POST /api/analytics/aggregate - manually trigger profile aggregation (for testing)
router.post('/aggregate', authMiddleware, async (req, res) => {
  try {
    logger.info('Manual profile aggregation triggered');
    const result = await profileAggregator.aggregateProfiles();
    res.json({ success: true, message: 'Profile aggregation completed', result });
  } catch (err) {
    logger.error('Manual profile aggregation failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
