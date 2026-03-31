const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function authMiddleware(req, res, next) {
  // When disabled, keep current frontend flow unbroken.
  if (!process.env.ENABLE_AUTH_MIDDLEWARE || process.env.ENABLE_AUTH_MIDDLEWARE === "false") {
    return next();
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return errorResponse(res, 401, "Missing Bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return errorResponse(res, 401, "Invalid or expired auth token");
  }

  req.user = data.user;
  return next();
}

module.exports = { authMiddleware };
