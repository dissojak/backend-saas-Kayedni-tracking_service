const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      description: 'Unique session identifier (UUID)',
    },
    userId: {
      type: String,
      default: null,
      index: true,
      description: 'Numeric user ID from Spring Boot backend (null for anonymous)',
    },
    anonymousId: {
      type: String,
      default: null,
      index: true,
      description: 'UUID for tracking anonymous users',
    },
    startTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
      description: 'When the session ended (null if ongoing)',
    },
    duration: {
      type: Number,
      default: 0,
      description: 'Duration in milliseconds',
    },
    eventCount: {
      type: Number,
      default: 0,
      description: 'Number of events in this session',
    },
    browser: {
      type: String,
      description: 'Browser name (e.g., Chrome, Safari)',
    },
    os: {
      type: String,
      description: 'Operating system (e.g., macOS, Windows)',
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile'],
      description: 'Device type',
    },
    ipAddress: String,
    referrer: {
      type: String,
      description: 'Page referrer if available',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      description: 'Whether the session is still active',
    },
  },
  { timestamps: true, collection: 'sessions' }
);

// Index for querying active sessions by userId
sessionSchema.index({ userId: 1, isActive: 1 });
// Index for anonymous sessions
sessionSchema.index({ anonymousId: 1, isActive: 1 });

module.exports = mongoose.model('Session', sessionSchema);
