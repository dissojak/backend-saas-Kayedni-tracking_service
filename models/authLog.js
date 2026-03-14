const mongoose = require('mongoose');

/**
 * AuthLog schema — dedicated collection for all auth-related events.
 *
 * Security philosophy:
 *  - Completely separate from the generic events collection so security queries
 *    run on a dedicated, smaller dataset with tight indexes.
 *  - Stores enough information to detect brute-force and credential-stuffing
 *    attacks without scanning the full events collection.
 *  - All network/device fields are injected server-side from fingerprintMiddleware.
 *    The old `ip` field has been renamed to `ipAddress` for consistency across
 *    every collection in this service (sessions, events, auth_logs).
 *
 * Security signals:
 *  - riskScore     : computed 0–100 severity score (set by authLogService)
 *  - isSuspicious  : flag set when threshold-based rules fire
 *  - attemptNumber : consecutive attempt count for this email+IP combination
 */
const authLogSchema = new mongoose.Schema(
  {
    // ── What happened ────────────────────────────────────────────────────────
    action: {
      type: String,
      required: true,
      enum: [
        'login_attempt',
        'login_success',
        'login_failed',
        'signup_attempt',
        'signup_success',
        'signup_failed',
        'signup_validation_error',
        'forgot_password_requested',
        'forgot_password_failed',
        'reset_password_success',
        'reset_password_failed',
        'logout',
      ],
      index: true,
    },

    // Auth outcome — null for attempt events (outcome unknown at log time)
    success: {
      type: Boolean,
      default: null,
      index: true,
    },

    // Failure details
    failReason: {
      type: String,
      default: null,
    },
    failStage: {
      type: String,
      enum: ['validation', 'api', 'network_error', null],
      default: null,
    },

    // ── User identity ─────────────────────────────────────────────────────────
    email: {
      type: String,
      default: null,
      index: true,
    },
    // Domain stored separately for privacy-safe aggregate queries (e.g. gmail.com attack trends)
    emailDomain: {
      type: String,
      default: null,
      index: true,
    },
    role: {
      type: String,
      default: null,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },

    // ── Network / device fingerprint (server-side, from fingerprintMiddleware) ──
    // Field is `ipAddress` — consistent with sessions and events collections.
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    browser: {
      type: String,
      default: null,
    },
    browserVersion: {
      type: String,
      default: null,
    },
    os: {
      type: String,
      default: null,
    },
    osVersion: {
      type: String,
      default: null,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'bot', null],
      default: null,
    },

    // ── Geo (populated by GeoIP service) ──────────────────────────────────────
    country: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },

    // ── Security scoring ──────────────────────────────────────────────────────
    /**
     * 0–100 risk score computed at write time by authLogService.computeRiskScore().
     * Factors: consecutive failures, known bot UA, unusual country, etc.
     */
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    /**
     * Quick boolean flag — set to true when security rules trigger.
     * Makes dashboard queries trivially cheap with a covering index.
     */
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true,
    },
    /**
     * Consecutive failed attempts for this email+IP pair at write time.
     * Lets the frontend / alerting system know how severe the situation is
     * without running a separate COUNT query.
     */
    attemptNumber: {
      type: Number,
      default: 1,
    },

    // ── Extra context ─────────────────────────────────────────────────────────
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true, collection: 'auth_logs' }
);

// ── Compound indexes for brute-force / security queries ──────────────────────

// Core security: failed logins from same IP in a time window → brute force
authLogSchema.index({ ipAddress: 1, success: 1, timestamp: -1 });

// Credential stuffing: same email attacked from many IPs
authLogSchema.index({ email: 1, success: 1, timestamp: -1 });

// Action breakdown by IP
authLogSchema.index({ action: 1, ipAddress: 1, timestamp: -1 });

// Admin dashboard: all recent failures sorted by time
authLogSchema.index({ success: 1, timestamp: -1 });

// Suspicious event queue
authLogSchema.index({ isSuspicious: 1, timestamp: -1 });

// High-risk triage
authLogSchema.index({ riskScore: -1, timestamp: -1 });

// ── TTL: auto-delete auth logs older than 1 year ─────────────────────────────
// Uncomment once your data-retention policy is confirmed:
// authLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

module.exports = mongoose.model('AuthLog', authLogSchema);
