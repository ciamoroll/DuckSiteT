const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

function isCourseEnrollmentsMissing(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("course_enrollments") && (message.includes("schema cache") || message.includes("does not exist"));
}

function normalizeClassCodes(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function isCourseAllowedForClass(courseClasses, classCode) {
  if (courseClasses.length === 0) return true;
  if (!classCode) return false;
  return courseClasses.includes(String(classCode).trim());
}

function normalizeClassIds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function isCourseAllowedForClassId(courseClassIds, classId) {
  if (courseClassIds.length === 0) return true;
  if (!Number.isInteger(Number(classId))) return false;
  return courseClassIds.includes(Number(classId));
}

async function getAllowedCourseIds(courseIds, classId) {
  if (!Array.isArray(courseIds) || courseIds.length === 0) return [];
  const numericCourseIds = courseIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  if (numericCourseIds.length === 0) return [];

  const { data: links, error } = await supabase
    .from("course_classes")
    .select("course_id, class_id")
    .in("course_id", numericCourseIds);
  if (error) throw new Error(error.message);

  const byCourse = new Map();
  for (const row of links || []) {
    const courseId = Number(row.course_id);
    const classRowId = Number(row.class_id);
    if (!byCourse.has(courseId)) byCourse.set(courseId, []);
    byCourse.get(courseId).push(classRowId);
  }

  return numericCourseIds.filter((courseId) => {
    const classIds = byCourse.get(courseId) || [];
    return isCourseAllowedForClassId(classIds, classId);
  });
}

async function attachCourseClassMappings(courses) {
  if (!Array.isArray(courses) || courses.length === 0) return [];
  const courseIds = courses.map((course) => Number(course.id)).filter((id) => Number.isInteger(id) && id > 0);
  if (courseIds.length === 0) return courses;

  const { data: links, error: linksError } = await supabase
    .from("course_classes")
    .select("course_id, class_id")
    .in("course_id", courseIds);
  if (linksError) throw new Error(linksError.message);

  const classIds = Array.from(new Set((links || []).map((row) => Number(row.class_id)).filter((id) => Number.isInteger(id) && id > 0)));
  let classesById = new Map();
  if (classIds.length > 0) {
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, code")
      .in("id", classIds);
    if (classesError) throw new Error(classesError.message);
    classesById = new Map((classes || []).map((row) => [Number(row.id), row]));
  }

  const byCourse = new Map();
  for (const row of links || []) {
    const courseId = Number(row.course_id);
    const classId = Number(row.class_id);
    if (!byCourse.has(courseId)) byCourse.set(courseId, []);
    byCourse.get(courseId).push(classId);
  }

  return courses.map((course) => {
    const ids = byCourse.get(Number(course.id)) || [];
    const codes = ids.map((id) => classesById.get(id)?.code).filter(Boolean);
    return {
      ...course,
      class_ids: ids,
      class_codes: codes,
      classes: codes,
    };
  });
}

async function getValidatedStudentClassId(profile) {
  const classId = Number(profile?.class_id);
  if (!Number.isInteger(classId) || classId <= 0) return null;

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .maybeSingle();
  if (classError) throw new Error(classError.message);

  if (classRow) return classId;

  // Class was deleted; clear stale student class assignment.
  await supabase
    .from("users")
    .update({ class_id: null, class_code: null, updated_at: new Date().toISOString() })
    .eq("id", profile.id);

  return null;
}

async function listPublicCourses(_req, res) {
  try {
    const { data, error } = await supabase.from("courses").select("*").order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    const courses = await attachCourseClassMappings(data || []);
    return res.status(200).json({ ok: true, courses });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listPublicCourses error", { error: err.message });
  }
}

async function listPublicMaterials(req, res) {
  try {
    const courseId = req.query.courseId;
    let query = supabase.from("materials").select("*");
    
    if (courseId) {
      query = query.eq("course_id", Number(courseId));
    }
    
    const { data, error } = await query.order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, materials: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listPublicMaterials error", { error: err.message });
  }
}

async function listPublicClasses(_req, res) {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, code, instructor")
      .order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, classes: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listPublicClasses error", { error: err.message });
  }
}

