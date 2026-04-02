"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "../../classes.module.css";

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = Number(params?.classId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    instructor: "",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!Number.isInteger(classId) || classId <= 0) {
        if (alive) setLoading(false);
        return;
      }

      try {
        if (alive) setLoading(true);
        const data = await apiRequest("/api/classes", { admin: true });
        if (!alive) return;

        const found = (data?.classes || []).find((row) => Number(row.id) === classId);
        if (!found) {
          alert("Class not found");
          router.push("/admin/classes");
          return;
        }

        setFormData({
          name: found.name || "",
          code: found.code || "",
          instructor: found.instructor || "",
        });


      } catch (err) {
        if (alive) alert("Failed to load class: " + err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [classId, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!Number.isInteger(classId) || classId <= 0) return;

    setSaving(true);
    try {
      await apiRequest(`/api/classes/${classId}`, {
        method: "PUT",
        body: formData,
        admin: true,
      });
      alert("Class updated successfully");
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
        {loading ? (
          <p>Loading class...</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h3>Edit Class</h3>
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

            <div className={styles.form_buttons}>
              <button type="submit" className={styles.btn_primary} disabled={saving}>{saving ? "Updating..." : "Update"}</button>
              <button type="button" className={styles.btn_secondary} onClick={() => router.push("/admin/classes")}>Back to Classes</button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
