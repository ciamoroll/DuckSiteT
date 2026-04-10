const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

function toStudentRowsFromXp(users, resolveClassCode = null) {
  return (users || []).map((u) => {
    const xp = Number(u.xp || 0);
    const progress = Math.max(0, Math.min(100, Math.round((xp / 2000) * 100)));
    const status = progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Started";
    return {
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Student",
      class_code: typeof resolveClassCode === "function"
        ? resolveClassCode(u)
        : String(u.class_code || ""),
      module: u.year_level || "General Track",
      progress,
      status,
      total_lessons: null,
      completed_lessons: null,
      last_updated: u.updated_at || null,
    };
  });
}

function isTableMissing(error, tableName) {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  const table = String(tableName || "").toLowerCase();
  return message.includes(table) && (
    message.includes("does not exist") ||
    message.includes("undefined table") ||
    message.includes("relation")
  );
}

async function buildProgressRows(users, scopedCourseIds = null) {
  const studentRows = users || [];
  if (studentRows.length === 0) return [];

  const classCodeById = new Map();
  const classIds = Array.from(
    new Set(
      studentRows
        .map((row) => Number(row.class_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
  if (classIds.length > 0) {
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, code")
      .in("id", classIds);
    if (classesError) {
      throw new Error(classesError.message);
    }
    for (const row of classes || []) {
      classCodeById.set(Number(row.id), String(row.code || "").trim());
    }
  }

  const resolveClassCode = (row) => {
    const directCode = String(row?.class_code || "").trim();
    if (directCode) return directCode;
    const classId = Number(row?.class_id);
    if (Number.isInteger(classId) && classId > 0) {
      return String(classCodeById.get(classId) || "").trim();
    }
    return "";
  };

  const scopedCourseSet = Array.isArray(scopedCourseIds)
    ? new Set(scopedCourseIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))
    : null;

  const studentIds = studentRows.map((u) => u.id).filter(Boolean);
  if (studentIds.length === 0) return toStudentRowsFromXp(studentRows, resolveClassCode);

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("course_enrollments")
    .select("user_id, course_id")
    .in("user_id", studentIds);

  if (enrollmentError) {
    if (isTableMissing(enrollmentError, "course_enrollments")) {
      return toStudentRowsFromXp(studentRows, resolveClassCode);
    }
    throw new Error(enrollmentError.message);
  }

  const enrolledCoursesByUser = new Map();
  const enrolledCourseIdsSet = new Set();
  for (const row of enrollments || []) {
    const userId = row.user_id;
    const courseId = Number(row.course_id);
    if (!userId || !Number.isInteger(courseId)) continue;
    if (scopedCourseSet && !scopedCourseSet.has(courseId)) continue;
    if (!enrolledCoursesByUser.has(userId)) enrolledCoursesByUser.set(userId, new Set());
    enrolledCoursesByUser.get(userId).add(courseId);
    enrolledCourseIdsSet.add(courseId);
  }

  const enrolledCourseIds = Array.from(enrolledCourseIdsSet);
  if (enrolledCourseIds.length === 0) {
    return studentRows.map((u) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Student",
      class_code: resolveClassCode(u),
      module: u.year_level || "General Track",
      progress: 0,
      status: "Not Started",
      total_lessons: 0,
      completed_lessons: 0,
      last_updated: u.updated_at || null,
    }));
  }

  const { data: challenges, error: challengesError } = await supabase
    .from("challenges")
    .select("id, course_id")
    .eq("status", "Active")
    .in("course_id", enrolledCourseIds);

  if (challengesError) {
    throw new Error(challengesError.message);
  }

  const activeChallengeIds = (challenges || [])
    .map((row) => Number(row.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  const challengeCourseById = new Map();
  const challengeIdsByCourse = new Map();
  for (const row of challenges || []) {
    const challengeId = Number(row.id);
    const courseId = Number(row.course_id);
    if (!Number.isInteger(challengeId) || !Number.isInteger(courseId)) continue;
    challengeCourseById.set(challengeId, courseId);
    if (!challengeIdsByCourse.has(courseId)) challengeIdsByCourse.set(courseId, new Set());
    challengeIdsByCourse.get(courseId).add(challengeId);
  }

  let solvedAttempts = [];
  if (activeChallengeIds.length > 0) {
    const { data: attempts, error: attemptsError } = await supabase
      .from("challenge_attempts")
      .select("user_id, challenge_id")
      .eq("is_correct", true)
      .in("user_id", studentIds)
      .in("challenge_id", activeChallengeIds);

    if (attemptsError) {
      if (isTableMissing(attemptsError, "challenge_attempts")) {
        return toStudentRowsFromXp(studentRows, resolveClassCode);
      }
      throw new Error(attemptsError.message);
    }
    solvedAttempts = attempts || [];
  }

  const solvedChallengeIdsByUser = new Map();
  for (const row of solvedAttempts) {
    const userId = row.user_id;
    const challengeId = Number(row.challenge_id);
    if (!userId || !Number.isInteger(challengeId)) continue;
    if (!solvedChallengeIdsByUser.has(userId)) solvedChallengeIdsByUser.set(userId, new Set());
    solvedChallengeIdsByUser.get(userId).add(challengeId);
  }

  return studentRows.map((u) => {
    const enrolledCourseSet = enrolledCoursesByUser.get(u.id) || new Set();
    const totalLessons = Array.from(enrolledCourseSet)
      .reduce((sum, courseId) => sum + Number(challengeIdsByCourse.get(courseId)?.size || 0), 0);

    const solvedSet = solvedChallengeIdsByUser.get(u.id) || new Set();
    const completedLessons = Array.from(solvedSet).filter((challengeId) => {
      const challengeCourseId = challengeCourseById.get(challengeId);
      return challengeCourseId != null && enrolledCourseSet.has(challengeCourseId);
    }).length;

    const progress = totalLessons > 0
      ? Math.max(0, Math.min(100, Math.round((completedLessons / totalLessons) * 100)))
      : 0;
    const status = progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Not Started";

    return {
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Student",
      class_code: resolveClassCode(u),
      module: u.year_level || "General Track",
      progress,
      status,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      last_updated: u.updated_at || null,
    };
  });
}

function filterRowsWithTrackableLessons(rows) {
  return (rows || []).filter((row) => row.total_lessons !== 0);
}

function summarizeRows(rows) {
  const summary = { total: 0, completed: 0, inProgress: 0, notStarted: 0 };
  for (const row of rows || []) {
    summary.total += 1;
    if (row.status === "Completed") summary.completed += 1;
    else if (row.status === "In Progress") summary.inProgress += 1;
    else summary.notStarted += 1;
  }
  return summary;
}

async function listScopedStudentIds(req) {
  if (!req?.isScopedAdmin || !req?.adminProfile?.id) return null;

  const { data: ownedCourses, error: ownedCoursesError } = await supabase
    .from("courses")
    .select("id")
    .eq("owner_id", req.adminProfile.id);
  if (ownedCoursesError) throw new Error(ownedCoursesError.message);

  const ownedCourseIds = (ownedCourses || [])
    .map((row) => Number(row.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (ownedCourseIds.length === 0) return [];

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("course_enrollments")
    .select("user_id")
    .in("course_id", ownedCourseIds);

  if (enrollmentsError) {
    if (isTableMissing(enrollmentsError, "course_enrollments")) {
      return [];
    }
    throw new Error(enrollmentsError.message);
  }

  return Array.from(
    new Set((enrollments || []).map((row) => row.user_id).filter(Boolean))
  );
}

async function listScopedCourseIds(req) {
  if (!req?.isScopedAdmin || !req?.adminProfile?.id) return null;

  const { data: ownedCourses, error } = await supabase
    .from("courses")
    .select("id")
    .eq("owner_id", req.adminProfile.id);
  if (error) throw new Error(error.message);

  return (ownedCourses || [])
    .map((row) => Number(row.id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function listProgress(req, res) {
  try {
    const scopedCourseIds = await listScopedCourseIds(req);
    if (Array.isArray(scopedCourseIds) && scopedCourseIds.length === 0) {
      return res.status(200).json({ ok: true, rows: [] });
    }

    const scopedStudentIds = await listScopedStudentIds(req);
    if (Array.isArray(scopedStudentIds) && scopedStudentIds.length === 0) {
      return res.status(200).json({ ok: true, rows: [] });
    }

    let usersQuery = supabase
      .from("users")
      .select("id, first_name, last_name, class_id, class_code, xp, year_level, updated_at, profile_completed, role")
      .eq("role", "student")
      .order("updated_at", { ascending: false });

    if (Array.isArray(scopedStudentIds)) {
      usersQuery = usersQuery.in("id", scopedStudentIds);
    }

    const { data: users, error: userError } = await usersQuery;
    if (userError) return errorResponse(res, 400, userError.message);

    const rows = filterRowsWithTrackableLessons(await buildProgressRows(users || [], scopedCourseIds));

    return res.status(200).json({ ok: true, rows });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listProgress error", { error: err.message });
  }
}

async function getProgressSummary(req, res) {
  try {
    const scopedCourseIds = await listScopedCourseIds(req);
    if (Array.isArray(scopedCourseIds) && scopedCourseIds.length === 0) {
      return res.status(200).json({
        ok: true,
        summary: { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
      });
    }

    const scopedStudentIds = await listScopedStudentIds(req);
    if (Array.isArray(scopedStudentIds) && scopedStudentIds.length === 0) {
      return res.status(200).json({
        ok: true,
        summary: { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
      });
    }

    let usersQuery = supabase
      .from("users")
      .select("id, first_name, last_name, class_id, class_code, xp, year_level, updated_at, profile_completed, role")
      .eq("role", "student");

    if (Array.isArray(scopedStudentIds)) {
      usersQuery = usersQuery.in("id", scopedStudentIds);
    }

    const { data: users, error } = await usersQuery;
    if (error) return errorResponse(res, 400, error.message);

    const rows = filterRowsWithTrackableLessons(await buildProgressRows(users || [], scopedCourseIds));
    const { total, completed, inProgress, notStarted } = summarizeRows(rows);

    return res.status(200).json({
      ok: true,
      summary: { total, completed, inProgress, notStarted },
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected getProgressSummary error", { error: err.message });
  }
}

module.exports = { listProgress, getProgressSummary };