async function listLeaderboard(_req, res) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, xp, created_at, role")
      .eq("role", "student");
    if (error) return errorResponse(res, 400, error.message);
    const leaderboard = (data || [])
      .map((u) => {
        const xp = Number(u.xp || 0);
        return {
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Student",
          xp,
          level: Math.floor(xp / 500) + 1,
          created_at: u.created_at,
        };
      })
      .sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (a.created_at !== b.created_at) return String(a.created_at).localeCompare(String(b.created_at));
        return String(a.id).localeCompare(String(b.id));
      });
    return res.status(200).json({ ok: true, leaderboard });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listLeaderboard error", { error: err.message });
  }
}

async function listPublicChallenges(req, res) {
  try {
    const courseId = req.query?.courseId;
    let query = supabase
      .from("challenges")
      .select("id, title, course_id, question_text, options, points, required_xp, lesson_order, status, created_at")
      .eq("status", "Active")
      .order("id", { ascending: false });

    if (courseId) {
      query = query.eq("course_id", Number(courseId));
    }

    const { data, error } = await query;
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, challenges: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listPublicChallenges error", { error: err.message });
  }
}

function debugPublicRoutes(_req, res) {
  return res.status(200).json({
    ok: true,
    routes: {
      myCourses: "/api/public/my-courses",
      myChallenges: "/api/public/my-challenges",
      challengesAttempt: "/api/public/challenges/:id/attempt",
    },
    note: "If this responds, latest publicRoutes are loaded.",
  });
}

async function listMyCourses(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, 401, "Authenticated user is required");

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, class_id, class_code")
      .eq("id", userId)
      .single();
    if (profileError || !profile) return errorResponse(res, 404, "Student profile not found");
    if (profile.role !== "student") return errorResponse(res, 403, "Only students can access enrolled courses");

    const validClassId = await getValidatedStudentClassId(profile);
    if (!validClassId) {
      return res.status(200).json({ ok: true, courses: [] });
    }

    const { data: enrollments, error: enrollError } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("user_id", userId);
    if (enrollError) {
      if (isCourseEnrollmentsMissing(enrollError)) {
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("*")
          .order("id", { ascending: false });
        if (coursesError) return errorResponse(res, 400, coursesError.message);

        const mappedCourses = await attachCourseClassMappings(courses || []);

        let filteredCourses = mappedCourses;
        try {
          const allowedIds = await getAllowedCourseIds(mappedCourses.map((course) => course.id), validClassId);
          const allowedSet = new Set(allowedIds.map((id) => Number(id)));
          filteredCourses = mappedCourses.filter((course) => allowedSet.has(Number(course.id)));
        } catch (_err) {
          const studentClassCode = String(profile.class_code || "").trim();
          filteredCourses = mappedCourses.filter((course) => {
            const allowedClasses = normalizeClassCodes(course.classes);
            return isCourseAllowedForClass(allowedClasses, studentClassCode);
          });
        }

        return res.status(200).json({ ok: true, courses: filteredCourses, fallback: true, migrationRequired: true });
      }
      return errorResponse(res, 400, enrollError.message);
    }

    const courseIds = (enrollments || []).map((row) => row.course_id);
    if (courseIds.length === 0) {
      return res.status(200).json({ ok: true, courses: [] });
    }

    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .in("id", courseIds)
      .order("id", { ascending: false });
    if (coursesError) return errorResponse(res, 400, coursesError.message);

    const mappedCourses = await attachCourseClassMappings(courses || []);

    let filteredCourses = mappedCourses;
    try {
      const allowedIds = await getAllowedCourseIds(courseIds, validClassId);
      const allowedSet = new Set(allowedIds.map((id) => Number(id)));
      filteredCourses = mappedCourses.filter((course) => allowedSet.has(Number(course.id)));
    } catch (_err) {
      const studentClassCode = String(profile.class_code || "").trim();
      filteredCourses = mappedCourses.filter((course) => {
        const allowedClasses = normalizeClassCodes(course.classes);
        return isCourseAllowedForClass(allowedClasses, studentClassCode);
      });
    }

    return res.status(200).json({ ok: true, courses: filteredCourses });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listMyCourses error", { error: err.message });
  }
}

