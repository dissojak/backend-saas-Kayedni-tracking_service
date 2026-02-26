const Event = require('../models/event');
const logger = require('../utils/logger');

/**
 * Save a single event
 * @param {Object} eventData - Event data {userId, sessionId, eventType, page, properties, userAgent, ipAddress}
 * @returns {Promise<Object>} - Saved event document
 */
exports.saveEvent = async (eventData) => {
  try {
    const event = new Event(eventData);
    await event.save();
    logger.info(`Event saved: ${eventData.eventType} for user ${eventData.userId}`);
    return event;
  } catch (err) {
    logger.error('Error saving event:', err);
    throw err;
  }
};

/**
 * Save multiple events in batch
 * @param {Array} events - Array of event objects
 * @returns {Promise<Array>} - Array of saved event documents
 */
exports.saveBatch = async (events) => {
  try {
    const savedEvents = await Event.insertMany(events, { ordered: false });
    logger.info(`Batch saved: ${savedEvents.length} events`);
    return savedEvents;
  } catch (err) {
    // insertMany with ordered:false will throw partial success errors
    // Log but don't fail completely
    logger.warn('Batch insert partially succeeded or failed:', err.message);
    throw err;
  }
};

/**
 * Get events for a user within a date range
 * @param {String} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of events
 */
exports.getEventsByUser = async (userId, startDate, endDate) => {
  try {
    const events = await Event.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate },
    }).sort({ timestamp: -1 });
    return events;
  } catch (err) {
    logger.error('Error fetching user events:', err);
    throw err;
  }
};

/**
 * Get events by session ID
 * @param {String} sessionId - Session ID
 * @returns {Promise<Array>} - Array of events
 */
exports.getEventsBySession = async (sessionId) => {
  try {
    const events = await Event.find({ sessionId }).sort({ timestamp: -1 });
    return events;
  } catch (err) {
    logger.error('Error fetching session events:', err);
    throw err;
  }
};
