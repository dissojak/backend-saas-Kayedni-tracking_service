# Bookify Tracking Backend (Express)

Express microservice for behavioral tracking, sessions, auth-security logs, analytics aggregation, and profile snapshot synchronization.

## Tech Stack

- Node.js
- Express
- MongoDB (Mongoose)
- node-cron jobs
- Helmet, CORS, morgan
- MySQL (optional, for snapshot sync)

## What This Service Does

- Receives single and batch tracking events
- Manages visitor/user sessions and activity heartbeats
- Stores dedicated auth security logs
- Exposes analytics and profile insight endpoints
- Runs scheduled jobs for aggregation, cleanup, and optional snapshot sync

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB instance
- MySQL instance (optional, for snapshot sync)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Update `.env` values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@host/dbname?retryWrites=true&w=majority
API_KEY=your_api_key_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
PROFILE_SNAPSHOT_SYNC_ENABLED=false
PROFILE_SNAPSHOT_SYNC_CRON=0 * * * *
MYSQL_SYNC_DATABASE_URL=mysql://user:password@localhost:3306/bookify
MYSQL_SYNC_CONNECTION_LIMIT=5
```

Notes:

- `PORT`, `MONGODB_URI`, and `API_KEY` are required.
- If `PROFILE_SNAPSHOT_SYNC_ENABLED=true`, then `MYSQL_SYNC_DATABASE_URL` is required.

4. Start service:

```bash
npm run start
```

Default base URL: `http://localhost:5000`

## Scripts

- `npm run start`: Run service with nodemon.
- `npm run seed`: Seed sample event data.

## API Surface

All routes are mounted under `/api`:

- Tracking routes (`/api/track`)
  - `POST /` track one event
  - `POST /batch` track multiple events
- Session routes (`/api/session`)
  - `POST /start`
  - `PATCH /:id/end`
  - `POST /:id/end` (sendBeacon compatible)
  - `PATCH /:id/activity`
- Analytics routes (`/api/analytics`)
  - `GET /overview`
  - `GET /business/:id`
  - `GET /user/:id/profile`
  - `GET /profile-snapshots/status`
  - `POST /profile-snapshots/sync`
  - `GET /trends`
  - `POST /aggregate`
- Auth log routes (`/api/auth-logs`)
  - `POST /`
  - `GET /`
  - `GET /suspicious`
  - `GET /summary`

## Authentication and Headers

Protected routes require:

- Header `x-api-key: <API_KEY>`

CORS defaults to `http://localhost:3000` unless overridden by `CORS_ORIGIN`.

## Background Jobs

- Profile aggregation job
- Profile snapshot sync job
- Session cleanup job

Jobs are initialized at startup.

## Troubleshooting

- Missing env var error on startup:
  - Check `.env` for required keys.
- CORS issues from frontend:
  - Ensure `CORS_ORIGIN` matches frontend origin.
- Unauthorized responses:
  - Confirm `x-api-key` matches service `API_KEY`.
- Snapshot sync errors:
  - Verify MySQL connection URL and set `PROFILE_SNAPSHOT_SYNC_ENABLED=true` only when configured.