async function listMyChallenges(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, 401, "Authenticated user is required");

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, class_id, class_code")
      .eq("id", userId)
      .single();
    if (profileError || !profile) return errorResponse(res, 404, "Student profile not found");
    if (profile.role !== "student") return errorResponse(res, 403, "Only students can access enrolled challenges");

    const validClassId = await getValidatedStudentClassId(profile);
    if (!validClassId) {
      return res.status(200).json({ ok: true, challenges: [] });
    }

    const { data: enrollments, error: enrollError } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("user_id", userId);
    if (enrollError) {
      if (isCourseEnrollmentsMissing(enrollError)) {
        const { data: courseRows, error: courseRowsError } = await supabase
          .from("courses")
          .select("id");
        if (courseRowsError) return errorResponse(res, 400, courseRowsError.message);

        let allowedCourseIds = [];
        try {
          allowedCourseIds = await getAllowedCourseIds((courseRows || []).map((course) => course.id), validClassId);
        } catch (_err) {
          const studentClassCode = String(profile.class_code || "").trim();
          const { data: legacyCourseRows } = await supabase.from("courses").select("id, classes");
          allowedCourseIds = (legacyCourseRows || [])
            .filter((course) => isCourseAllowedForClass(normalizeClassCodes(course.classes), studentClassCode))
            .map((course) => Number(course.id));
        }

        if (allowedCourseIds.length === 0) {
          return res.status(200).json({ ok: true, challenges: [], fallback: true, migrationRequired: true });
        }

        const { data: challenges, error: challengesError } = await supabase
          .from("challenges")
          .select("id, title, course_id, question_text, options, explanation, points, required_xp, lesson_order, status, created_at")
          .eq("status", "Active")
          .in("course_id", allowedCourseIds)
          .order("id", { ascending: false });
        if (challengesError) return errorResponse(res, 400, challengesError.message);
        return res.status(200).json({ ok: true, challenges: challenges || [], fallback: true, migrationRequired: true });
      }
      return errorResponse(res, 400, enrollError.message);
    }

    const courseIds = (enrollments || []).map((row) => row.course_id);
    if (courseIds.length === 0) {
      return res.status(200).json({ ok: true, challenges: [] });
    }

    let allowedCourseIds = [];
    try {
      allowedCourseIds = await getAllowedCourseIds(courseIds, validClassId);
    } catch (_err) {
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, classes")
        .in("id", courseIds);
      if (coursesError) return errorResponse(res, 400, coursesError.message);

      const studentClassCode = String(profile.class_code || "").trim();
      allowedCourseIds = (courses || [])
        .filter((course) => isCourseAllowedForClass(normalizeClassCodes(course.classes), studentClassCode))
        .map((course) => Number(course.id));
    }

    if (allowedCourseIds.length === 0) {
      return res.status(200).json({ ok: true, challenges: [] });
    }

    const { data: challenges, error: challengesError } = await supabase
      .from("challenges")
      .select("id, title, course_id, question_text, options, explanation, points, required_xp, lesson_order, status, created_at")
      .eq("status", "Active")
      .in("course_id", allowedCourseIds)
      .order("id", { ascending: false });
    if (challengesError) return errorResponse(res, 400, challengesError.message);

    return res.status(200).json({ ok: true, challenges: challenges || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listMyChallenges error", { error: err.message });
  }
}

