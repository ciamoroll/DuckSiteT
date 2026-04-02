const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");

function toUniqueIds(value) {
  if (!Array.isArray(value)) return [];
  const set = new Set();
  for (const item of value) {
    const id = Number(item);
    if (Number.isInteger(id) && id > 0) set.add(id);
  }
  return Array.from(set);
}

async function attachCourseClasses(courses) {
  if (!Array.isArray(courses) || courses.length === 0) return [];
  const courseIds = courses.map((course) => Number(course.id)).filter((id) => Number.isInteger(id));
  if (courseIds.length === 0) return courses;

  const { data: links, error: linksError } = await supabase
    .from("course_classes")
    .select("course_id, class_id")
    .in("course_id", courseIds);
  if (linksError) throw new Error(linksError.message);

  const classIds = Array.from(new Set((links || []).map((row) => Number(row.class_id)).filter((id) => Number.isInteger(id))));
  let classMap = new Map();
  if (classIds.length > 0) {
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, code, name")
      .in("id", classIds);
    if (classesError) throw new Error(classesError.message);
    classMap = new Map((classes || []).map((cls) => [Number(cls.id), cls]));
  }

  const linksByCourse = new Map();
  for (const row of links || []) {
    const courseId = Number(row.course_id);
    const classId = Number(row.class_id);
    if (!linksByCourse.has(courseId)) linksByCourse.set(courseId, []);
    linksByCourse.get(courseId).push(classId);
  }

  return courses.map((course) => {
    const ids = linksByCourse.get(Number(course.id)) || [];
    const classCodes = ids
      .map((id) => classMap.get(id)?.code)
      .filter(Boolean);
    return {
      ...course,
      class_ids: ids,
      class_codes: classCodes,
      classes: classCodes,
    };
  });
}

function isCourseEnrollmentsMissing(error) {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return message.includes("course_enrollments") && (
    message.includes("does not exist") ||
    message.includes("undefined table") ||
    message.includes("relation")
  );
}

async function autoEnrollStudentsForClasses(courseId, classIds) {
  const uniqueClassIds = toUniqueIds(classIds);
  if (!Number.isInteger(Number(courseId)) || uniqueClassIds.length === 0) return;

  const { data: students, error: studentsError } = await supabase
    .from("users")
    .select("id")
    .eq("role", "student")
    .in("class_id", uniqueClassIds);
  if (studentsError) throw new Error(studentsError.message);

  const rows = (students || []).map((student) => ({
    user_id: student.id,
    course_id: Number(courseId),
  }));
  if (rows.length === 0) return;

  const { error: enrollError } = await supabase
    .from("course_enrollments")
    .upsert(rows, { onConflict: "user_id,course_id" });
  if (enrollError) {
    if (isCourseEnrollmentsMissing(enrollError)) return;
    throw new Error(enrollError.message);
  }
}

async function autoUnenrollStudentsOutsideClasses(courseId, classIds) {
  const uniqueClassIds = toUniqueIds(classIds);
  if (!Number.isInteger(Number(courseId)) || uniqueClassIds.length === 0) return;

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("course_enrollments")
    .select("user_id")
    .eq("course_id", Number(courseId));
  if (enrollmentsError) {
    if (isCourseEnrollmentsMissing(enrollmentsError)) return;
    throw new Error(enrollmentsError.message);
  }

  const enrolledUserIds = (enrollments || []).map((row) => row.user_id).filter(Boolean);
  if (enrolledUserIds.length === 0) return;

  const { data: students, error: studentsError } = await supabase
    .from("users")
    .select("id, class_id")
    .eq("role", "student")
    .in("id", enrolledUserIds);
  if (studentsError) throw new Error(studentsError.message);

  const toRemoveUserIds = (students || [])
    .filter((student) => !uniqueClassIds.includes(Number(student.class_id)))
    .map((student) => student.id)
    .filter(Boolean);
  if (toRemoveUserIds.length === 0) return;

  const { error: removeError } = await supabase
    .from("course_enrollments")
    .delete()
    .eq("course_id", Number(courseId))
    .in("user_id", toRemoveUserIds);
  if (removeError) throw new Error(removeError.message);
}

