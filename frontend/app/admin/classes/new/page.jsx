"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "../classes.module.css";

export default function NewClassPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    instructor: "",
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/api/classes", {
        method: "POST",
        body: formData,
        admin: true,
      });
      alert("Class created successfully");
      router.push("/admin/classes");
    } catch (err) {
      alert("Error saving class: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Class Management">
      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3>Add New Class</h3>
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
            <button type="submit" className={styles.btn_primary} disabled={saving}>{saving ? "Creating..." : "Create"}</button>
            <button type="button" className={styles.btn_secondary} onClick={() => router.push("/admin/classes")}>Back to Classes</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
