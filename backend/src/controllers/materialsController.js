const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listOwnedCourseIds(req) {
  if (!req?.isScopedAdmin || !req?.adminProfile?.id) return null;
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .eq("owner_id", req.adminProfile.id);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => Number(row.id)).filter((id) => Number.isInteger(id));
}

async function ensureCourseOwnedByAdmin(courseId, req) {
  if (!req?.isScopedAdmin || !req?.adminProfile?.id) return true;
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .eq("id", Number(courseId))
    .eq("owner_id", req.adminProfile.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

async function listMaterials(req, res) {
  try {
    let materialsQuery = supabase.from("materials").select("*");

    const ownedCourseIds = await listOwnedCourseIds(req);
    if (Array.isArray(ownedCourseIds)) {
      if (ownedCourseIds.length === 0) {
        return res.status(200).json({ ok: true, materials: [] });
      }
      materialsQuery = materialsQuery.in("course_id", ownedCourseIds);
    }

    const { data, error } = await materialsQuery.order("id", { ascending: false });
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

    if (payload.course_id) {
      const owned = await ensureCourseOwnedByAdmin(payload.course_id, req);
      if (!owned) return errorResponse(res, 403, "You can only create materials for your own courses");
    }

    const { data, error } = await supabase.from("materials").insert(payload).select().single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(201).json({ ok: true, material: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected createMaterial error", { error: err.message });
  }
}

async function updateMaterial(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const { data: existing, error: existingError } = await supabase
      .from("materials")
      .select("id, course_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return errorResponse(res, 400, existingError.message);
    if (!existing) return errorResponse(res, 404, "Material not found");

    const existingOwned = await ensureCourseOwnedByAdmin(existing.course_id, req);
    if (!existingOwned) return errorResponse(res, 403, "You can only update your own materials");

    if (payload.title !== undefined && !String(payload.title).trim()) {
      return errorResponse(res, 400, "title cannot be empty");
    }

    if (payload.course_id) {
      const nextCourseOwned = await ensureCourseOwnedByAdmin(payload.course_id, req);
      if (!nextCourseOwned) return errorResponse(res, 403, "You can only move materials to your own courses");
    }

    const { data, error } = await supabase
      .from("materials")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, material: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected updateMaterial error", { error: err.message });
  }
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabase
      .from("materials")
      .select("id, course_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return errorResponse(res, 400, existingError.message);
    if (!existing) return errorResponse(res, 404, "Material not found");

    const owned = await ensureCourseOwnedByAdmin(existing.course_id, req);
    if (!owned) return errorResponse(res, 403, "You can only delete your own materials");

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

module.exports = { listMaterials, createMaterial, updateMaterial, deleteMaterial, uploadMaterialFile };
