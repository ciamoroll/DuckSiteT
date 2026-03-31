const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listClasses(_req, res) {
  try {
    const { data, error } = await supabase.from("classes").select("*").order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, classes: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listClasses error", { error: err.message });
  }
}

async function createClass(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.code || !payload.instructor) {
      return errorResponse(res, 400, "name, code, and instructor are required");
    }
    const { data, error } = await supabase.from("classes").insert(payload).select().single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(201).json({ ok: true, classItem: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected createClass error", { error: err.message });
  }
}

async function updateClass(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("classes")
      .update(req.body || {})
      .eq("id", id)
      .select()
      .single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, classItem: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected updateClass error", { error: err.message });
  }
}

async function deleteClass(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, message: "Class deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected deleteClass error", { error: err.message });
  }
}

module.exports = { listClasses, createClass, updateClass, deleteClass };
