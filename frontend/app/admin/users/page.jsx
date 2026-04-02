"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./users.module.css";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    yearLevel: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/users", { admin: true });
      const visibleUsers = (data?.users || []).filter((user) => String(user?.role || "").toLowerCase() !== "admin");
      setUsers(visibleUsers);
    } catch (err) {
      alert("Failed to fetch users: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email.toLowerCase().trim(),
        role: "student",
        year_level: formData.yearLevel || null,
      };

      if (editingId) {
        await apiRequest(`/api/users/${editingId}`, {
          method: "PUT",
          body: payload,
          admin: true,
        });
        alert("User updated successfully");
      } else {
        await apiRequest("/api/users", {
          method: "POST",
          body: { ...payload, password: "TempPass@123" },
          admin: true,
        });
        alert("User created successfully");
      }

      setFormData({ firstName: "", lastName: "", email: "", yearLevel: "" });
      setEditingId(null);
      setShowForm(false);
      await fetchUsers();
    } catch (err) {
      alert("Error saving user: " + err.message);
    }
  }

  function handleEdit(user) {
    setFormData({
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      yearLevel: user.year_level || "",
    });
    setEditingId(user.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiRequest(`/api/users/${id}`, { method: "DELETE", admin: true });
      alert("User deleted successfully");
      await fetchUsers();
    } catch (err) {
      alert("Error deleting user: " + err.message);
    }
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormData({ firstName: "", lastName: "", email: "", yearLevel: "" });
  }

  return (
    <AdminShell title="User Management">
      <div className={styles.container}>
        <button className={styles.btn_primary} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add New User"}
        </button>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit User" : "Add New User"}</h3>
            <input
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Year Level (e.g., 1st, 2nd, 3rd, 4th)"
              value={formData.yearLevel}
              onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
            />
            <div className={styles.form_buttons}>
              <button type="submit" className={styles.btn_primary}>
                {editingId ? "Update" : "Create"}
              </button>
              <button type="button" className={styles.btn_secondary} onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className={styles.loading}>Loading users...</p>
        ) : users.length === 0 ? (
          <p className={styles.empty}>No users found</p>
        ) : (
          <div className={styles.table_container}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Year Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.first_name} {user.last_name}</td>
                    <td>{user.email}</td>
                    <td><span className={`${styles.badge} ${styles[`badge_${user.role}`]}`}>{user.role}</span></td>
                    <td>{user.year_level || "—"}</td>
                    <td className={styles.actions}>
                      <div className={styles.actionButtons}>
                        <button className={styles.btn_edit} onClick={() => handleEdit(user)}>Edit</button>
                        <button className={styles.btn_delete} onClick={() => handleDelete(user.id)}>Delete</button>
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
