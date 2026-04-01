const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

function requireAdmin(req, res, next) {
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!adminJwtSecret) {
    return errorResponse(res, 500, "Server misconfiguration: ADMIN_JWT_SECRET is required");
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return errorResponse(res, 401, "Missing admin Bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const payload = jwt.verify(token, adminJwtSecret);
    if (payload.role !== "admin") {
      return errorResponse(res, 403, "Admin role required");
    }
    req.admin = payload;
    return next();
  } catch (_e) {
    return errorResponse(res, 401, "Invalid or expired admin token");
  }
}

module.exports = { requireAdmin };
