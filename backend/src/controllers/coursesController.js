const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listCourses(_req, res) {
  try {
    const { data, error } = await supabase.from("courses").select("*").order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, courses: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listCourses error", { error: err.message });
  }
}

async function createCourse(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.code) {
      return errorResponse(res, 400, "name and code are required");
    }
    const { data, error } = await supabase.from("courses").insert(payload).select().single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(201).json({ ok: true, course: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected createCourse error", { error: err.message });
  }
}

async function updateCourse(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("courses")
      .update(req.body || {})
      .eq("id", id)
      .select()
      .single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, course: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected updateCourse error", { error: err.message });
  }
}

async function deleteCourse(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, message: "Course deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected deleteCourse error", { error: err.message });
  }
}

module.exports = { listCourses, createCourse, updateCourse, deleteCourse };
