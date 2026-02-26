const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Validate required environment variables
require('./config/env');

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { scheduleProfileAggregation } = require('./jobs/profileAggregationJob');
const { scheduleSessionCleanup } = require('./jobs/sessionCleanupJob');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  // Initialize CRON jobs
  scheduleProfileAggregation();
  scheduleSessionCleanup();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

start();
