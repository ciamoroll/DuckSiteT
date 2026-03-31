const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listPublicCourses(_req, res) {
  try {
    const { data, error } = await supabase.from("courses").select("*").order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, courses: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listPublicCourses error", { error: err.message });
  }
}

async function listPublicMaterials(_req, res) {
  try {
    const { data, error } = await supabase.from("materials").select("*").order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, materials: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listPublicMaterials error", { error: err.message });
  }
}

async function listLeaderboard(_req, res) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, xp, created_at, role")
      .eq("role", "student");
    if (error) return errorResponse(res, 400, error.message);
    const leaderboard = (data || [])
      .map((u) => {
        const xp = Number(u.xp || 0);
        return {
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Student",
          xp,
          level: Math.floor(xp / 500) + 1,
          created_at: u.created_at,
        };
      })
      .sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (a.created_at !== b.created_at) return String(a.created_at).localeCompare(String(b.created_at));
        return String(a.id).localeCompare(String(b.id));
      });
    return res.status(200).json({ ok: true, leaderboard });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listLeaderboard error", { error: err.message });
  }
}

async function upsertPublicProgress(req, res) {
  try {
    const { email, firstName, lastName, module, progress, xp } = req.body || {};
    if (!email) return errorResponse(res, 400, "email is required");
    const safeXp = Number(xp || 0);
    const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));
    const status = safeProgress >= 100 ? "Completed" : safeProgress > 0 ? "In Progress" : "Not Started";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || email;
    await supabase
      .from("users")
      .update({ xp: safeXp, updated_at: new Date().toISOString() })
      .eq("email", String(email).toLowerCase());
    const progressRow = {
      name: fullName,
      module: module || "General Track",
      progress: safeProgress,
      status,
      last_updated: new Date().toISOString(),
    };
    const { data: existing } = await supabase
      .from("user_progress")
      .select("id")
      .eq("name", progressRow.name)
      .eq("module", progressRow.module)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      await supabase.from("user_progress").update(progressRow).eq("id", existing.id);
    } else {
      await supabase.from("user_progress").insert(progressRow);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected upsertPublicProgress error", { error: err.message });
  }
}

module.exports = { listPublicCourses, listPublicMaterials, listLeaderboard, upsertPublicProgress };
