const crypto = require("crypto");

function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const startedAt = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    // Simple structured log line for API tracing.
    console.log(
      JSON.stringify({
        requestId,
        method,
        path: originalUrl,
        statusCode: res.statusCode,
        durationMs,
      }),
    );
  });

  next();
}

module.exports = { requestLogger };
