/**
 * authLogService.js
 *
 * Centralized service for security / authentication event logging.
 *
 * Key changes from v1:
 *  - `ip` field renamed to `ipAddress` (consistent with sessions / events)
 *  - computeRiskScore() provides a 0–100 threat score at write time
 *  - saveLog() sets isSuspicious + attemptNumber automatically
 *  - All aggregation queries updated to use `ipAddress`
 *  - Never throws — auth logging must never break the primary auth flow
 */

const AuthLog = require('../models/authLog');
const logger = require('../utils/logger');

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractDomain(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1].toLowerCase();
}

/**
 * Compute a 0–100 risk score for a single auth event.
 * Higher = more suspicious.
 *
 * Scoring factors:
 *  - Failed action type          +30
 *  - Bot/script user-agent       +25
 *  - Recent failure count        up to +30 (3 pts per failure, capped)
 *  - Rapid repeated attempts     +15
 *
 * @param {Object} data
 * @param {number} recentFailCount  Failures for this email in the last 15 min
 */
function computeRiskScore(data, recentFailCount = 0) {
  let score = 0;

  // Failure signal
  if (data.success === false) score += 30;

  // Bot / scripted attack — these UA strings appear in authLogController's parseUA
  const botUA = /curl|python|go-http|java-bot|scrapy|wget/i;
  if (data.userAgent && botUA.test(data.userAgent)) score += 25;

  // Escalating penalty per recent failure (3 pts each, capped at 10 failures)
  score += Math.min(recentFailCount, 10) * 3;

  // Rapid fire (≥ 3 failures in window = suspicious)
  if (recentFailCount >= 3) score += 15;

  return Math.min(score, 100);
}

// ── Write path ─────────────────────────────────────────────────────────────────

/**
 * Save a single auth log entry.
 * Never throws — security logging must never interrupt the primary auth flow.
 *
 * @param {Object} data  Auth event data (from controller via req.context)
 */
exports.saveLog = async (data) => {
  try {
    // Count recent failures to compute risk score and attempt number
    const recentFailCount = data.email
      ? await exports.getFailedAttemptsByEmail(data.email, 15)
      : 0;

    const riskScore = computeRiskScore(data, recentFailCount);
    const isSuspicious = riskScore >= 45; // flag anything moderately risky

    const doc = new AuthLog({
      ...data,
      // Ensure ipAddress is always set (ctx.ipAddress is the authoritative source)
      ipAddress: data.ipAddress || 'unknown',
      emailDomain: data.email ? extractDomain(data.email) : null,
      riskScore,
      isSuspicious,
      attemptNumber: recentFailCount + 1,
    });

    await doc.save();

    if (isSuspicious) {
      logger.warn(
        `[authLog] ⚠️  Suspicious auth event | action=${data.action} | email=${data.email} | ip=${data.ipAddress} | score=${riskScore} | attempt=${recentFailCount + 1}`
      );
    }

    return doc;
  } catch (err) {
    logger.error('[authLog] Failed to save log:', err.message);
    return null; // intentionally swallow — auth flow must not break
  }
};

// ── Security queries ───────────────────────────────────────────────────────────

/**
 * IPs that exceeded the failed-login threshold in the last N minutes.
 * Primary brute-force detection query.
 *
 * @param {number} minutes    Look-back window (default 15)
 * @param {number} threshold  Minimum failure count to flag (default 10)
 */
exports.getSuspiciousIPs = async (minutes = 15, threshold = 10) => {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return AuthLog.aggregate([
    {
      $match: {
        success: false,
        action: { $in: ['login_failed', 'login_attempt'] },
        timestamp: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$ipAddress',
        failCount: { $sum: 1 },
        emails: { $addToSet: '$email' },
        userAgents: { $addToSet: '$userAgent' },
        countries: { $addToSet: '$country' },
        maxRiskScore: { $max: '$riskScore' },
        firstSeen: { $min: '$timestamp' },
        lastSeen: { $max: '$timestamp' },
      },
    },
    { $match: { failCount: { $gte: threshold } } },
    { $sort: { failCount: -1 } },
  ]);
};

/**
 * Failed attempts for a specific email in the last N minutes.
 * Used for per-account lockout decisions and risk scoring.
 *
 * @param {string} email
 * @param {number} minutes
 */
exports.getFailedAttemptsByEmail = async (email, minutes = 15) => {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return AuthLog.countDocuments({
    email,
    success: false,
    action: 'login_failed',
    timestamp: { $gte: since },
  });
};

/**
 * Recent auth logs with optional filters.
 * Note: `ip` param is now named `ipAddress` for API consistency.
 */
exports.getRecentLogs = async ({
  action,
  success,
  ipAddress,
  email,
  limit = 100,
  skip = 0,
} = {}) => {
  const filter = {};
  if (action) filter.action = action;
  if (success !== undefined) filter.success = success;
  if (ipAddress) filter.ipAddress = ipAddress;
  if (email) filter.email = email;

  return AuthLog.find(filter)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Activity breakdown for the last N hours.
 * Used by the admin dashboard summary endpoint.
 */
exports.getActivitySummary = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return AuthLog.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: { action: '$action', success: '$success' },
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$riskScore' },
        suspiciousCount: { $sum: { $cond: ['$isSuspicious', 1, 0] } },
      },
    },
    { $sort: { '_id.action': 1 } },
  ]);
};
