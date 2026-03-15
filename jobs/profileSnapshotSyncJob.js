const cron = require('node-cron');
const logger = require('../utils/logger');
const profileSnapshotSyncService = require('../services/profileSnapshotSyncService');

const scheduleProfileSnapshotSync = () => {
  if (!profileSnapshotSyncService.isEnabled()) {
    logger.info('Profile snapshot sync job disabled');
    return null;
  }

  const isDev = process.env.NODE_ENV === 'development';
  const schedule = process.env.PROFILE_SNAPSHOT_SYNC_CRON || (isDev ? '0 * * * *' : '0 */4 * * *');

  const job = cron.schedule(schedule, async () => {
    try {
      logger.info('Profile snapshot sync job started');
      const result = await profileSnapshotSyncService.runSync('cron');
      logger.info(`Profile snapshot sync job completed: ${JSON.stringify(result)}`);
    } catch (err) {
      logger.error('Profile snapshot sync job failed:', err);
    }
  });

  logger.info(`Profile snapshot sync CRON job initialized (${schedule})`);
  return job;
};

module.exports = { scheduleProfileSnapshotSync };