async function listMyAttempts(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, 401, "Authenticated user is required");

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .single();
    if (profileError || !profile) return errorResponse(res, 404, "Student profile not found");
    if (profile.role !== "student") return errorResponse(res, 403, "Only students can access attempts");

    const courseId = req.query?.courseId ? Number(req.query.courseId) : null;

    let query = supabase
      .from("challenge_attempts")
      .select("id, challenge_id, is_correct, awarded_xp, attempts_count, last_attempt_at, created_at")
      .eq("user_id", userId)
      .order("last_attempt_at", { ascending: false });

    if (courseId) {
      const { data: challenges, error: challengeError } = await supabase
        .from("challenges")
        .select("id")
        .eq("course_id", courseId);
      if (challengeError) return errorResponse(res, 400, challengeError.message);

      const challengeIds = (challenges || []).map((row) => Number(row.id)).filter((id) => Number.isInteger(id));
      if (challengeIds.length === 0) return res.status(200).json({ ok: true, attempts: [] });
      query = query.in("challenge_id", challengeIds);
    }

    const { data, error } = await query;
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, attempts: data || [] });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listMyAttempts error", { error: err.message });
  }
}

async function enrollMyCourse(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, 401, "Authenticated user is required");

    const courseId = Number(req.body?.courseId);
    if (!courseId) return errorResponse(res, 400, "courseId is required");

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, class_id, class_code")
      .eq("id", userId)
      .single();
    if (profileError || !profile) return errorResponse(res, 404, "Student profile not found");
    if (profile.role !== "student") return errorResponse(res, 403, "Only students can enroll in courses");

    const validClassId = await getValidatedStudentClassId(profile);
    if (!validClassId) {
      return errorResponse(res, 403, "Please select your class before enrolling in courses");
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, classes")
      .eq("id", courseId)
      .maybeSingle();
    if (courseError) return errorResponse(res, 400, courseError.message);
    if (!course) return errorResponse(res, 404, "Course not found");

    let allowedForClass = true;
    try {
      const allowedIds = await getAllowedCourseIds([courseId], validClassId);
      allowedForClass = allowedIds.includes(courseId);
    } catch (_err) {
      const courseClasses = Array.isArray(course.classes)
        ? course.classes.map((value) => String(value).trim()).filter(Boolean)
        : [];
      if (courseClasses.length > 0) {
        const studentClassCode = String(profile.class_code || "").trim();
        allowedForClass = Boolean(studentClassCode) && courseClasses.includes(studentClassCode);
      }
    }

    if (!allowedForClass) {
      return errorResponse(res, 403, "This course is not available for your class");
    }

    const { error: enrollError } = await supabase
      .from("course_enrollments")
      .upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id" });
    if (enrollError) {
      if (isCourseEnrollmentsMissing(enrollError)) {
        return errorResponse(res, 400, "Enrollment migration is missing. Please run latest schema.sql.");
      }
      return errorResponse(res, 400, enrollError.message);
    }

    return res.status(200).json({ ok: true, message: "Enrolled successfully", courseId });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected enrollMyCourse error", { error: err.message });
  }
}

