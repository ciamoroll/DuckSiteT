const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listUsers(_req, res) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return errorResponse(res, 400, error.message);
    }

    return res.status(200).json({ ok: true, users: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listUsers error", { error: err.message });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
    if (error) {
      return errorResponse(res, 404, error.message);
    }
    return res.status(200).json({ ok: true, user: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected getUserById error", { error: err.message });
  }
}

async function createUser(req, res) {
  try {
    const payload = req.body || {};
    if (payload.role) payload.role = String(payload.role).toLowerCase();
    if (!payload.email) {
      return errorResponse(res, 400, "email is required");
    }
    const { data, error } = await supabase.from("users").insert(payload).select().single();
    if (error) {
      return errorResponse(res, 400, error.message);
    }
    return res.status(201).json({ ok: true, user: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected createUser error", { error: err.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    if (payload.role) payload.role = String(payload.role).toLowerCase();
    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return errorResponse(res, 400, error.message);
    }
    return res.status(200).json({ ok: true, user: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected updateUser error", { error: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      return errorResponse(res, 400, error.message);
    }
    return res.status(200).json({ ok: true, message: "User deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected deleteUser error", { error: err.message });
  }
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
