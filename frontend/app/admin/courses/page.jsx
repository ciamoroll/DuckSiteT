"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./courses.module.css";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "", classIds: [] });

  useEffect(() => {
    Promise.all([fetchCourses(), fetchClasses()]);
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

  async function fetchClasses() {
    try {
      const data = await apiRequest("/api/classes", { admin: true });
      setClasses(data?.classes || []);
    } catch (_err) {
      setClasses([]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      class_ids: formData.classIds,
    };

    try {
      if (editingId) {
        await apiRequest(`/api/courses/${editingId}`, {
          method: "PUT",
          body: payload,
          admin: true,
        });
        alert("Course updated successfully");
      } else {
        await apiRequest("/api/courses", {
          method: "POST",
          body: payload,
          admin: true,
        });
        alert("Course created successfully");
      }
      setFormData({ name: "", code: "", description: "", classIds: [] });
      setEditingId(null);
      setShowForm(false);
      await fetchCourses();
    } catch (err) {
      alert("Error saving course: " + err.message);
    }
  }

  function handleEdit(course) {
    setFormData({
      name: course.name,
      code: course.code || "",
      description: course.description || "",
      classIds: Array.isArray(course.class_ids) ? course.class_ids : [],
    });
    setEditingId(course.id);
    setShowForm(true);
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
        <button className={styles.btn_primary} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add New Course"}
        </button>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit Course" : "Add New Course"}</h3>
            <input
              type="text"
              placeholder="Course Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Course Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <input
              type="text"
              placeholder="Allowed Class IDs (advanced)"
              value={(formData.classIds || []).join(",")}
              onChange={(e) => {
                const ids = e.target.value
                  .split(",")
                  .map((value) => Number(value.trim()))
                  .filter((id) => Number.isInteger(id) && id > 0);
                setFormData({ ...formData, classIds: ids });
              }}
            />
            <p>Available classes: {classes.map((cls) => `${cls.name} (${cls.code}) [${cls.id}]`).join(", ") || "No classes yet"}</p>
            <div className={styles.form_buttons}>
              <button type="submit" className={styles.btn_primary}>{editingId ? "Update" : "Create"}</button>
              <button type="button" className={styles.btn_secondary} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? <p>Loading...</p> : courses.length === 0 ? <p>No courses found</p> : (
          <table className={styles.table}>
            <thead>
              <tr><th>Name</th><th>Code</th><th>Classes</th><th>Description</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>{course.name}</td>
                  <td>{course.code || "—"}</td>
                  <td>{Array.isArray(course.class_codes) && course.class_codes.length > 0 ? course.class_codes.join(", ") : "All"}</td>
                  <td>{course.description || "—"}</td>
                  <td className={styles.actions}>
                    <button className={styles.btn_edit} onClick={() => handleEdit(course)}>Edit</button>
                    <button className={styles.btn_delete} onClick={() => handleDelete(course.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
