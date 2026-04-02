const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");
const { supabase } = require("../services/supabaseService");

async function resolveAdminProfile(payload) {
  const normalized = String(payload?.username || "").trim().toLowerCase();

  if (payload?.userId) {
    const { data: byId } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, role")
      .eq("id", payload.userId)
      .maybeSingle();
    if (byId && byId.role === "admin") return byId;
  }

  if (normalized) {
    const { data: byEmail } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, role")
      .eq("email", normalized)
      .maybeSingle();
    if (byEmail && byEmail.role === "admin") return byEmail;
  }

  return null;
}

async function requireAdmin(req, res, next) {
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

    let adminProfile = null;
    try {
      adminProfile = await resolveAdminProfile(payload);
    } catch (_profileErr) {
      adminProfile = null;
    }

    req.admin = payload;
    req.adminProfile = adminProfile;
    req.isScopedAdmin = Boolean(adminProfile?.id);
    return next();
  } catch (_e) {
    return errorResponse(res, 401, "Invalid or expired admin token");
  }
}

module.exports = { requireAdmin };
