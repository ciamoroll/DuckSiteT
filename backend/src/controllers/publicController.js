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

module.exports = { listPublicCourses, listPublicMaterials };
