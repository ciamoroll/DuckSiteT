"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "../challenges.module.css";

export default function NewChallengePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    course_id: "",
    question_text: "",
    optionsText: "",
    correct_answer: "",
    explanation: "",
    lesson_order: 1,
    required_xp: 0,
    points: 10,
    status: "Active",
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      const data = await apiRequest("/api/courses", { admin: true });
      setCourses(data?.courses || []);
    } catch (_err) {
      setCourses([]);
    }
  }

  async function handleCourseChange(courseId) {
    setFormData({ ...formData, course_id: courseId });
    if (!courseId) return;

    try {
      const data = await apiRequest("/api/challenges", { admin: true });
      const courseChallenges = (data?.challenges || []).filter(
        (ch) => Number(ch.course_id) === Number(courseId)
      );
      const maxLessonOrder = Math.max(
        0,
        ...courseChallenges.map((ch) => Number(ch.lesson_order || 0))
      );
      setFormData((prev) => ({
        ...prev,
        course_id: courseId,
        lesson_order: maxLessonOrder + 1,
      }));
    } catch (_err) {
      // Fallback: just set course_id without auto-suggestion
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const options = formData.optionsText
      .split("\n")
      .map((opt) => opt.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title,
      course_id: formData.course_id ? Number(formData.course_id) : null,
      question_text: formData.question_text,
      options,
      correct_answer: formData.correct_answer.trim(),
      explanation: formData.explanation,
      lesson_order: Number(formData.lesson_order || 1),
      required_xp: Number(formData.required_xp || 0),
      points: Number(formData.points || 0),
      status: formData.status,
    };

    try {
      setSaving(true);
      await apiRequest("/api/challenges", {
        method: "POST",
        body: payload,
        admin: true,
      });
      alert("Challenge created successfully");
      router.push("/admin/challenges");
    } catch (err) {
      alert("Error saving challenge: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Challenge Management">
      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formTitleRow}>
            <h3>Create New Challenge</h3>
          </div>

          <div className={styles.formGrid}>
            <section className={styles.formSection}>
              <h4>Challenge Information</h4>
              <label className={styles.fieldLabel}>Challenge Title</label>
              <input type="text" placeholder="Challenge Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />

              <label className={styles.fieldLabel}>Course</label>
              <select value={formData.course_id} onChange={(e) => handleCourseChange(e.target.value)} required>
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>

              <label className={styles.fieldLabel}>Question Text</label>
              <textarea placeholder="Question text" value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} required />

              <label className={styles.fieldLabel}>Options</label>
              <textarea placeholder="Options (one per line)" value={formData.optionsText} onChange={(e) => setFormData({ ...formData, optionsText: e.target.value })} required />

              <label className={styles.fieldLabel}>Correct Answer</label>
              <input type="text" placeholder="Correct answer (must match one option)" value={formData.correct_answer} onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })} required />

              <label className={styles.fieldLabel}>Explanation</label>
              <textarea placeholder="Explanation (optional)" value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} />
            </section>

            <section className={styles.formSection}>
              <h4>Progress & Rewards</h4>

              <label className={styles.fieldLabel}>Task Order</label>
              <input type="number" placeholder="Task Order" value={formData.lesson_order} onChange={(e) => setFormData({ ...formData, lesson_order: parseInt(e.target.value, 10) || 1 })} min={1} />

              <label className={styles.fieldLabel}>Required XP</label>
              <input type="number" placeholder="Required XP" value={formData.required_xp} onChange={(e) => setFormData({ ...formData, required_xp: parseInt(e.target.value, 10) || 0 })} min={0} />

              <label className={styles.fieldLabel}>Points</label>
              <input type="number" placeholder="Points" value={formData.points} onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value, 10) || 0 })} />

              <label className={styles.fieldLabel}>Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </section>
          </div>

          <div className={styles.form_buttons}>
            <button type="submit" className={styles.btn_primary} disabled={saving}>{saving ? "Creating..." : "Create Challenge"}</button>
            <button type="button" className={styles.btn_secondary} onClick={() => router.push("/admin/challenges")}>Back to Challenges</button>
            <button type="button" className={styles.btn_ghost} onClick={() => router.push("/admin/courses")}>Manage Courses</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
