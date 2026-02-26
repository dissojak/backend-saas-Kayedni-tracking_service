const sessionService = require('../services/sessionService');
const logger = require('../utils/logger');
const HttpError = require('../utils/httpError');

/**
 * POST /api/session/start - Start a new session
 */
exports.startSession = async (req, res, next) => {
  try {
    const { sessionId, userId, anonymousId, browser, os, deviceType, ipAddress, referrer } = req.body;

    if (!userId && !anonymousId) {
      throw new HttpError('userId or anonymousId is required', 400);
    }

    // Normalize IPv6 loopback addresses to IPv4 for readability
    let clientIp = ipAddress || req.ip;
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      clientIp = '127.0.0.1';
    }

    const sessionData = {
      sessionId: sessionId || undefined, // if provided by frontend, use it; else service generates one
      userId: userId || null,
      anonymousId: anonymousId || null,
      browser: browser || 'unknown',
      os: os || 'unknown',
      deviceType: deviceType || 'desktop',
      ipAddress: clientIp,
      referrer: referrer || req.get('referer'),
    };

    const session = await sessionService.startSession(sessionData);
    res.status(201).json({ success: true, message: 'Session started', data: session });
  } catch (err) {
    logger.error('Error in startSession:', err.message);
    next(err);
  }
};

/**
 * PATCH /api/session/:id/end - End a session
 */
exports.endSession = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;

    if (!sessionId) {
      throw new HttpError('sessionId is required', 400);
    }

    const session = await sessionService.endSession(sessionId);
    res.status(200).json({ success: true, message: 'Session ended', data: session });
  } catch (err) {
    logger.error('Error in endSession:', err.message);
    next(err);
  }
};
