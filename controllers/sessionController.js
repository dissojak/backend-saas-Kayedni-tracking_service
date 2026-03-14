/**
 * sessionController.js
 *
 * HTTP handlers for session lifecycle endpoints.
 * All device / network metadata comes from req.context (fingerprintMiddleware)
 * — controllers never read req.ip or req.headers for device info directly.
 */

const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');
const HttpError = require('../utils/httpError');

/**
 * POST /api/session/start
 * Open a new session. Device metadata is populated entirely from req.context.
 * The client only needs to provide identity (userId or anonymousId) and optional
 * entryPage / sessionId.
 */
exports.startSession = async (req, res, next) => {
  try {
    const ctx = req.context; // from fingerprintMiddleware
    const { sessionId, userId, anonymousId, entryPage } = req.body;

    if (!userId && !anonymousId) {
      throw new HttpError('userId or anonymousId is required', 400);
    }

    const session = await sessionService.startSession(ctx, {
      sessionId: sessionId || undefined,
      userId: userId || null,
      anonymousId: anonymousId || null,
      entryPage: entryPage || req.body.page || '',
    });

    res.status(201).json({ success: true, message: 'Session started', data: session });
  } catch (err) {
    logger.error('[session] startSession error:', err.message);
    next(err);
  }
};

/**
 * PATCH /api/session/:id/end
 * POST  /api/session/:id/end  (sendBeacon compat)
 * Close a session and record final duration + eventCount.
 * Idempotent: gracefully handles stale/non-existent sessions (sendBeacon never gets errors).
 */
exports.endSession = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    if (!sessionId) throw new HttpError('sessionId is required', 400);

    const session = await sessionService.endSession(sessionId);
    res.status(200).json({ 
      success: true, 
      message: 'Session ended', 
      data: session 
    });
  } catch (err) {
    logger.error('[session] endSession error:', err.message);
    next(err);
  }
};

/**
 * PATCH /api/session/:id/activity
 * Lightweight heartbeat — updates lastActivityAt without creating a full event.
 * Client sends this every ~30 s to prevent premature session expiry.
 */
exports.updateActivity = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    if (!sessionId) throw new HttpError('sessionId is required', 400);

    await sessionService.updateLastActivity(sessionId, req.context.timestamp);
    res.status(200).json({ success: true, message: 'Activity updated' });
  } catch (err) {
    logger.error('[session] updateActivity error:', err.message);
    next(err);
  }
};