async function submitChallengeAttempt(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, 401, "Authenticated user is required");

    const challengeId = Number(req.params?.id);
    const answer = String(req.body?.answer || "").trim();
    if (!challengeId || !answer) {
      return errorResponse(res, 400, "challenge id and answer are required");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role, xp, class_id, class_code")
      .eq("id", userId)
      .single();
    if (profileError || !profile) return errorResponse(res, 404, "Student profile not found");
    if (profile.role !== "student") return errorResponse(res, 403, "Only students can submit challenge answers");

    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("id, title, course_id, points, status, correct_answer, explanation, required_xp, lesson_order")
      .eq("id", challengeId)
      .single();
    if (challengeError || !challenge) return errorResponse(res, 404, "Challenge not found");
    if (challenge.status !== "Active") return errorResponse(res, 400, "Challenge is not active");

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", challenge.course_id)
      .maybeSingle();
    if (enrollmentError && !isCourseEnrollmentsMissing(enrollmentError)) {
      return errorResponse(res, 400, enrollmentError.message);
    }
    if (!enrollmentError && !enrollment) return errorResponse(res, 403, "You are not enrolled in this challenge course");

    let allowedForClass = true;
    try {
      const allowedIds = await getAllowedCourseIds([challenge.course_id], profile.class_id);
      allowedForClass = allowedIds.includes(Number(challenge.course_id));
    } catch (_err) {
      const { data: challengeCourse, error: challengeCourseError } = await supabase
        .from("courses")
        .select("id, classes")
        .eq("id", challenge.course_id)
        .maybeSingle();
      if (challengeCourseError) return errorResponse(res, 400, challengeCourseError.message);
      if (!challengeCourse) return errorResponse(res, 404, "Challenge course not found");

      const allowedClasses = normalizeClassCodes(challengeCourse.classes);
      const studentClassCode = String(profile.class_code || "").trim();
      allowedForClass = isCourseAllowedForClass(allowedClasses, studentClassCode);
    }

    if (!allowedForClass) return errorResponse(res, 403, "This challenge is not available for your class");

    const { data: courseChallenges, error: courseChallengesError } = await supabase
      .from("challenges")
      .select("id, required_xp, lesson_order, status")
      .eq("course_id", challenge.course_id)
      .eq("status", "Active");
    if (courseChallengesError) return errorResponse(res, 400, courseChallengesError.message);

    const sortedChallenges = (courseChallenges || []).sort((a, b) => {
      const orderA = Number(a.lesson_order || 9999);
      const orderB = Number(b.lesson_order || 9999);
      if (orderA !== orderB) return orderA - orderB;
      return Number(a.id) - Number(b.id);
    });

    const lessonIndex = sortedChallenges.findIndex((row) => Number(row.id) === challengeId);
    if (lessonIndex < 0) return errorResponse(res, 404, "Challenge not found in course");

    const orderedChallengeIds = sortedChallenges
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    const { data: solvedAttempts, error: solvedAttemptsError } = await supabase
      .from("challenge_attempts")
      .select("challenge_id")
      .eq("user_id", userId)
      .eq("is_correct", true)
      .in("challenge_id", orderedChallengeIds);
    if (solvedAttemptsError) return errorResponse(res, 400, solvedAttemptsError.message);

    const solvedSet = new Set(
      (solvedAttempts || [])
        .map((row) => Number(row.challenge_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    );

    const lessonConfig = sortedChallenges[lessonIndex] || {};
    const requiredXpValue = lessonConfig.required_xp ?? challenge.required_xp;
    const requiredXp = Number.isFinite(Number(requiredXpValue))
      ? Number(requiredXpValue)
      : lessonIndex * 100;
    const meetsXp = Number(profile.xp || 0) >= requiredXp;
    const previousChallengeId = lessonIndex > 0 ? Number(sortedChallenges[lessonIndex - 1]?.id) : null;
    const meetsPrerequisite = previousChallengeId == null ? true : solvedSet.has(previousChallengeId);

    if (!meetsXp || !meetsPrerequisite) {
      if (!meetsXp && previousChallengeId != null && !meetsPrerequisite) {
        return errorResponse(res, 403, `Lesson is locked. Requires ${requiredXp} XP and completion of the previous lesson.`);
      }
      if (!meetsXp) {
        return errorResponse(res, 403, `Lesson is locked. Requires ${requiredXp} XP.`);
      }
      return errorResponse(res, 403, "Lesson is locked. Complete the previous lesson first.");
    }

    const normalizedAnswer = answer.toLowerCase();
    const normalizedCorrect = String(challenge.correct_answer || "").trim().toLowerCase();
    const isCorrect = normalizedCorrect && normalizedAnswer === normalizedCorrect;

    const { data: existingAttempt } = await supabase
      .from("challenge_attempts")
      .select("id, is_correct, attempts_count")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    const alreadyRewarded = Boolean(existingAttempt?.is_correct);
    const awardedXp = isCorrect && !alreadyRewarded ? Math.max(0, Number(challenge.points || 0)) : 0;

    const nextAttempts = Number(existingAttempt?.attempts_count || 0) + 1;
    const now = new Date().toISOString();

    if (existingAttempt?.id) {
      const { error: attemptUpdateError } = await supabase
        .from("challenge_attempts")
        .update({
          selected_answer: answer,
          is_correct: existingAttempt.is_correct || isCorrect,
          awarded_xp: alreadyRewarded ? Number(challenge.points || 0) : awardedXp,
          attempts_count: nextAttempts,
          last_attempt_at: now,
          updated_at: now,
        })
        .eq("id", existingAttempt.id);
      if (attemptUpdateError) return errorResponse(res, 400, attemptUpdateError.message);
    } else {
      const { error: attemptInsertError } = await supabase.from("challenge_attempts").insert({
        user_id: userId,
        challenge_id: challengeId,
        selected_answer: answer,
        is_correct: isCorrect,
        awarded_xp: awardedXp,
        attempts_count: 1,
        last_attempt_at: now,
        updated_at: now,
      });
      if (attemptInsertError) return errorResponse(res, 400, attemptInsertError.message);
    }

    let newXp = Number(profile.xp || 0);
    if (awardedXp > 0) {
      newXp += awardedXp;
      const { error: xpError } = await supabase
        .from("users")
        .update({ xp: newXp, updated_at: now })
        .eq("id", userId);
      if (xpError) return errorResponse(res, 400, xpError.message);
    }

    return res.status(200).json({
      ok: true,
      challengeId,
      isCorrect: Boolean(isCorrect),
      explanation: challenge.explanation || "",
      awardedXp,
      totalXp: newXp,
      attempts: nextAttempts,
      alreadyRewarded,
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected submitChallengeAttempt error", { error: err.message });
  }
}

async function upsertPublicProgress(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, 401, "Authenticated user is required");

    const { module, progress, xp } = req.body || {};
    const safeXp = Math.max(0, Number(xp || 0));
    const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));
    const status = safeProgress >= 100 ? "Completed" : safeProgress > 0 ? "In Progress" : "Not Started";

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, role, year_level")
      .eq("id", userId)
      .single();
    if (profileError || !profile) {
      return errorResponse(res, 404, "Student profile not found");
    }
    if (profile.role !== "student") {
      return errorResponse(res, 403, "Only students can update progress");
    }

    const now = new Date().toISOString();
    const progressName = profile.email || userId;

    const { error: xpError } = await supabase
      .from("users")
      .update({ xp: safeXp, updated_at: now })
      .eq("id", userId);
    if (xpError) {
      return errorResponse(res, 400, xpError.message);
    }

    const progressRow = {
      name: progressName,
      module: module || profile.year_level || "General Track",
      progress: safeProgress,
      status,
      last_updated: now,
    };

    const { data: existing, error: existingError } = await supabase
      .from("user_progress")
      .select("id")
      .eq("name", progressRow.name)
      .eq("module", progressRow.module)
      .limit(1)
      .maybeSingle();
    if (existingError) {
      return errorResponse(res, 400, existingError.message);
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("user_progress")
        .update(progressRow)
        .eq("id", existing.id);
      if (updateError) {
        return errorResponse(res, 400, updateError.message);
      }
    } else {
      const { error: insertError } = await supabase.from("user_progress").insert(progressRow);
      if (insertError) {
        return errorResponse(res, 400, insertError.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected upsertPublicProgress error", { error: err.message });
  }
}

module.exports = {
  listPublicCourses,
  listPublicClasses,
  listPublicMaterials,
  listLeaderboard,
  listPublicChallenges,
  debugPublicRoutes,
  listMyCourses,
  listMyChallenges,
  listMyAttempts,
  enrollMyCourse,
  upsertPublicProgress,
  submitChallengeAttempt,
};
