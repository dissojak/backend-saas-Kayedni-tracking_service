const mysql = require('mysql2/promise');

let pool;

function isSnapshotSyncEnabled() {
  return process.env.PROFILE_SNAPSHOT_SYNC_ENABLED === 'true';
}

function getPool() {
  if (!isSnapshotSyncEnabled()) {
    return null;
  }

  if (!pool) {
    const connectionUrl = process.env.MYSQL_SYNC_DATABASE_URL;

    if (!connectionUrl) {
      throw new Error('Missing required env var: MYSQL_SYNC_DATABASE_URL');
    }

    pool = mysql.createPool({
      uri: connectionUrl,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_SYNC_CONNECTION_LIMIT || 5),
      queueLimit: 0,
    });
  }

  return pool;
}

module.exports = {
  getPool,
  isSnapshotSyncEnabled,
};