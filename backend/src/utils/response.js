const crypto = require("crypto");

function makeErrorId() {
  return crypto.randomUUID();
}

function errorResponse(res, statusCode, message, extra = {}) {
  const errorId = makeErrorId();
  return res.status(statusCode).json({
    ok: false,
    message,
    errorId,
    ...extra,
  });
}

module.exports = { makeErrorId, errorResponse };
