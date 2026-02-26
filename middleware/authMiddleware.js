// authMiddleware.js
// API key validation middleware

const authMiddleware = (req, res, next) => {
  // Check header first (normal fetch requests)
  let apiKey = req.headers['x-api-key'];
  const validKey = process.env.API_KEY;

  if (!validKey) {
    // No API_KEY configured — allow in dev
    return next();
  }

  // Fallback: check body.apiKey for sendBeacon requests (sendBeacon cannot set custom headers)
  if (!apiKey && req.body && req.body.apiKey) {
    apiKey = req.body.apiKey;
  }

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid or missing API key' });
  }

  next();
};
module.exports = authMiddleware;
