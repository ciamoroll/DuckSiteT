"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./classes.module.css";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    instructor: "",
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/classes", { admin: true });
      setClasses(data?.classes || []);
    } catch (err) {
      alert("Failed to fetch classes: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/api/classes/${editingId}`, {
          method: "PUT",
          body: formData,
          admin: true,
        });
        alert("Class updated successfully");
      } else {
        await apiRequest("/api/classes", {
          method: "POST",
          body: formData,
          admin: true,
        });
        alert("Class created successfully");
      }

      setFormData({ name: "", code: "", instructor: "" });
      setEditingId(null);
      setShowForm(false);
      await fetchClasses();
    } catch (err) {
      alert("Error saving class: " + err.message);
    }
  }

  function handleEdit(cls) {
    setFormData({
      name: cls.name,
      code: cls.code || "",
      instructor: cls.instructor || "",
    });
    setEditingId(cls.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure?")) return;
    try {
      await apiRequest(`/api/classes/${id}`, { method: "DELETE", admin: true });
      alert("Class deleted successfully");
      await fetchClasses();
    } catch (err) {
      alert("Error deleting class: " + err.message);
    }
  }

  return (
    <AdminShell title="Class Management">
      <div className={styles.container}>
        <button className={styles.btn_primary} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add New Class"}
        </button>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit Class" : "Add New Class"}</h3>
            <input
              type="text"
              placeholder="Class Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Class Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Instructor Name"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              required
            />
            <div className={styles.form_buttons}>
              <button type="submit" className={styles.btn_primary}>
                {editingId ? "Update" : "Create"}
              </button>
              <button type="button" className={styles.btn_secondary} onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : classes.length === 0 ? (
          <p>No classes found</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Instructor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id}>
                  <td>{cls.name}</td>
                  <td>{cls.code || "-"}</td>
                  <td>{cls.instructor || "-"}</td>
                  <td className={styles.actions}>
                    <button className={styles.btn_edit} onClick={() => handleEdit(cls)}>Edit</button>
                    <button className={styles.btn_delete} onClick={() => handleDelete(cls.id)}>Delete</button>
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
