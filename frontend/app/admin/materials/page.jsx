"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./materials.module.css";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", course_id: "", file_url: "" });
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    Promise.all([fetchMaterials(), fetchCourses()]);
  }, []);

  async function fetchMaterials() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/materials", { admin: true });
      setMaterials(data?.materials || []);
    } catch (err) {
      alert("Failed to fetch materials: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const data = await apiRequest("/api/courses", { admin: true });
      setCourses(data?.courses || []);
    } catch (err) {
      console.log("Failed to fetch courses");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/api/materials/${editingId}`, {
          method: "PUT",
          body: formData,
          admin: true,
        });
        alert("Material updated successfully");
      } else {
        await apiRequest("/api/materials", {
          method: "POST",
          body: formData,
          admin: true,
        });
        alert("Material created successfully");
      }
      setFormData({ title: "", description: "", course_id: "", file_url: "" });
      setEditingId(null);
      setShowForm(false);
      await fetchMaterials();
    } catch (err) {
      alert("Error saving material: " + err.message);
    }
  }

  function handleEdit(material) {
    setFormData({
      title: material.title || "",
      description: material.description || "",
      course_id: material.course_id || "",
      file_url: material.file_url || "",
    });
    setEditingId(material.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure?")) return;
    try {
      await apiRequest(`/api/materials/${id}`, { method: "DELETE", admin: true });
      alert("Material deleted successfully");
      await fetchMaterials();
    } catch (err) {
      alert("Error deleting material: " + err.message);
    }
  }

  return (
    <AdminShell title="Material Management">
      <div className={styles.container}>
        <button className={styles.btn_primary} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add New Material"}
        </button>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit Material" : "Add New Material"}</h3>
            <input type="text" placeholder="Material Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <select value={formData.course_id} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}>
              <option value="">Select Course</option>
              {courses.map((course) => (<option key={course.id} value={course.id}>{course.name}</option>))}
            </select>
            <input type="url" placeholder="File URL" value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} />
            <div className={styles.form_buttons}>
              <button type="submit" className={styles.btn_primary}>{editingId ? "Update" : "Create"}</button>
              <button type="button" className={styles.btn_secondary} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? <p>Loading...</p> : materials.length === 0 ? <p>No materials found</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Title</th><th>Course</th><th>File URL</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {materials.map((material) => {
                  const courseName = courses.find((c) => c.id === material.course_id)?.name || "—";
                  return (
                    <tr key={material.id}>
                      <td>{material.title || "—"}</td>
                      <td>{courseName}</td>
                      <td>{material.file_url ? <a href={material.file_url} target="_blank">View</a> : "—"}</td>
                      <td className={styles.actions}>
                        <div className={styles.actionButtons}>
                          <button className={styles.btn_edit} onClick={() => handleEdit(material)}>Edit</button>
                          <button className={styles.btn_delete} onClick={() => handleDelete(material.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
