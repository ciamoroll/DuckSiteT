"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./challenges.module.css";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
    completed: 0,
  });
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
      completed: Number(formData.completed || 0),
    };

    try {
      if (editingId) {
        await apiRequest(`/api/challenges/${editingId}`, {
          method: "PUT",
          body: payload,
          admin: true,
        });
        alert("Challenge updated successfully");
      } else {
        await apiRequest("/api/challenges", {
          method: "POST",
          body: payload,
          admin: true,
        });
        alert("Challenge created successfully");
      }
      setFormData({
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
        completed: 0,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchChallenges();
    } catch (err) {
      alert("Error saving challenge: " + err.message);
    }
  }

  function handleEdit(challenge) {
    setFormData({
      title: challenge.title || "",
      course_id: challenge.course_id ? String(challenge.course_id) : "",
      question_text: challenge.question_text || "",
      optionsText: Array.isArray(challenge.options) ? challenge.options.join("\n") : "",
      correct_answer: challenge.correct_answer || "",
      explanation: challenge.explanation || "",
      lesson_order: Number(challenge.lesson_order || 1),
      required_xp: Number(challenge.required_xp || 0),
      points: challenge.points || 10,
      status: challenge.status || "Active",
      completed: challenge.completed || 0,
    });
    setEditingId(challenge.id);
    setShowForm(true);
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
        <button className={styles.btn_primary} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add New Challenge"}
        </button>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit Challenge" : "Add New Challenge"}</h3>
            <input type="text" placeholder="Challenge Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            <select value={formData.course_id} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })} required>
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
            <textarea placeholder="Question text" value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} required />
            <textarea placeholder="Options (one per line)" value={formData.optionsText} onChange={(e) => setFormData({ ...formData, optionsText: e.target.value })} required />
            <input type="text" placeholder="Correct answer (must match one option)" value={formData.correct_answer} onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })} required />
            <textarea placeholder="Explanation (optional)" value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} />
            <input type="number" placeholder="Lesson Order (1,2,3...)" value={formData.lesson_order} onChange={(e) => setFormData({ ...formData, lesson_order: parseInt(e.target.value) || 1 })} min={1} />
            <input type="number" placeholder="Required XP to unlock" value={formData.required_xp} onChange={(e) => setFormData({ ...formData, required_xp: parseInt(e.target.value) || 0 })} min={0} />
            <input type="number" placeholder="Points" value={formData.points} onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} />
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <div className={styles.form_buttons}>
              <button type="submit" className={styles.btn_primary}>{editingId ? "Update" : "Create"}</button>
              <button type="button" className={styles.btn_secondary} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? <p>Loading...</p> : challenges.length === 0 ? <p>No challenges found</p> : (
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
                      <button className={styles.btn_edit} onClick={() => handleEdit(challenge)}>Edit</button>
                      <button className={styles.btn_delete} onClick={() => handleDelete(challenge.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
