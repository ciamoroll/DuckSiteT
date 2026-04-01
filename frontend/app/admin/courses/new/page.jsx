"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "../courses.module.css";

export default function NewCoursePage() {
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [classSearch, setClassSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", description: "", classIds: [] });

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      const data = await apiRequest("/api/classes", { admin: true });
      setClasses(data?.classes || []);
    } catch (_err) {
      setClasses([]);
    }
  }

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
    setSaving(true);
    try {
      await apiRequest("/api/courses", {
        method: "POST",
        body: {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          class_ids: formData.classIds,
        },
        admin: true,
      });
      alert("Course created successfully");
      router.push("/admin/courses");
    } catch (err) {
      alert("Error saving course: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Course Management">
      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formTitleRow}>
            <h3>Create New Course</h3>
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
            <button type="submit" className={styles.btn_primary} disabled={saving}>{saving ? "Creating..." : "Create Course"}</button>
            <button type="button" className={styles.btn_secondary} onClick={() => router.push("/admin/courses")}>Back to Courses</button>
            <button type="button" className={styles.btn_ghost} onClick={() => router.push("/admin/challenges")}>Manage Challenges</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
