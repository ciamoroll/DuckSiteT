"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./challenges.module.css";

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    Promise.all([fetchChallenges(), fetchCourses()]);
  }, []);

  async function fetchChallenges() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/challenges", { admin: true });
      setChallenges(data?.challenges || []);
    } catch (err) {
      alert("Failed to fetch challenges: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const data = await apiRequest("/api/courses", { admin: true });
      setCourses(data?.courses || []);
    } catch (_err) {
      setCourses([]);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure?")) return;
    try {
      await apiRequest(`/api/challenges/${id}`, { method: "DELETE", admin: true });
      alert("Challenge deleted successfully");
      await fetchChallenges();
    } catch (err) {
      alert("Error deleting challenge: " + err.message);
    }
  }

  return (
    <AdminShell title="Challenge Management">
      <div className={styles.container}>
        <button type="button" className={styles.btn_primary} onClick={() => router.push("/admin/challenges/new")}>
          Create New Challenge
        </button>

        {loading ? <p className={styles.loading}>Loading challenges...</p> : challenges.length === 0 ? <p className={styles.loading}>No challenges found</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Title</th><th>Course</th><th>Lesson</th><th>Unlock XP</th><th>Points</th><th>Status</th><th>Completed</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {challenges.map((challenge) => {
                  const courseName = courses.find((course) => course.id === challenge.course_id)?.name || "—";
                  return (
                    <tr key={challenge.id}>
                      <td>{challenge.title || "—"}</td>
                      <td>{courseName}</td>
                      <td>{Number(challenge.lesson_order || 1)}</td>
                      <td>{Number(challenge.required_xp || 0)}</td>
                      <td>{challenge.points || 0}</td>
                      <td>{challenge.status || "Active"}</td>
                      <td>{challenge.completed || 0}</td>
                      <td className={styles.actions}>
                        <div className={styles.actionButtons}>
                          <button type="button" className={styles.btn_edit} onClick={() => router.push(`/admin/challenges/${challenge.id}/edit`)}>Edit</button>
                          <button type="button" className={styles.btn_delete} onClick={() => handleDelete(challenge.id)}>Delete</button>
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