async function listCourses(_req, res) {
  try {
    const { data, error } = await supabase.from("courses").select("*").order("id", { ascending: false });
    if (error) return errorResponse(res, 400, error.message);
    const courses = await attachCourseClasses(data || []);
    return res.status(200).json({ ok: true, courses });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected listCourses error", { error: err.message });
  }
}

async function createCourse(req, res) {
  try {
    const raw = req.body || {};
    const classIds = toUniqueIds(raw.class_ids || raw.classIds || []);
    const payload = {
      name: raw.name,
      code: raw.code,
      description: raw.description,
      instructor: raw.instructor || "",
      classes: [],
      lessons: raw.lessons,
      materials: raw.materials,
    };
    if (!payload.name || !payload.code) {
      return errorResponse(res, 400, "name and code are required");
    }
    const { data, error } = await supabase.from("courses").insert(payload).select().single();
    if (error) return errorResponse(res, 400, error.message);

    if (classIds.length > 0) {
      const rows = classIds.map((classId) => ({ course_id: data.id, class_id: classId }));
      const { error: linkError } = await supabase
        .from("course_classes")
        .upsert(rows, { onConflict: "course_id,class_id" });
      if (linkError) return errorResponse(res, 400, linkError.message);

      await autoEnrollStudentsForClasses(data.id, classIds);
    }

    const [course] = await attachCourseClasses([data]);

    return res.status(201).json({ ok: true, course });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected createCourse error", { error: err.message });
  }
}

async function updateCourse(req, res) {
  try {
    const { id } = req.params;
    const raw = req.body || {};
    const payload = {};
    const hasClassIds = raw.class_ids !== undefined || raw.classIds !== undefined;
    const classIds = toUniqueIds(raw.class_ids || raw.classIds || []);
    if (raw.name !== undefined) payload.name = raw.name;
    if (raw.code !== undefined) payload.code = raw.code;
    if (raw.description !== undefined) payload.description = raw.description;
    if (raw.instructor !== undefined) payload.instructor = raw.instructor;
    if (raw.lessons !== undefined) payload.lessons = raw.lessons;
    if (raw.materials !== undefined) payload.materials = raw.materials;

    if (Object.keys(payload).length === 0 && !hasClassIds) {
      return errorResponse(res, 400, "No valid fields to update");
    }

    let data = null;
    if (Object.keys(payload).length > 0) {
      const result = await supabase
        .from("courses")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      data = result.data;
      if (result.error) return errorResponse(res, 400, result.error.message);
    } else {
      const result = await supabase.from("courses").select("*").eq("id", id).single();
      data = result.data;
      if (result.error) return errorResponse(res, 400, result.error.message);
    }

    if (hasClassIds) {
      const { error: deleteError } = await supabase.from("course_classes").delete().eq("course_id", id);
      if (deleteError) return errorResponse(res, 400, deleteError.message);

      if (classIds.length > 0) {
        const rows = classIds.map((classId) => ({ course_id: Number(id), class_id: classId }));
        const { error: linkError } = await supabase
          .from("course_classes")
          .upsert(rows, { onConflict: "course_id,class_id" });
        if (linkError) return errorResponse(res, 400, linkError.message);

        await autoEnrollStudentsForClasses(id, classIds);
        await autoUnenrollStudentsOutsideClasses(id, classIds);
      }
    }

    const [course] = await attachCourseClasses([data]);
    return res.status(200).json({ ok: true, course });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected updateCourse error", { error: err.message });
  }
}

async function deleteCourse(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return errorResponse(res, 400, error.message);
    return res.status(200).json({ ok: true, message: "Course deleted" });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected deleteCourse error", { error: err.message });
  }
}

module.exports = { listCourses, createCourse, updateCourse, deleteCourse };
