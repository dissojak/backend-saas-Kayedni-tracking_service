const dotenv = require('dotenv');
dotenv.config();

const requiredVars = ['PORT', 'MONGODB_URI', 'API_KEY'];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

const snapshotSyncEnabled = process.env.PROFILE_SNAPSHOT_SYNC_ENABLED === 'true';

if (snapshotSyncEnabled && !process.env.MYSQL_SYNC_DATABASE_URL) {
  throw new Error('Missing required env var: MYSQL_SYNC_DATABASE_URL');
}

module.exports = process.env;
