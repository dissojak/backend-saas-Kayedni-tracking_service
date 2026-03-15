const Event = require('../models/event');
const Session = require('../models/session');
const UserBehaviorProfile = require('../models/userBehaviorProfile');
const profileSnapshotSyncService = require('./profileSnapshotSyncService');
const logger = require('../utils/logger');

/**
 * Get admin dashboard overview
 * @returns {Promise<Object>} - Overview metrics
 */
exports.getOverview = async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Total events
    const totalEvents = await Event.countDocuments();

    // Events in last 24 hours
    const eventsLast24h = await Event.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo },
    });

    // Active users (unique users with events)
    const activeUsers = await Event.distinct('userId', {
      timestamp: { $gte: sevenDaysAgo },
    });
    const activeUserCount = activeUsers.length;

    // Active sessions
    const activeSessions = await Session.countDocuments({ isActive: true });

    // Top pages
    const topPages = await Event.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Top event types
    const topEventTypes = await Event.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return {
      totalEvents,
      eventsLast24h,
      activeUserCount,
      activeSessions,
      topPages: topPages.map((p) => ({ page: p._id, views: p.count })),
      topEventTypes: topEventTypes.map((t) => ({ eventType: t._id, count: t.count })),
      generatedAt: now,
    };
  } catch (err) {
    logger.error('Error in getOverview:', err);
    throw err;
  }
};

/**
 * Get business-specific insights
 * @param {String} businessId - Business ID
 * @returns {Promise<Object>} - Business insights
 */
exports.getBusinessInsights = async (businessId) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Business view events
    const businessViewEvents = await Event.find({
      $or: [
        { 'properties.businessId': businessId },
        { page: { $regex: `business/${businessId}` } },
      ],
      timestamp: { $gte: sevenDaysAgo },
    });

    const totalViews = businessViewEvents.length;
    const uniqueViewers = [...new Set(businessViewEvents.map((e) => e.userId))].length;
    const clickEvents = businessViewEvents.filter((e) => e.eventType === 'click');
    const bookingAttempts = businessViewEvents.filter((e) => e.eventType === 'booking_started');

    // Calculate click-through rate
    const ctr = totalViews > 0 ? (clickEvents.length / totalViews) * 100 : 0;

    // Get events by day
    const eventsByDay = await Event.aggregate([
      {
        $match: {
          $or: [
            { 'properties.businessId': businessId },
            { page: { $regex: `business/${businessId}` } },
          ],
          timestamp: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      businessId,
      totalViews,
      uniqueViewers,
      clickCount: clickEvents.length,
      bookingAttempts: bookingAttempts.length,
      clickThroughRate: ctr.toFixed(2) + '%',
      eventsByDay,
      period: '7d',
      generatedAt: now,
    };
  } catch (err) {
    logger.error('Error in getBusinessInsights:', err);
    throw err;
  }
};

/**
 * Get aggregated user profile
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User behavior profile
 */
exports.getUserProfile = async (userId) => {
  try {
    const profile = await UserBehaviorProfile.findOne({ userId });

    if (!profile) {
      return {
        userId,
        message: 'No profile data yet',
        totalEvents: 0,
        totalSessions: 0,
      };
    }

    return profile;
  } catch (err) {
    logger.error('Error in getUserProfile:', err);
    throw err;
  }
};

/**
 * Get time-series trends
 * @param {Number} days - Number of days to look back (default 7)
 * @returns {Promise<Array>} - Trend data by day
 */
exports.getTrends = async (days = 7) => {
  try {
    const now = new Date();
    const startDate = new Date(now - days * 24 * 60 * 60 * 1000);

    const trends = await Event.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1, '_id.eventType': 1 } },
    ]);

    // Reorganize data by date
    const trendsByDate = {};
    trends.forEach((trend) => {
      const date = trend._id.date;
      const eventType = trend._id.eventType;
      if (!trendsByDate[date]) {
        trendsByDate[date] = {};
      }
      trendsByDate[date][eventType] = trend.count;
    });

    // Convert to array format
    const trendData = Object.entries(trendsByDate).map(([date, events]) => ({
      date,
      ...events,
      total: Object.values(events).reduce((sum, count) => sum + count, 0),
    }));

    return {
      period: `last ${days} days`,
      data: trendData,
      generatedAt: now,
    };
  } catch (err) {
    logger.error('Error in getTrends:', err);
    throw err;
  }
};

exports.getProfileSnapshotStatus = async () => {
  try {
    return await profileSnapshotSyncService.getLatestRunStatus();
  } catch (err) {
    logger.error('Error in getProfileSnapshotStatus:', err);
    throw err;
  }
};

exports.triggerProfileSnapshotSync = async () => {
  try {
    return await profileSnapshotSyncService.runSync('manual');
  } catch (err) {
    logger.error('Error in triggerProfileSnapshotSync:', err);
    throw err;
  }
};
