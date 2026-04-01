const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

function toOptionsArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

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
    const raw = req.body || {};
    const options = toOptionsArray(raw.options);
    const payload = {
      title: raw.title,
      course_id: raw.course_id ? Number(raw.course_id) : null,
      question_text: raw.question_text,
      options,
      correct_answer: raw.correct_answer,
      explanation: raw.explanation,
      points: raw.points,
      completed: raw.completed,
      status: raw.status || "Active",
    };
    if (!payload.title) return errorResponse(res, 400, "title is required");
    if (!payload.course_id) return errorResponse(res, 400, "course_id is required");
    if (!payload.question_text) return errorResponse(res, 400, "question_text is required");
    if (options.length < 2) return errorResponse(res, 400, "At least 2 options are required");
    if (!payload.correct_answer) return errorResponse(res, 400, "correct_answer is required");
    if (!options.includes(String(payload.correct_answer).trim())) {
      return errorResponse(res, 400, "correct_answer must match one of the options");
    }
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
    const raw = req.body || {};

    const { data: existingChallenge, error: existingError } = await supabase
      .from("challenges")
      .select("id, options, correct_answer")
      .eq("id", id)
      .single();
    if (existingError || !existingChallenge) {
      return errorResponse(res, 404, "Challenge not found");
    }

    const payload = {};
    if (raw.title !== undefined) payload.title = raw.title;
    if (raw.course_id !== undefined) payload.course_id = raw.course_id ? Number(raw.course_id) : null;
    if (raw.question_text !== undefined) payload.question_text = raw.question_text;
    if (raw.options !== undefined) payload.options = toOptionsArray(raw.options);
    if (raw.correct_answer !== undefined) payload.correct_answer = raw.correct_answer;
    if (raw.explanation !== undefined) payload.explanation = raw.explanation;
    if (raw.points !== undefined) payload.points = raw.points;
    if (raw.completed !== undefined) payload.completed = raw.completed;
    if (raw.status !== undefined) payload.status = raw.status;

    if (Object.keys(payload).length === 0) {
      return errorResponse(res, 400, "No valid fields to update");
    }

    if (payload.options && payload.options.length < 2) {
      return errorResponse(res, 400, "At least 2 options are required");
    }

    const mergedOptions = payload.options || toOptionsArray(existingChallenge.options);
    const mergedCorrectAnswer = payload.correct_answer !== undefined
      ? String(payload.correct_answer || "").trim()
      : String(existingChallenge.correct_answer || "").trim();

    if (mergedCorrectAnswer && !mergedOptions.includes(mergedCorrectAnswer)) {
      return errorResponse(res, 400, "correct_answer must match one of the options");
    }

    const { data, error } = await supabase
      .from("challenges")
      .update(payload)
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
