const Session = require('../models/session');
const trackingService = require('./trackingService');
const logger = require('../utils/logger');
const HttpError = require('../utils/httpError');
const { v4: uuidv4 } = require('uuid');

/**
 * Start a new session
 * @param {Object} sessionData - Session data {userId, anonymousId, browser, os, deviceType, ipAddress, referrer}
 * @returns {Promise<Object>} - Saved session document
 */
exports.startSession = async (sessionData) => {
  try {
    const sessionId = sessionData.sessionId || uuidv4();
    const session = new Session({
      sessionId,
      userId: sessionData.userId || null,
      anonymousId: sessionData.anonymousId || null,
      browser: sessionData.browser || 'unknown',
      os: sessionData.os || 'unknown',
      deviceType: sessionData.deviceType || 'desktop',
      ipAddress: sessionData.ipAddress,
      referrer: sessionData.referrer,
      isActive: true,
    });

    await session.save();
    const identifier = sessionData.userId || sessionData.anonymousId;
    logger.info(`Session started: ${sessionId} for ${identifier}`);
    return session;
  } catch (err) {
    logger.error('Error starting session:', err);
    throw err;
  }
};

/**
 * End a session
 * @param {String} sessionId - Session ID
 * @returns {Promise<Object>} - Updated session document
 */
exports.endSession = async (sessionId) => {
  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      throw new HttpError(`Session ${sessionId} not found`, 404);
    }

    // Idempotent: if session is already ended, return it as-is (no error)
    // This prevents 400 errors from duplicate end requests (sendBeacon + cleanup)
    if (!session.isActive) {
      logger.info(`Session ${sessionId} already ended — returning existing data`);
      return session;
    }

    const endTime = new Date();
    const duration = endTime - session.startTime; // milliseconds

    // Get event count for this session
    const events = await trackingService.getEventsBySession(sessionId);
    const eventCount = events.length;

    session.endTime = endTime;
    session.duration = duration;
    session.eventCount = eventCount;
    session.isActive = false;

    await session.save();
    logger.info(`Session ended: ${sessionId}, duration: ${duration}ms, events: ${eventCount}`);
    return session;
  } catch (err) {
    logger.error('Error ending session:', err);
    throw err;
  }
};

/**
 * Get session by ID
 * @param {String} sessionId - Session ID
 * @returns {Promise<Object>} - Session document
 */
exports.getSessionById = async (sessionId) => {
  try {
    const session = await Session.findOne({ sessionId });
    return session;
  } catch (err) {
    logger.error('Error fetching session:', err);
    throw err;
  }
};

/**
 * Get all sessions for a user or anonymous user
 * @param {String} userId - User ID (can be null for anonymous)
 * @param {String} anonymousId - Anonymous ID
 * @param {Boolean} activeOnly - Only return active sessions
 * @returns {Promise<Array>} - Array of sessions
 */
exports.getSessionsByUser = async (userId = null, anonymousId = null, activeOnly = false) => {
  try {
    const query = {};
    if (userId) query.userId = userId;
    if (anonymousId) query.anonymousId = anonymousId;
    if (activeOnly) query.isActive = true;

    const sessions = await Session.find(query).sort({ startTime: -1 });
    return sessions;
  } catch (err) {
    logger.error('Error fetching sessions:', err);
    throw err;
  }
};

/**
 * Update session event count
 * @param {String} sessionId - Session ID
 * @param {Number} count - Event count
 * @returns {Promise<Object>} - Updated session
 */
exports.updateEventCount = async (sessionId, count) => {
  try {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { eventCount: count },
      { new: true }
    );
    return session;
  } catch (err) {
    logger.error('Error updating event count:', err);
    throw err;
  }
};
