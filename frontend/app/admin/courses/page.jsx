"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./courses.module.css";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/courses", { admin: true });
      setCourses(data?.courses || []);
    } catch (err) {
      alert("Failed to fetch courses: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure?")) return;
    try {
      await apiRequest(`/api/courses/${id}`, { method: "DELETE", admin: true });
      alert("Course deleted successfully");
      await fetchCourses();
    } catch (err) {
      alert("Error deleting course: " + err.message);
    }
  }

  return (
    <AdminShell title="Course Management">
      <div className={styles.container}>
        <button type="button" className={styles.btn_primary} onClick={() => router.push("/admin/courses/new")}>
          Create New Course
        </button>

        {loading ? <p className={styles.loading}>Loading courses...</p> : courses.length === 0 ? <p className={styles.loading}>No courses found</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Name</th><th>Code</th><th>Classes</th><th>Description</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>{course.name}</td>
                    <td>{course.code || "-"}</td>
                    <td>{Array.isArray(course.class_codes) && course.class_codes.length > 0 ? course.class_codes.join(", ") : "All"}</td>
                    <td>{course.description || "-"}</td>
                    <td className={styles.actions}>
                      <div className={styles.actionButtons}>
                        <button type="button" className={styles.btn_edit} onClick={() => router.push(`/admin/courses/${course.id}/edit`)}>Edit</button>
                        <button type="button" className={styles.btn_delete} onClick={() => handleDelete(course.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
