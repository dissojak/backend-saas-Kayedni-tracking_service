const UserBehaviorProfile = require('../models/userBehaviorProfile');
const logger = require('../utils/logger');
const { getPool, isSnapshotSyncEnabled } = require('../config/mysqlSync');

function isEnabled() {
  return isSnapshotSyncEnabled();
}

async function getLatestSuccessfulCursor(connection) {
  const [rows] = await connection.execute(
    `SELECT source_updated_through
       FROM profile_snapshot_sync_runs
      WHERE status = 'SUCCESS'
        AND source_updated_through IS NOT NULL
      ORDER BY ended_at DESC
      LIMIT 1`
  );

  return rows[0]?.source_updated_through || null;
}

async function createRun(connection, triggeredBy) {
  const [result] = await connection.execute(
    `INSERT INTO profile_snapshot_sync_runs (
      started_at,
      status,
      triggered_by,
      synced_count,
      failed_count,
      created_at,
      updated_at
    ) VALUES (NOW(), 'RUNNING', ?, 0, 0, NOW(), NOW())`,
    [triggeredBy]
  );

  return result.insertId;
}

async function finalizeRun(connection, runId, payload) {
  await connection.execute(
    `UPDATE profile_snapshot_sync_runs
        SET ended_at = NOW(),
            status = ?,
            synced_count = ?,
            failed_count = ?,
            source_updated_through = ?,
            error_summary = ?,
            updated_at = NOW()
      WHERE id = ?`,
    [
      payload.status,
      payload.syncedCount,
      payload.failedCount,
      payload.sourceUpdatedThrough,
      payload.errorSummary,
      runId,
    ]
  );
}

function serializeProfile(profile) {
  return JSON.stringify(profile.toObject({ flattenMaps: true }));
}

async function fetchProfilesToSync(cursor) {
  const query = { userId: { $ne: null } };

  if (cursor) {
    query.lastAggregatedAt = { $gt: new Date(cursor) };
  }

  return UserBehaviorProfile.find(query).sort({ lastAggregatedAt: 1 });
}

async function upsertSnapshot(connection, profile) {
  await connection.execute(
    `INSERT INTO user_behavior_profile_snapshots (
      user_id,
      profile_json,
      source_last_updated_at,
      synced_at,
      snapshot_version,
      stale,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, NOW(), 1, FALSE, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      profile_json = VALUES(profile_json),
      source_last_updated_at = VALUES(source_last_updated_at),
      synced_at = VALUES(synced_at),
      snapshot_version = VALUES(snapshot_version),
      stale = FALSE,
      updated_at = NOW()`,
    [profile.userId, serializeProfile(profile), profile.lastAggregatedAt || profile.updatedAt || null]
  );
}

async function runSync(triggeredBy = 'cron') {
  if (!isEnabled()) {
    return {
      enabled: false,
      message: 'Profile snapshot sync is disabled',
    };
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  let runId = null;

  try {
    const cursor = await getLatestSuccessfulCursor(connection);
    runId = await createRun(connection, triggeredBy);
    const profiles = await fetchProfilesToSync(cursor);

    let syncedCount = 0;
    let failedCount = 0;
    let latestSourceUpdatedThrough = cursor;
    const failures = [];

    for (const profile of profiles) {
      try {
        await upsertSnapshot(connection, profile);
        syncedCount += 1;
        if (profile.lastAggregatedAt && (!latestSourceUpdatedThrough || profile.lastAggregatedAt > latestSourceUpdatedThrough)) {
          latestSourceUpdatedThrough = profile.lastAggregatedAt;
        }
      } catch (err) {
        failedCount += 1;
        failures.push({ userId: profile.userId, message: err.message });
        logger.error(`[profileSnapshotSync] user=${profile.userId}`, err.message);
      }
    }

    let status = 'SUCCESS';
    if (failedCount > 0) {
      status = syncedCount > 0 ? 'PARTIAL' : 'FAILED';
    }
    const errorSummary = failures.length > 0 ? JSON.stringify(failures.slice(0, 20)) : null;

    await finalizeRun(connection, runId, {
      status,
      syncedCount,
      failedCount,
      sourceUpdatedThrough: latestSourceUpdatedThrough || null,
      errorSummary,
    });

    return {
      enabled: true,
      runId,
      status,
      syncedCount,
      failedCount,
      sourceUpdatedThrough: latestSourceUpdatedThrough || null,
    };
  } catch (err) {
    if (runId) {
      await finalizeRun(connection, runId, {
        status: 'FAILED',
        syncedCount: 0,
        failedCount: 1,
        sourceUpdatedThrough: null,
        errorSummary: err.message,
      });
    }

    logger.error('[profileSnapshotSync] fatal error', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

async function getLatestRunStatus() {
  if (!isEnabled()) {
    return {
      enabled: false,
      message: 'Profile snapshot sync is disabled',
    };
  }

  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, started_at, ended_at, status, triggered_by, synced_count, failed_count,
            source_updated_through, error_summary, alert_sent_at
       FROM profile_snapshot_sync_runs
      ORDER BY created_at DESC
      LIMIT 1`
  );

  return {
    enabled: true,
    latestRun: rows[0] || null,
  };
}

module.exports = {
  getLatestRunStatus,
  isEnabled,
  runSync,
};