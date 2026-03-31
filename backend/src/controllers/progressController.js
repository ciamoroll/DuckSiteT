const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listProgress(_req, res) {
  try {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, first_name, last_name, xp, year_level, updated_at, profile_completed, role")
      .eq("role", "student")
      .order("updated_at", { ascending: false });
    if (userError) return errorResponse(res, 400, userError.message);

    const rows = (users || []).map((u) => {
      const xp = Number(u.xp || 0);
      const progress = Math.max(0, Math.min(100, Math.round((xp / 2000) * 100)));
      const status = progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Started";
      return {
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Student",
        module: u.year_level || "General Track",
        progress,
        status,
        last_updated: u.updated_at || null,
      };
    });

    return res.status(200).json({ ok: true, rows });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listProgress error", { error: err.message });
  }
}

async function getProgressSummary(_req, res) {
  try {
    const { data, error } = await supabase.from("users").select("xp, role").eq("role", "student");
    if (error) return errorResponse(res, 400, error.message);
    const total = (data || []).length;
    const completed = (data || []).filter((r) => Number(r.xp || 0) >= 2000).length;
    const inProgress = (data || []).filter((r) => Number(r.xp || 0) > 0 && Number(r.xp || 0) < 2000).length;
    const notStarted = total - completed - inProgress;
    return res.status(200).json({
      ok: true,
      summary: { total, completed, inProgress, notStarted },
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected getProgressSummary error", { error: err.message });
  }
}

module.exports = { listProgress, getProgressSummary };
