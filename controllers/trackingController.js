const trackingService = require('../services/trackingService');
const logger = require('../utils/logger');
const HttpError = require('../utils/httpError');

/**
 * POST /api/track - Track a single event
 */
exports.trackEvent = async (req, res, next) => {
  try {
    const { userId, anonymousId, sessionId, eventType, page, properties, userAgent, ipAddress } = req.body;

    // Validate required fields
    if (!sessionId) {
      throw new HttpError('sessionId is required', 400);
    }

    const eventData = {
      userId: userId || null,
      anonymousId: anonymousId || null,
      sessionId,
      eventType,
      page: page || 'unknown',
      properties: properties || {},
      userAgent: userAgent || req.get('user-agent'),
      ipAddress: ipAddress || req.ip,
    };

    const event = await trackingService.saveEvent(eventData);
    res.status(201).json({ success: true, message: 'Event tracked', data: event });
  } catch (err) {
    logger.error('Error in trackEvent:', err.message);
    next(err);
  }
};

/**
 * POST /api/track/batch - Track multiple events
 */
exports.trackBatch = async (req, res, next) => {
  try {
    const { events, userAgent, ipAddress } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      throw new HttpError('events must be a non-empty array', 400);
    }

    // Enrich events with userAgent and ipAddress if not provided
    const enrichedEvents = events.map((event) => ({
      ...event,
      userAgent: event.userAgent || userAgent || req.get('user-agent'),
      ipAddress: event.ipAddress || ipAddress || req.ip,
    }));

    const savedEvents = await trackingService.saveBatch(enrichedEvents);
    res.status(201).json({
      success: true,
      message: `${savedEvents.length} events tracked`,
      data: { count: savedEvents.length },
    });
  } catch (err) {
    logger.error('Error in trackBatch:', err.message);
    next(err);
  }
};
