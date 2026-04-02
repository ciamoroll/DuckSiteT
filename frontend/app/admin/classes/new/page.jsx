"use client";

import { useState, useEffect } from "react";
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

    useEffect(() => {
    // Use localStorage keys that are set during admin login
    if (typeof window !== "undefined") {
        const firstName = localStorage.getItem("firstName") || "";
        const lastName = localStorage.getItem("lastName") || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || "";

      if (fullName) {
        setFormData((prev) => ({
          ...prev,
          instructor: fullName,
        }));
      }
    }
  }, []);

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
          />
          <small style={{ color: "#666", marginTop: "4px", display: "block" }}>Auto-filled with your name. Leave blank or edit as needed.</small>
          <div className={styles.form_buttons}>
            <button type="submit" className={styles.btn_primary} disabled={saving}>{saving ? "Creating..." : "Create"}</button>
            <button type="button" className={styles.btn_secondary} onClick={() => router.push("/admin/classes")}>Back to Classes</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
