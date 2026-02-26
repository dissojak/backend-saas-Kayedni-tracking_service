const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');
const HttpError = require('../utils/httpError');

/**
 * GET /api/analytics/overview - Admin dashboard overview
 */
exports.getOverview = async (req, res, next) => {
  try {
    const overview = await analyticsService.getOverview();
    res.status(200).json({ success: true, data: overview });
  } catch (err) {
    logger.error('Error in getOverview:', err.message);
    next(err);
  }
};

/**
 * GET /api/analytics/business/:id - Business-specific insights
 */
exports.getBusinessInsights = async (req, res, next) => {
  try {
    const { id: businessId } = req.params;

    if (!businessId) {
      throw new HttpError('businessId is required', 400);
    }

    const insights = await analyticsService.getBusinessInsights(businessId);
    res.status(200).json({ success: true, data: insights });
  } catch (err) {
    logger.error('Error in getBusinessInsights:', err.message);
    next(err);
  }
};

/**
 * GET /api/analytics/user/:id/profile - User behavior profile
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const { id: userId } = req.params;

    if (!userId) {
      throw new HttpError('userId is required', 400);
    }

    const profile = await analyticsService.getUserProfile(userId);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    logger.error('Error in getUserProfile:', err.message);
    next(err);
  }
};

/**
 * GET /api/analytics/trends - Time-series trend data
 */
exports.getTrends = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const daysInt = parseInt(days, 10) || 7;

    const trends = await analyticsService.getTrends(daysInt);
    res.status(200).json({ success: true, data: trends });
  } catch (err) {
    logger.error('Error in getTrends:', err.message);
    next(err);
  }
};
