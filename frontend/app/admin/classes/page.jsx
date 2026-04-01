"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./classes.module.css";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <Link href="/admin/classes/new" className={styles.btn_primary_link}>
          Add New Class
        </Link>

        {loading ? (
          <p>Loading...</p>
        ) : classes.length === 0 ? (
          <p>No classes found</p>
        ) : (
          <div className={styles.tableWrap}>
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
                      <div className={styles.actionButtons}>
                        <Link href={`/admin/classes/${cls.id}/edit`} className={styles.btn_edit_link}>Edit</Link>
                        <button type="button" className={styles.btn_delete} onClick={() => handleDelete(cls.id)}>Delete</button>
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
