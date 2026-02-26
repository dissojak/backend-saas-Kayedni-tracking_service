const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
      index: true,
      description: 'Numeric user ID from Spring Boot backend (null for anonymous users)',
    },
    anonymousId: {
      type: String,
      default: null,
      index: true,
      description: 'UUID for tracking anonymous users',
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
      description: 'Unique session identifier',
    },
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
      ],
      index: true,
    },
    page: {
      type: String,
      description: 'Page path or route (e.g., /search, /business/123)',
    },
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Custom properties specific to event type',
    },
    userAgent: String,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true, collection: 'events' }
);

// Index for querying by userId and timestamp range
eventSchema.index({ userId: 1, timestamp: -1 });
// Index for anonymous tracking
eventSchema.index({ anonymousId: 1, timestamp: -1 });

module.exports = mongoose.model('Event', eventSchema);
