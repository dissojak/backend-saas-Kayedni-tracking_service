const mongoose = require('mongoose');

/**
 * Session schema — represents a single browsing session.
 *
 * A session is opened by the frontend SDK (startSession) and closed either
 * by an explicit endSession call or by the session-cleanup job after inactivity.
 *
 * All device / network metadata is populated from the centralized
 * fingerprintMiddleware via req.context — never trust client-supplied values.
 */
const sessionSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      description: 'Unique session identifier (UUID v4)',
    },
    userId: {
      type: String,
      default: null,
      index: true,
      description: 'Authenticated user ID (null for anonymous sessions)',
    },
    anonymousId: {
      type: String,
      default: null,
      index: true,
      description: 'Persistent anonymous UUID set by the client SDK',
    },

    // ── Timing ───────────────────────────────────────────────────────────────
    startTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      description: 'Updated on every new event — used for inactivity detection',
    },
    endTime: {
      type: Date,
      default: null,
      description: 'Wall-clock time when the session was explicitly closed',
    },
    duration: {
      type: Number,
      default: 0,
      description: 'Computed session duration in milliseconds (endTime - startTime)',
    },
    eventCount: {
      type: Number,
      default: 0,
      description: 'Running count of events recorded in this session',
    },

    // ── Device metadata (server-parsed via fingerprintMiddleware) ────────────
    browser: {
      type: String,
      default: 'Unknown',
      description: 'Browser name e.g. Chrome, Firefox, Safari',
    },
    browserVersion: {
      type: String,
      default: '',
      description: 'Browser version string e.g. 120.0.0.0',
    },
    os: {
      type: String,
      default: 'Unknown',
      description: 'Operating system e.g. macOS, Windows, Android',
    },
    osVersion: {
      type: String,
      default: '',
      description: 'OS version string',
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile', 'bot'],
      default: 'desktop',
      description: 'Classified device form factor',
    },
    deviceVendor: {
      type: String,
      default: '',
      description: 'Device manufacturer e.g. Apple, Samsung',
    },
    deviceModel: {
      type: String,
      default: '',
      description: 'Device model e.g. iPhone, Galaxy S21',
    },
    userAgent: {
      type: String,
      default: '',
      description: 'Raw User-Agent header stored for forensic replay',
    },

    // ── Network ──────────────────────────────────────────────────────────────
    ipAddress: {
      type: String,
      default: 'unknown',
      description: 'Real client IP (proxy-aware, extracted server-side)',
    },

    // ── Geo (populated by GeoIP service) ─────────────────────────────────────
    country: {
      type: String,
      default: '',
      description: 'ISO 3166-1 alpha-2 country code e.g. US, GB',
    },
    city: {
      type: String,
      default: '',
      description: 'City name resolved from IP',
    },
    timezone: {
      type: String,
      default: '',
      description: 'IANA timezone string e.g. America/New_York',
    },

    // ── Context ───────────────────────────────────────────────────────────────
    referrer: {
      type: String,
      default: '',
      description: 'HTTP Referer header at session start (traffic source)',
    },
    entryPage: {
      type: String,
      default: '',
      description: 'First page path visited in this session',
    },
    language: {
      type: String,
      default: '',
      description: 'Accept-Language first tag e.g. en-US',
    },

    // ── State ────────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      description: 'True while session is open; set to false on endSession',
    },
  },
  { timestamps: true, collection: 'sessions' }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Active sessions lookup (used by real-time dashboard)
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ anonymousId: 1, isActive: 1 });

// Time-series queries
sessionSchema.index({ startTime: -1 });
sessionSchema.index({ lastActivityAt: -1 });

// Device analytics
sessionSchema.index({ deviceType: 1, startTime: -1 });
sessionSchema.index({ country: 1, startTime: -1 });

// ── TTL: auto-delete sessions older than 90 days ─────────────────────────────
// Uncomment once your data-retention policy is confirmed:
// sessionSchema.index({ startTime: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('Session', sessionSchema);
