const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listProgress(_req, res) {
  try {
    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, rows: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listProgress error", { error: err.message });
  }
}

async function getProgressSummary(_req, res) {
  try {
    const { data, error } = await supabase.from("user_progress").select("status");
    if (error) return errorResponse(res, 400, error.message);
    const total = data.length;
    const completed = data.filter((r) => r.status === "Completed").length;
    const inProgress = data.filter((r) => r.status === "In Progress").length;
    const notStarted = data.filter((r) => r.status === "Not Started").length;
    return res.status(200).json({
      ok: true,
      summary: { total, completed, inProgress, notStarted },
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected getProgressSummary error", { error: err.message });
  }
}

module.exports = { listProgress, getProgressSummary };
