const mongoose = require('mongoose');

/**
 * UserBehaviorProfile schema — aggregated behavioural summary per user.
 *
 * Populated by profileAggregationJob (hourly cron) using MongoDB aggregation
 * pipelines over the sessions and events collections.
 *
 * This document is a read-optimised projection — analytics dashboards query
 * this collection instead of scanning millions of raw events.
 */
const userBehaviorProfileSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    // Exactly one of userId / anonymousId is set.
    // sparse unique indexes allow multiple documents with the field absent.
    userId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      description: 'Authenticated user ID (absent for anonymous profiles)',
    },
    anonymousId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      description: 'Persistent anonymous UUID (absent for authenticated profiles)',
    },

    // ── Volume counters ───────────────────────────────────────────────────────
    totalEvents: {
      type: Number,
      default: 0,
      description: 'Cumulative count of all tracked events',
    },
    totalSessions: {
      type: Number,
      default: 0,
      description: 'Count of completed (ended) sessions',
    },

    // ── Session quality ───────────────────────────────────────────────────────
    avgSessionDuration: {
      type: Number,
      default: 0,
      description: 'Average session duration in milliseconds',
    },
    totalSessionDuration: {
      type: Number,
      default: 0,
      description: 'Sum of all session durations in milliseconds',
    },
    avgEventsPerSession: {
      type: Number,
      default: 0,
      description: 'Average number of events per session',
    },

    // ── Page & event preferences ──────────────────────────────────────────────
    favoritePages: {
      type: [String],
      default: [],
      description: 'Top 5 most-visited page paths',
    },
    topEventTypes: {
      type: Map,
      of: Number,
      default: () => new Map(),
      description: 'Event type → count breakdown',
    },

    // ── Device breakdown ──────────────────────────────────────────────────────
    deviceTypes: {
      type: Map,
      of: Number,
      default: () => new Map(),
      description: 'Device type → session count breakdown',
    },
    browserTypes: {
      type: Map,
      of: Number,
      default: () => new Map(),
      description: 'Browser name → event count breakdown',
    },

    // ── Geo breakdown ─────────────────────────────────────────────────────────
    countriesUsed: {
      type: Map,
      of: Number,
      default: () => new Map(),
      description: 'Country code → session count breakdown',
    },

    // ── Business-specific signals ─────────────────────────────────────────────
    lastSeenBusiness: {
      type: String,
      default: null,
      description: 'ID of the last business page viewed',
    },
    lastSeenBusinessAt: {
      type: Date,
      default: null,
      description: 'Timestamp of last business view',
    },

    // ── Recency ───────────────────────────────────────────────────────────────
    firstSeenAt: {
      type: Date,
      default: null,
      description: 'Timestamp of the very first tracked event',
    },
    lastActive: {
      type: Date,
      index: true,
      description: 'Timestamp of the most recent activity',
    },
    lastKnownIp: {
      type: String,
      default: null,
      description: 'Most recent IP address seen for this user',
    },

    // ── Aggregation metadata ──────────────────────────────────────────────────
    lastAggregatedAt: {
      type: Date,
      description: 'When this profile was last rebuilt by the aggregation job',
    },
  },
  { timestamps: true, collection: 'userBehaviorProfiles' }
);

// Inactivity sweep (find users inactive for > N days)
userBehaviorProfileSchema.index({ lastActive: 1 });

module.exports = mongoose.model('UserBehaviorProfile', userBehaviorProfileSchema);
