"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "../../courses.module.css";

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params?.courseId);

  const [classes, setClasses] = useState([]);
  const [classSearch, setClassSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", code: "", description: "", instructor: "", classIds: [] });

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!Number.isInteger(courseId) || courseId <= 0) {
        if (alive) setLoading(false);
        return;
      }
      try {
        if (alive) setLoading(true);
        const [classesData, coursesData] = await Promise.all([
          apiRequest("/api/classes", { admin: true }),
          apiRequest("/api/courses", { admin: true }),
        ]);

        if (!alive) return;

        const allClasses = classesData?.classes || [];
        const allCourses = coursesData?.courses || [];
        const course = allCourses.find((row) => Number(row.id) === courseId);

        setClasses(allClasses);
        if (!course) {
          alert("Course not found");
          router.push("/admin/courses");
          return;
        }

        setFormData({
          name: course.name || "",
          code: course.code || "",
          description: course.description || "",
          instructor: course.instructor || "",
          classIds: Array.isArray(course.class_ids) ? course.class_ids.map((id) => Number(id)) : [],
        });
      } catch (err) {
        if (alive) alert("Failed to load course: " + err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [courseId, router]);

  function assignClass(classId) {
    const id = Number(classId);
    if (!Number.isInteger(id) || id <= 0) return;
    if ((formData.classIds || []).includes(id)) return;
    setFormData((prev) => ({ ...prev, classIds: [...(prev.classIds || []), id] }));
  }

  function removeClass(classId) {
    const id = Number(classId);
    setFormData((prev) => ({
      ...prev,
      classIds: (prev.classIds || []).filter((item) => Number(item) !== id),
    }));
  }

  const assignedClassSet = useMemo(() => new Set((formData.classIds || []).map((id) => Number(id))), [formData.classIds]);
  const assignedClasses = useMemo(() => classes.filter((cls) => assignedClassSet.has(Number(cls.id))), [classes, assignedClassSet]);
  const availableClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return classes.filter((cls) => {
      if (assignedClassSet.has(Number(cls.id))) return false;
      if (!q) return true;
      return (
        String(cls.name || "").toLowerCase().includes(q) ||
        String(cls.code || "").toLowerCase().includes(q)
      );
    });
  }, [classes, classSearch, assignedClassSet]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!Number.isInteger(courseId) || courseId <= 0) return;

    setSaving(true);
    try {
      await apiRequest(`/api/courses/${courseId}`, {
        method: "PUT",
        body: {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          instructor: formData.instructor,
          class_ids: formData.classIds,
        },
        admin: true,
      });
      alert("Course updated successfully");
      router.push("/admin/courses");
    } catch (err) {
      alert("Error updating course: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Course Management">
        <div className={styles.container}>
          <p className={styles.loading}>Loading course...</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Course Management">
      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formTitleRow}>
            <h3>Edit Course</h3>
          </div>

          <div className={styles.formGrid}>
            <section className={styles.formSection}>
              <h4>Course Information</h4>
              <label className={styles.fieldLabel}>Course Name</label>
              <input
                type="text"
                placeholder="Introduction to Web Development"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <label className={styles.fieldLabel}>Course Code</label>
              <input
                type="text"
                placeholder="Enter a unique course code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />

              <label className={styles.fieldLabel}>Description</label>
              <textarea
                placeholder="Enter a brief description of the course."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <label className={styles.fieldLabel}>Instructor</label>
              <input
                type="text"
                placeholder="Instructor Name"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              />
            </section>

            <section className={styles.formSection}>
              <h4>Assign to Classes</h4>
              <input
                type="text"
                placeholder="Search class by name or section"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
              />

              <div className={styles.tableWrap}>
                <table className={styles.compactTable}>
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Section</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableClasses.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={styles.emptyCell}>No classes to assign</td>
                      </tr>
                    ) : (
                      availableClasses.slice(0, 8).map((cls) => (
                        <tr key={cls.id}>
                          <td>{cls.name}</td>
                          <td>{cls.code || "-"}</td>
                          <td>
                            <button type="button" className={styles.btn_small_primary} onClick={() => assignClass(cls.id)}>
                              Assign
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <h4 className={styles.subHeading}>Assigned Classes</h4>
              <div className={styles.tableWrap}>
                <table className={styles.compactTable}>
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Section</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedClasses.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={styles.emptyCell}>No classes assigned</td>
                      </tr>
                    ) : (
                      assignedClasses.map((cls) => (
                        <tr key={cls.id}>
                          <td>{cls.name}</td>
                          <td>{cls.code || "-"}</td>
                          <td>
                            <button type="button" className={styles.btn_small_danger} onClick={() => removeClass(cls.id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className={styles.lessonSection}>
            <h4>Add Lesson</h4>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignedClasses.length === 0 ? (
                  <tr>
                    <td colSpan={2} className={styles.emptyCell}>Assign classes above before adding lessons/challenges.</td>
                  </tr>
                ) : (
                  assignedClasses.map((cls) => (
                    <tr key={`lesson-${cls.id}`}>
                      <td>{cls.name}</td>
                      <td>
                        <button type="button" className={styles.btn_small_danger} onClick={() => removeClass(cls.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <div className={styles.form_buttons}>
            <button type="submit" className={styles.btn_primary} disabled={saving}>{saving ? "Updating..." : "Update Course"}</button>
            <button type="button" className={styles.btn_secondary} onClick={() => router.push("/admin/courses")}>Back to Courses</button>
            <button type="button" className={styles.btn_ghost} onClick={() => router.push("/admin/challenges")}>Manage Challenges</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
