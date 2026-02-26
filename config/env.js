const dotenv = require('dotenv');
dotenv.config();

const requiredVars = ['PORT', 'MONGODB_URI', 'API_KEY'];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

module.exports = process.env;
