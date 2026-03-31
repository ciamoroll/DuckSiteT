const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listMaterials(_req, res) {
  try {
    const { data, error } = await supabase.from("materials").select("*").order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, materials: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listMaterials error", { error: err.message });
  }
}

async function createMaterial(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.title) return errorResponse(res, 400, "title is required");
    const { data, error } = await supabase.from("materials").insert(payload).select().single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(201).json({ ok: true, material: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected createMaterial error", { error: err.message });
  }
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, message: "Material deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected deleteMaterial error", { error: err.message });
  }
}

async function uploadMaterialFile(req, res) {
  try {
    if (!req.file) return errorResponse(res, 400, "file is required");
    const fileName = `${Date.now()}_${req.file.originalname}`.replace(/\s+/g, "_");
    const path = `materials/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("materials").upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (uploadError) return errorResponse(res, 400, uploadError.message);
    const { data } = supabase.storage.from("materials").getPublicUrl(path);
    return res.status(201).json({ ok: true, file_url: data.publicUrl, path });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected uploadMaterialFile error", { error: err.message });
  }
}

module.exports = { listMaterials, createMaterial, deleteMaterial, uploadMaterialFile };
