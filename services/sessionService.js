/**
 * sessionService.js
 *
 * Manages the full session lifecycle:
 *  startSession()          — open a new session, populated from req.context
 *  endSession()            — close the session, compute duration + final eventCount
 *  updateLastActivity()    — lightweight touch on lastActivityAt (used by session-cleanup job)
 *  getSessionById()        — fetch by sessionId
 *  getSessionsByUser()     — list sessions for a user or anonymous visitor
 *
 * All device / network metadata comes from req.context (fingerprintMiddleware).
 * Controllers must pass ctx explicitly — no raw req.ip / req.headers access here.
 */

const Session = require('../models/session');
const trackingService = require('./trackingService');
const logger = require('../utils/logger');
const HttpError = require('../utils/httpError');
const { v4: uuidv4 } = require('uuid');

// ── Lifecycle ──────────────────────────────────────────────────────────────────

/**
 * Open a new session.
 *
 * @param {Object} ctx         req.context (from fingerprintMiddleware)
 * @param {Object} sessionData { sessionId?, userId?, anonymousId?, entryPage? }
 * @returns {Promise<import('../models/session')>}
 */
exports.startSession = async (ctx, sessionData = {}) => {
  const sessionId = sessionData.sessionId || uuidv4();

  const session = new Session({
    sessionId,
    userId: sessionData.userId || null,
    anonymousId: sessionData.anonymousId || null,

    startTime: ctx.timestamp || new Date(),
    lastActivityAt: ctx.timestamp || new Date(),

    // Device metadata from centralized fingerprint — authoritative
    browser: ctx.browser || 'Unknown',
    browserVersion: ctx.browserVersion || '',
    os: ctx.os || 'Unknown',
    osVersion: ctx.osVersion || '',
    deviceType: ctx.deviceType || 'desktop',
    deviceVendor: ctx.deviceVendor || '',
    deviceModel: ctx.deviceModel || '',
    userAgent: ctx.userAgent || '',

    // Network
    ipAddress: ctx.ipAddress || 'unknown',

    // Geo
    country: ctx.country || '',
    city: ctx.city || '',
    timezone: ctx.timezone || '',

    // Context
    referrer: ctx.referrer || '',
    entryPage: sessionData.entryPage || '',
    language: ctx.language || '',

    isActive: true,
  });

  await session.save();

  const identifier = sessionData.userId || sessionData.anonymousId || 'anon';
  logger.info(`[session] started=${sessionId} | user=${identifier} | device=${ctx.deviceType} | ip=${ctx.ipAddress}`);
  return session;
};

/**
 * Close an active session: compute duration, record final event count.
 * Idempotent — calling endSession on an already-ended or non-existent session is a no-op.
 *
 * This is important because the frontend uses navigator.sendBeacon() which has no
 * error handling. We gracefully handle stale session IDs (e.g., after session cleanup).
 *
 * @param {string} sessionId
 * @returns {Promise<import('../models/session')|null>}
 */
exports.endSession = async (sessionId) => {
  const session = await Session.findOne({ sessionId });
  if (!session) {
    logger.warn(`[session] endSession called on non-existent session=${sessionId} — likely cleaned up or stale`);
    return null; // Graceful: don't error on stale session IDs (sendBeacon compatibility)
  }

  // Idempotent: already ended sessions are returned as-is
  if (!session.isActive) {
    logger.info(`[session] ${sessionId} already ended — no-op`);
    return session;
  }

  const endTime = new Date();
  const duration = endTime - session.startTime;

  // Count events for this session from the events collection
  const eventCount = await require('../models/event').countDocuments({ sessionId });

  session.endTime = endTime;
  session.duration = duration;
  session.eventCount = eventCount;
  session.isActive = false;
  await session.save();

  logger.info(`[session] ended=${sessionId} | duration=${duration}ms | events=${eventCount}`);
  return session;
};

/**
 * Touch lastActivityAt — used by the session-cleanup job and trackingService
 * when a standalone activity signal arrives without a new event.
 *
 * @param {string} sessionId
 * @param {Date}   [at]
 */
exports.updateLastActivity = async (sessionId, at) => {
  await Session.findOneAndUpdate(
    { sessionId, isActive: true },
    { $set: { lastActivityAt: at || new Date() } }
  );
};

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Fetch a single session document by its sessionId.
 */
exports.getSessionById = async (sessionId) => {
  return Session.findOne({ sessionId });
};

/**
 * List sessions for either an authenticated user or an anonymous visitor.
 *
 * @param {string|null}  userId
 * @param {string|null}  anonymousId
 * @param {boolean}      activeOnly
 */
exports.getSessionsByUser = async (userId = null, anonymousId = null, activeOnly = false) => {
  const query = {};
  if (userId) query.userId = userId;
  if (anonymousId) query.anonymousId = anonymousId;
  if (activeOnly) query.isActive = true;
  return Session.find(query).sort({ startTime: -1 });
};

// ── Legacy alias ───────────────────────────────────────────────────────────────

/**
 * @deprecated Use updateLastActivity() instead.
 */
exports.updateEventCount = async (sessionId, count) => {
  return Session.findOneAndUpdate(
    { sessionId },
    { eventCount: count },
    { new: true }
  );
};
