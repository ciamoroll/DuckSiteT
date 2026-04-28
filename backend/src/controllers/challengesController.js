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

function toOptionsArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((q) => {
      if (!q || typeof q !== "object") return null;
      const options = toOptionsArray(q.options);
      if (options.length < 2) return null;
      const correctAnswer = String(q.correct_answer || "").trim();
      if (!correctAnswer || !options.includes(correctAnswer)) return null;
      return {
        id: q.id || `q-${Date.now()}-${Math.random()}`,
        text: String(q.text || q.question_text || "").trim(),
        options,
        correct_answer: correctAnswer,
        explanation: String(q.explanation || "").trim(),
      };
    })
    .filter(Boolean);
}

function isChallengeAttemptsMissing(error) {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return message.includes("challenge_attempts") && (
    message.includes("does not exist") ||
    message.includes("undefined table") ||
    message.includes("relation")
  );
}

async function listChallenges(req, res) {
  try {
    let challengesQuery = supabase.from("challenges").select("*");

    const ownedCourseIds = await listOwnedCourseIds(req);
    if (Array.isArray(ownedCourseIds)) {
      if (ownedCourseIds.length === 0) {
        return res.status(200).json({ ok: true, challenges: [] });
      }
      challengesQuery = challengesQuery.in("course_id", ownedCourseIds);
    }

    const { data, error } = await challengesQuery.order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);

    const challenges = data || [];
    const challengeIds = challenges
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id));

    if (challengeIds.length === 0) {
      return res.status(200).json({ ok: true, challenges });
    }

    const { data: attempts, error: attemptsError } = await supabase
      .from("challenge_attempts")
      .select("challenge_id")
      .eq("is_correct", true)
      .in("challenge_id", challengeIds);

    if (attemptsError) {
      if (isChallengeAttemptsMissing(attemptsError)) {
        return res.status(200).json({ ok: true, challenges });
      }
      return errorResponse(res, 400, attemptsError.message);
    }

    const counts = new Map();
    for (const row of attempts || []) {
      const challengeId = Number(row.challenge_id);
      if (!Number.isInteger(challengeId)) continue;
      counts.set(challengeId, Number(counts.get(challengeId) || 0) + 1);
    }

    const hydrated = challenges.map((challenge) => ({
      ...challenge,
      completed: Number(counts.get(Number(challenge.id)) || 0),
    }));

    return res.status(200).json({ ok: true, challenges: hydrated });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listChallenges error", { error: err.message });
  }
}

async function createChallenge(req, res) {
  try {
    const raw = req.body || {};
    
    // Support both old format (single question) and new format (multiple questions)
    let questions = [];
    
    if (Array.isArray(raw.questions) && raw.questions.length > 0) {
      // New format: questions array
      questions = normalizeQuestions(raw.questions);
    } else if (raw.question_text || raw.options) {
      // Old format: single question fields
      const options = toOptionsArray(raw.options);
      if (options.length >= 2) {
        const correctAnswer = String(raw.correct_answer || "").trim();
        if (correctAnswer && options.includes(correctAnswer)) {
          questions = [{
            id: `q-${Date.now()}`,
            text: String(raw.question_text || "").trim(),
            options,
            correct_answer: correctAnswer,
            explanation: String(raw.explanation || "").trim(),
          }];
        }
      }
    }
    
    if (questions.length === 0) {
      return errorResponse(res, 400, "At least one valid question is required");
    }

    const payload = {
      title: raw.title,
      course_id: raw.course_id ? Number(raw.course_id) : null,
      questions,
      lesson_order: Math.max(1, Number(raw.lesson_order || 1)),
      required_xp: Math.max(0, Number(raw.required_xp || 0)),
      points: raw.points,
      status: raw.status || "Active",
    };
    
    if (!payload.title) return errorResponse(res, 400, "title is required");
    if (!payload.course_id) return errorResponse(res, 400, "course_id is required");

    const owned = await ensureCourseOwnedByAdmin(payload.course_id, req);
    if (!owned) return errorResponse(res, 403, "You can only create challenges for your own courses");

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
      .select("id, course_id, questions")
      .eq("id", id)
      .single();
    if (existingError || !existingChallenge) {
      return errorResponse(res, 404, "Challenge not found");
    }

    const existingOwned = await ensureCourseOwnedByAdmin(existingChallenge.course_id, req);
    if (!existingOwned) return errorResponse(res, 403, "You can only update your own challenges");

    const payload = {};
    if (raw.title !== undefined) payload.title = raw.title;
    if (raw.course_id !== undefined) payload.course_id = raw.course_id ? Number(raw.course_id) : null;
    if (raw.lesson_order !== undefined) payload.lesson_order = Math.max(1, Number(raw.lesson_order || 1));
    if (raw.required_xp !== undefined) payload.required_xp = Math.max(0, Number(raw.required_xp || 0));
    if (raw.points !== undefined) payload.points = raw.points;
    if (raw.status !== undefined) payload.status = raw.status;

    // Handle questions update (new format)
    if (raw.questions !== undefined) {
      const questions = normalizeQuestions(raw.questions);
      if (questions.length === 0) {
        return errorResponse(res, 400, "At least one valid question is required");
      }
      payload.questions = questions;
    } else if (raw.question_text !== undefined || raw.options !== undefined || raw.correct_answer !== undefined) {
      // Handle old format: single question fields
      const existingQuestions = Array.isArray(existingChallenge.questions) 
        ? existingChallenge.questions 
        : [];
      
      const options = raw.options !== undefined 
        ? toOptionsArray(raw.options)
        : (existingQuestions[0]?.options || []);
      
      const correctAnswer = raw.correct_answer !== undefined 
        ? String(raw.correct_answer || "").trim()
        : (existingQuestions[0]?.correct_answer || "");
      
      const text = raw.question_text !== undefined 
        ? String(raw.question_text || "").trim()
        : (existingQuestions[0]?.text || "");

      if (options.length < 2) {
        return errorResponse(res, 400, "At least 2 options are required");
      }
      if (!correctAnswer || !options.includes(correctAnswer)) {
        return errorResponse(res, 400, "correct_answer must match one of the options");
      }

      payload.questions = [{
        id: existingQuestions[0]?.id || `q-${Date.now()}`,
        text,
        options,
        correct_answer: correctAnswer,
        explanation: raw.explanation !== undefined ? String(raw.explanation || "").trim() : (existingQuestions[0]?.explanation || ""),
      }];
    }

    if (Object.keys(payload).length === 0) {
      return errorResponse(res, 400, "No valid fields to update");
    }

    if (payload.course_id) {
      const nextCourseOwned = await ensureCourseOwnedByAdmin(payload.course_id, req);
      if (!nextCourseOwned) return errorResponse(res, 403, "You can only move challenges to your own courses");
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

    const { data: existing, error: existingError } = await supabase
      .from("challenges")
      .select("id, course_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return errorResponse(res, 400, existingError.message);
    if (!existing) return errorResponse(res, 404, "Challenge not found");

    const owned = await ensureCourseOwnedByAdmin(existing.course_id, req);
    if (!owned) return errorResponse(res, 403, "You can only delete your own challenges");

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
