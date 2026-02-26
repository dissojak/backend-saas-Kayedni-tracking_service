const cron = require('node-cron');
const Session = require('../models/session');
const logger = require('../utils/logger');

/**
 * Session Cleanup CRON Job
 * Runs daily at midnight (0 0 * * *)
 * Closes sessions that have been inactive for more than 24 hours
 */
const scheduleSessionCleanup = () => {
  // Schedule: Every day at 00:00 (midnight)
  const job = cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Session cleanup job started');

      const now = new Date();
      const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

      // Find active sessions that started more than 24 hours ago
      const staleSessions = await Session.find({
        isActive: true,
        startTime: { $lt: twentyFourHoursAgo },
      });

      if (staleSessions.length === 0) {
        logger.info('No stale sessions found');
        return;
      }

      logger.info(`Found ${staleSessions.length} stale sessions, closing them...`);

      // Close all stale sessions
      const updateResult = await Session.updateMany(
        {
          isActive: true,
          startTime: { $lt: twentyFourHoursAgo },
        },
        {
          $set: {
            isActive: false,
            endTime: now,
          },
        }
      );

      logger.info(
        `Session cleanup job completed: ${updateResult.modifiedCount} sessions closed`
      );
    } catch (err) {
      logger.error('Session cleanup job failed:', err);
    }
  });

  logger.info('Session cleanup CRON job initialized (runs daily at midnight)');
  return job;
};

module.exports = { scheduleSessionCleanup };
