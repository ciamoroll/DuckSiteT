const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
}

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
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || "");
    const firstName = String(payload.first_name || "").trim();
    const lastName = String(payload.last_name || "").trim();

    if (!email) {
      return errorResponse(res, 400, "email is required");
    }
    if (!password) {
      return errorResponse(res, 400, "password is required");
    }
    if (!isStrongPassword(password)) {
      return errorResponse(res, 400, "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.");
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });
    if (authError) {
      return errorResponse(res, 400, authError.message);
    }

    const authUserId = authData?.user?.id;
    if (!authUserId) {
      return errorResponse(res, 400, "Failed to create auth user");
    }

    const studentProfile = {
      id: authUserId,
      uid: authUserId,
      first_name: firstName,
      last_name: lastName,
      email,
      role: "student",
      year_level: payload.year_level || null,
      profile_completed: false,
      profile_step: 1,
      xp: 0,
    };

    const { data, error } = await supabase
      .from("users")
      .upsert(studentProfile)
      .select()
      .single();
    if (error) {
      // Roll back auth user if profile insert fails to avoid orphan auth account.
      await supabase.auth.admin.deleteUser(authUserId);
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
    const raw = req.body || {};

    if (raw.role !== undefined && String(raw.role).toLowerCase() !== "student") {
      return errorResponse(res, 403, "Role updates are restricted");
    }

    if (raw.email !== undefined) {
      return errorResponse(res, 403, "Email updates are restricted from this endpoint");
    }

    const payload = {};
    if (raw.first_name !== undefined) payload.first_name = raw.first_name;
    if (raw.last_name !== undefined) payload.last_name = raw.last_name;
    if (raw.year_level !== undefined) payload.year_level = raw.year_level;
    if (raw.class_id !== undefined) payload.class_id = raw.class_id;
    if (raw.class_code !== undefined) payload.class_code = raw.class_code;
    if (raw.student_id !== undefined) payload.student_id = raw.student_id;
    if (raw.status !== undefined) payload.status = raw.status;

    if (Object.keys(payload).length === 0) {
      return errorResponse(res, 400, "No valid fields to update");
    }

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
    // Delete auth user first; users table row should cascade via FK.
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      return errorResponse(res, 400, authError.message);
    }

    return res.status(200).json({ ok: true, message: "User deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected deleteUser error", { error: err.message });
  }
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
