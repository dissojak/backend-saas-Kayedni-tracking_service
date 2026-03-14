/**
 * tracking/middleware/fingerprintMiddleware.js
 *
 * Attaches a normalized `req.context` object to EVERY incoming request.
 * All controllers, services, and validators read from this single source.
 *
 * req.context shape:
 * {
 *   requestId      : string   — unique per-request UUID (for distributed tracing)
 *   timestamp      : Date     — server-side request time
 *   ipAddress      : string   — real client IP (proxy-aware)
 *   userAgent      : string   — raw User-Agent header
 *   browser        : string   — e.g. "Chrome"
 *   browserVersion : string   — e.g. "120.0.0.0"
 *   os             : string   — e.g. "macOS"
 *   osVersion      : string   — e.g. "13.0"
 *   deviceType     : 'desktop'|'mobile'|'tablet'|'bot'
 *   deviceVendor   : string   — e.g. "Apple"
 *   deviceModel    : string   — e.g. "iPhone"
 *   language       : string   — first Accept-Language tag (e.g. "en-US")
 *   referrer       : string   — Referer header value
 *   // Geo fields are stubs — wire up a real geo service (MaxMind GeoIP2 / ipapi.co)
 *   country        : string   — ISO 3166-1 alpha-2 (populated by GeoIP)
 *   city           : string   — city name (populated by GeoIP)
 *   timezone       : string   — IANA timezone (populated by GeoIP)
 * }
 */

const { v4: uuidv4 } = require('uuid');
const { extractIP } = require('../utils/ipExtractor');
const { parseUserAgent } = require('../parsers/uaParser');

/**
 * Centralised request-context middleware.
 * Must be mounted BEFORE all route handlers in app.js.
 */
function fingerprintMiddleware(req, _res, next) {
  const ipAddress = extractIP(req);
  const rawUA = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(rawUA);

  // Accept-Language: "en-US,en;q=0.9" → "en-US"
  const language = (req.headers['accept-language'] || '').split(',')[0].trim() || 'unknown';

  // Referrer (handle both spellings sent by browsers)
  const referrer = (req.headers['referer'] || req.headers['referrer'] || '').trim();

  req.context = {
    requestId: uuidv4(),
    timestamp: new Date(),

    // Network
    ipAddress,

    // Device fingerprint
    userAgent: parsed.userAgent,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    deviceType: parsed.deviceType,
    deviceVendor: parsed.deviceVendor,
    deviceModel: parsed.deviceModel,

    // Request metadata
    language,
    referrer,

    // ── Geo enrichment stubs ─────────────────────────────────────────────────
    // These are intentionally empty strings.
    // Replace with a call to a GeoIP service (MaxMind / ipapi.co) to populate.
    // Example (async, add to a separate geoMiddleware):
    //   const geo = await geoLookup(ipAddress);
    //   req.context.country = geo.country_code;
    //   req.context.city    = geo.city;
    //   req.context.timezone = geo.timezone;
    country: '',
    city: '',
    timezone: '',
  };

  next();
}

module.exports = fingerprintMiddleware;
