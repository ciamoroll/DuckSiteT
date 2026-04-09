"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./users.module.css";

const ALLOWED_EMAIL_DOMAIN = "paterostechnologicalcollege.edu.ph";

function isAllowedInstitutionalEmail(value) {
  return String(value || "").trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
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
        middle_name: formData.middleName,
        last_name: formData.lastName,
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
        const password = String(formData.password || "").trim();
        if (!password) {
          alert("Password is required for new users.");
          return;
        }
        if (!isAllowedInstitutionalEmail(formData.email)) {
          alert(`Only institutional email addresses ending with @${ALLOWED_EMAIL_DOMAIN} are allowed.`);
          return;
        }

        await apiRequest("/api/users", {
          method: "POST",
          body: { ...payload, email: formData.email.toLowerCase().trim(), password },
          admin: true,
        });
        alert("User created successfully");
      }

      setFormData({ firstName: "", middleName: "", lastName: "", email: "", password: "", yearLevel: "" });
      setEditingId(null);
      setShowPassword(false);
      setShowForm(false);
      await fetchUsers();
    } catch (err) {
      alert("Error saving user: " + err.message);
    }
  }

  function handleEdit(user) {
    setFormData({
      firstName: user.first_name,
      middleName: user.middle_name || "",
      lastName: user.last_name,
      email: user.email,
      password: "",
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
    setShowPassword(false);
    setFormData({ firstName: "", middleName: "", lastName: "", email: "", password: "", yearLevel: "" });
  }

  function handleClearSearch() {
    setSearchTerm("");
  }

  const filteredUsers = users.filter((user) => {
    const query = String(searchTerm || "").trim().toLowerCase();
    if (!query) return true;

    const fullName = `${user.first_name || ""} ${user.middle_name || ""} ${user.last_name || ""}`.toLowerCase();
    const email = String(user.email || "").toLowerCase();
    const yearLevel = String(user.year_level || "").toLowerCase();

    return fullName.includes(query) || email.includes(query) || yearLevel.includes(query);
  });

  return (
    <AdminShell title="User Management">
      <div className={styles.container}>
        <button className={styles.btn_primary} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add New User"}
        </button>

        <div className={styles.searchBar}>
          <label htmlFor="student-search">Search Students</label>
          <div className={styles.searchControls}>
            <input
              id="student-search"
              type="text"
              placeholder="Search by name, email, or year level"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className={styles.btn_clear}
              onClick={handleClearSearch}
              disabled={!searchTerm}
            >
              Clear Search
            </button>
          </div>
        </div>

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
              placeholder="Middle Name (Optional)"
              value={formData.middleName}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
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
              disabled={Boolean(editingId)}
              required
            />
            {editingId ? <small className={styles.loading}>Email is locked for security. Create a new user to change email.</small> : null}
            {!editingId ? (
              <>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (8+ chars, uppercase, number, symbol)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className={styles.btn_secondary}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide Password" : "Show Password"}
                </button>
                <small className={styles.loading}>Set the student&apos;s login password. Share this securely with the student.</small>
              </>
            ) : null}
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
        ) : filteredUsers.length === 0 ? (
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
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{[user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ")}</td>
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
