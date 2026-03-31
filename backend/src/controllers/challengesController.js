const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

async function listChallenges(_req, res) {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, challenges: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listChallenges error", { error: err.message });
  }
}

async function createChallenge(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.title) return errorResponse(res, 400, "title is required");
    const { data, error } = await supabase.from("challenges").insert(payload).select().single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(201).json({ ok: true, challenge: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected createChallenge error", { error: err.message });
  }
}

async function updateChallenge(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("challenges")
      .update(req.body || {})
      .eq("id", id)
      .select()
      .single();
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, challenge: data });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected updateChallenge error", { error: err.message });
  }
}

async function deleteChallenge(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, message: "Challenge deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected deleteChallenge error", { error: err.message });
  }
}

module.exports = {
  listChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
};
