class HttpError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.code = statusCode; // Keep for backwards compatibility
  }
}

module.exports = HttpError;
