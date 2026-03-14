/**
 * authLogController.js
 *
 * HTTP handlers for the auth security logging endpoints.
 *
 * Changes from v1:
 *  - Removed duplicate parseUA() and normalizeIP() helpers — replaced by
 *    fingerprintMiddleware which sets req.context on every request.
 *  - All IP / device fields now read from req.context (the single source of truth).
 *  - `ip` renamed to `ipAddress` everywhere for consistency.
 *  - getRecentLogs query param renamed from `ip` to `ipAddress`.
 */

const authLogService = require('../services/authLogService');
const logger = require('../utils/logger');

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth-logs
 * Receive an auth event from the frontend and persist it with enriched
 * server-side network / device data from req.context.
 */
exports.logAuthEvent = async (req, res, next) => {
  try {
    const ctx = req.context; // set by fingerprintMiddleware

    const {
      action,
      success,
      failReason,
      failStage,
      email,
      role,
      userId,
      sessionId,
      metadata,
    } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'action is required' });
    }

    // Coerce success to Boolean — frontend may send strings
    const successValue =
      success === true || success === 'true'
        ? true
        : success === false || success === 'false'
        ? false
        : null;

    const savedLog = await authLogService.saveLog({
      action,
      success: successValue,
      failReason: failReason || null,
      failStage: failStage || null,
      email: email ? email.toLowerCase().trim() : null,
      role: role || null,
      userId: userId ? String(userId) : null,
      sessionId: sessionId || null,

      // ── All device / network fields from centralized context ──────────────
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      browser: ctx.browser,
      browserVersion: ctx.browserVersion,
      os: ctx.os,
      osVersion: ctx.osVersion,
      deviceType: ctx.deviceType,
      country: ctx.country,
      city: ctx.city,

      metadata: metadata || {},
    });

    return res.status(201).json({ success: true, id: savedLog?._id || null });
  } catch (err) {
    logger.error('[authLog] Controller error:', err.message);
    next(err);
  }
};

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/auth-logs
 * List recent auth logs (admin use).
 * Query params: action, success, ipAddress, email, limit, skip
 */
exports.getRecentLogs = async (req, res, next) => {
  try {
    const { action, success, ipAddress, email, limit = 100, skip = 0 } = req.query;

    const logs = await authLogService.getRecentLogs({
      action,
      success: success === undefined ? undefined : success === 'true',
      ipAddress, // prev: `ip` — renamed for consistency
      email,
      limit: Math.min(Number(limit), 500),
      skip: Number(skip),
    });

    return res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth-logs/suspicious
 * Return IPs that exceeded the brute-force threshold.
 * Query params: minutes (default 15), threshold (default 10)
 */
exports.getSuspiciousIPs = async (req, res, next) => {
  try {
    const minutes = Number(req.query.minutes) || 15;
    const threshold = Number(req.query.threshold) || 10;
    const results = await authLogService.getSuspiciousIPs(minutes, threshold);
    return res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth-logs/summary
 * Activity breakdown for the last N hours.
 * Query params: hours (default 24)
 */
exports.getActivitySummary = async (req, res, next) => {
  try {
    const hours = Number(req.query.hours) || 24;
    const summary = await authLogService.getActivitySummary(hours);
    return res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};
