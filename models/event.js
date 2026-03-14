const mongoose = require('mongoose');

/**
 * Event schema — lightweight behavioural events.
 *
 * Events are intentionally lean: they store the minimum needed for analytics.
 * Device metadata is flattened (no nested sub-documents) for efficient index usage.
 * All context fields are injected by the server via req.context from
 * fingerprintMiddleware — never duplicated from the client payload.
 */
const eventSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    userId: {
      type: String,
      default: null,
      index: true,
      description: 'Authenticated user ID (null for anonymous)',
    },
    anonymousId: {
      type: String,
      default: null,
      index: true,
      description: 'Persistent anonymous UUID from the client SDK',
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
      description: 'Parent session identifier',
    },

    // ── Event payload ──────────────────────────────────────────────────────────
    eventType: {
      type: String,
      required: true,
      enum: [
        'page_view',
        'click',
        'search',
        'search_query',
        'business_view',
        'business_impression',
        'service_view',
        'booking_started',
        'booking_completed',
        'booking_abandoned',
        'review_submitted',
        'review_read',
        'category_browsed',
        'scroll_depth',
        'time_on_page',
        'filter_used',
        'sort_used',
        'outbound_click',
        'click_phone',
        'click_location',
        'favorite_action',
        'login',
        'signup',
        'logout',
        'profile_update',
        'testimonial_section_view',
        'testimonial_business_click',
        'login_attempt',
        'login_failed',
        'signup_validation_error',
        'signup_failed',
        'forgot_password_requested',
        'forgot_password_failed',
        'reset_password_completed',
        'reset_password_failed',
      ],
      index: true,
    },
    page: {
      type: String,
      default: '',
      description: 'Page path or route e.g. /search, /business/123',
    },
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Custom properties specific to the event type',
    },

    // ── Device metadata (server-injected via fingerprintMiddleware) ────────────
    ipAddress: {
      type: String,
      default: 'unknown',
      description: 'Real client IP (proxy-aware)',
    },
    userAgent: {
      type: String,
      default: '',
      description: 'Raw User-Agent header (for forensics / replay)',
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    browserVersion: {
      type: String,
      default: '',
    },
    os: {
      type: String,
      default: 'Unknown',
    },
    osVersion: {
      type: String,
      default: '',
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'bot'],
      default: 'desktop',
    },

    // ── Geo (populated by GeoIP service) ─────────────────────────────────────
    country: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },

    // ── Timing ───────────────────────────────────────────────────────────────
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true, collection: 'events' }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Core analytics queries
eventSchema.index({ sessionId: 1, timestamp: -1 });
eventSchema.index({ userId: 1, timestamp: -1 });
eventSchema.index({ anonymousId: 1, timestamp: -1 });
eventSchema.index({ eventType: 1, timestamp: -1 });

// Funnel analysis (e.g. booking conversion by device)
eventSchema.index({ eventType: 1, deviceType: 1, timestamp: -1 });

// Page-level analytics
eventSchema.index({ page: 1, timestamp: -1 });

// Geo / country analytics
eventSchema.index({ country: 1, eventType: 1, timestamp: -1 });

// ── TTL: auto-delete raw events older than 1 year ─────────────────────────────
// Aggregated profiles in userBehaviorProfiles preserve the summaries.
// Uncomment once your data-retention policy is confirmed:
// eventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

module.exports = mongoose.model('Event', eventSchema);
