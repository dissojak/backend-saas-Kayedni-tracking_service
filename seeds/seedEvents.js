const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const Event = require('../models/event');
const Session = require('../models/session');
const UserBehaviorProfile = require('../models/userBehaviorProfile');
const profileAggregator = require('../services/profileAggregator');
const connectDB = require('../config/db');
const logger = require('../utils/logger');

dotenv.config();

// Sample data
const USERS = ['1', '2', '3', '4', '5']; // Numeric user IDs from Spring Boot
const PAGES = [
  '/home',
  '/search',
  '/business/100',
  '/business/101',
  '/business/102',
  '/booking',
  '/profile',
  '/reviews',
];
const EVENT_TYPES = [
  'page_view',
  'click',
  'search',
  'search_query',
  'business_view',
  'business_impression',
  'service_view',
  'booking_started',
  'review_submitted',
  'review_read',
  'category_browsed',
  'scroll_depth',
  'time_on_page',
  'filter_used',
  'click_phone',
  'click_location',
  'favorite_action',
  'slice_landing_view',
  'slice_landing_cta_click',
  'industry_feedback_submitted',
  'industry_feedback_failed',
];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge'];
const OS_TYPES = ['macOS', 'Windows', 'iOS', 'Android'];
const DEVICE_TYPES = ['desktop', 'tablet', 'mobile'];

/**
 * Generate random integer between min and max
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generate random element from array
 */
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate fake session
 */
const generateSession = (userId) => {
  const startTime = new Date(Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000);
  const duration = randomInt(60000, 3600000); // 1 min to 1 hour
  const endTime = new Date(startTime.getTime() + duration);

  return {
    sessionId: uuidv4(),
    userId,
    startTime,
    endTime,
    duration,
    eventCount: randomInt(5, 50),
    browser: randomElement(BROWSERS),
    os: randomElement(OS_TYPES),
    deviceType: randomElement(DEVICE_TYPES),
    ipAddress: `192.168.1.${randomInt(1, 255)}`,
    isActive: false,
  };
};

/**
 * Generate fake event
 */
const generateEvent = (userId, sessionId, sessionStartTime) => {
  const eventTime = new Date(
    sessionStartTime.getTime() + randomInt(0, 3600000) // Within 1 hour of session start
  );

  const eventType = randomElement(EVENT_TYPES);
  let properties = {};

  // Generate type-specific properties
  if (eventType === 'business_view' || eventType === 'business_impression') {
    properties.businessId = randomInt(100, 102).toString();
  } else if (eventType === 'search' || eventType === 'search_query') {
    properties.query = ['haircut', 'massage', 'restaurant', 'spa', 'dentist'][randomInt(0, 4)];
  } else if (eventType === 'booking_started') {
    properties.businessId = randomInt(100, 102).toString();
    properties.serviceId = randomInt(1, 5).toString();
  } else if (eventType === 'service_view') {
    properties.businessId = randomInt(100, 102).toString();
    properties.serviceId = randomInt(1, 5).toString();
  } else if (eventType === 'review_read') {
    properties.businessId = randomInt(100, 102).toString();
    properties.reviewId = randomInt(1000, 9999).toString();
  } else if (eventType === 'review_submitted') {
    properties.businessId = randomInt(100, 102).toString();
    properties.rating = randomInt(1, 5);
    properties.reviewLength = randomInt(50, 500);
  } else if (eventType === 'category_browsed') {
    properties.categoryId = randomInt(1, 10).toString();
    properties.categoryName = ['haircut', 'spa', 'restaurant', 'beauty'][randomInt(0, 3)];
  } else if (eventType === 'scroll_depth') {
    properties.depth = randomInt(25, 100);
    properties.maxDepth = randomInt(properties.depth, 100);
  } else if (eventType === 'time_on_page') {
    properties.duration = randomInt(5, 300);
  } else if (eventType === 'filter_used') {
    properties.filterType = ['price', 'rating', 'distance', 'time'][randomInt(0, 3)];
    properties.filterValue = randomInt(1, 100).toString();
  } else if (eventType === 'click_phone') {
    properties.businessId = randomInt(100, 102).toString();
    properties.phoneNumber = `+1${randomInt(100, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`;
  } else if (eventType === 'click_location') {
    properties.businessId = randomInt(100, 102).toString();
    properties.latitude = (randomInt(40, 41) + Math.random()).toFixed(4);
    properties.longitude = (randomInt(-74, -73) + Math.random()).toFixed(4);
  } else if (eventType === 'favorite_action') {
    properties.businessId = randomInt(100, 102).toString();
    properties.action = ['add', 'remove'][randomInt(0, 1)];
  } else if (eventType === 'slice_landing_view') {
    properties.slice = ['barber', 'salon', 'beauty&hairstyling'][randomInt(0, 2)];
    properties.source = 'route';
  } else if (eventType === 'slice_landing_cta_click') {
    properties.slice = ['barber', 'salon', 'beauty&hairstyling'][randomInt(0, 2)];
    properties.cta = ['launch', 'browse'][randomInt(0, 1)];
  } else if (eventType === 'industry_feedback_submitted' || eventType === 'industry_feedback_failed') {
    properties.source = 'signup';
    properties.slice = ['generic', 'barber', 'salon', 'beauty&hairstyling'][randomInt(0, 3)];
  }

  return {
    userId,
    sessionId,
    eventType,
    page: randomElement(PAGES),
    properties,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    ipAddress: `192.168.1.${randomInt(1, 255)}`,
    timestamp: eventTime,
  };
};

/**
 * Seed the database with demo data
 */
const seed = async () => {
  try {
    logger.info('Connecting to database...');
    await connectDB();

    logger.info('Clearing existing data...');
    await Event.deleteMany({});
    await Session.deleteMany({});
    await UserBehaviorProfile.deleteMany({});

    const events = [];
    const sessions = [];

    logger.info(`Generating demo data for ${USERS.length} users...`);

    // Generate data for each user
    for (const userId of USERS) {
      const userSessions = randomInt(3, 8); // 3-8 sessions per user

      for (let i = 0; i < userSessions; i++) {
        const session = generateSession(userId);
        sessions.push(session);

        // Generate events for this session
        const eventCount = session.eventCount;
        for (let j = 0; j < eventCount; j++) {
          const event = generateEvent(userId, session.sessionId, session.startTime);
          events.push(event);
        }
      }
    }

    logger.info(`Saving ${sessions.length} sessions...`);
    const savedSessions = await Session.insertMany(sessions);

    logger.info(`Saving ${events.length} events...`);
    const savedEvents = await Event.insertMany(events);

    logger.info('Running profile aggregation...');
    const aggregationResult = await profileAggregator.aggregateProfiles();
    logger.info(`  - Profiles aggregated: ${aggregationResult.successCount} succeeded, ${aggregationResult.errorCount} failed`);

    logger.info(`✅ Seed completed!`);
    logger.info(`  - Sessions: ${savedSessions.length}`);
    logger.info(`  - Events: ${savedEvents.length}`);

    await mongoose.connection.close();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
};

// Run seed if executed directly
if (require.main === module) {
  seed();
}

module.exports = { seed };
