"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "../../challenges.module.css";

export default function EditChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = Number(params?.challengeId);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    course_id: "",
    lesson_order: 1,
    required_xp: 0,
    points: 10,
    status: "Active",
    questions: [],
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!Number.isInteger(challengeId) || challengeId <= 0) {
        if (alive) setLoading(false);
        return;
      }

      try {
        const [challengesData, coursesData] = await Promise.all([
          apiRequest("/api/challenges", { admin: true }),
          apiRequest("/api/courses", { admin: true }),
        ]);

        if (!alive) return;
        const found = (challengesData?.challenges || []).find((row) => Number(row.id) === challengeId);
        if (!found) {
          alert("Challenge not found");
          router.push("/admin/challenges");
          return;
        }

        setCourses(coursesData?.courses || []);

        // Handle both new format (questions array) and old format (single question fields)
        const questions = Array.isArray(found.questions) && found.questions.length > 0
          ? found.questions.map((q) => ({
              id: q.id || `q-${Date.now()}`,
              text: q.text || q.question_text || "",
              optionsText: Array.isArray(q.options) ? q.options.join("\n") : "",
              correct_answer: q.correct_answer || "",
              explanation: q.explanation || "",
            }))
          : [
              {
                id: "q1",
                text: found.question_text || "",
                optionsText: Array.isArray(found.options) ? found.options.join("\n") : "",
                correct_answer: found.correct_answer || "",
                explanation: found.explanation || "",
              },
            ];

        setFormData({
          title: found.title || "",
          course_id: found.course_id ? String(found.course_id) : "",
          lesson_order: Number(found.lesson_order || 1),
          required_xp: Number(found.required_xp || 0),
          points: found.points || 10,
          status: found.status || "Active",
          questions,
        });
      } catch (err) {
        if (alive) alert("Failed to load challenge: " + err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [challengeId, router]);

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
      // Fallback
    }
  }

  function updateQuestion(index, field, value) {
    const newQuestions = [...formData.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value,
    };
    setFormData({ ...formData, questions: newQuestions });
  }

  function addQuestion() {
    const newId = `q${formData.questions.length + 1}`;
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          id: newId,
          text: "",
          optionsText: "",
          correct_answer: "",
          explanation: "",
        },
      ],
    });
  }

  function removeQuestion(index) {
    if (formData.questions.length <= 1) {
      alert("You must have at least one question");
      return;
    }
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const questions = formData.questions.map((q) => {
      const options = q.optionsText
        .split("\n")
        .map((opt) => opt.trim())
        .filter(Boolean);
      return {
        text: q.text.trim(),
        options,
        correct_answer: q.correct_answer.trim(),
        explanation: q.explanation.trim(),
      };
    });

    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    for (const q of questions) {
      if (!q.text) {
        alert("All questions must have text");
        return;
      }
      if (q.options.length < 2) {
        alert("Each question must have at least 2 options");
        return;
      }
      if (!q.correct_answer) {
        alert("Each question must have a correct answer");
        return;
      }
      if (!q.options.includes(q.correct_answer)) {
        alert("Correct answer must match one of the options");
        return;
      }
    }

    const payload = {
      title: formData.title,
      course_id: formData.course_id ? Number(formData.course_id) : null,
      questions,
      lesson_order: Number(formData.lesson_order || 1),
      required_xp: Number(formData.required_xp || 0),
      points: Number(formData.points || 0),
      status: formData.status,
    };

    try {
      setSaving(true);
      await apiRequest(`/api/challenges/${challengeId}`, {
        method: "PUT",
        body: payload,
        admin: true,
      });
      alert("Challenge updated successfully");
      router.push("/admin/challenges");
    } catch (err) {
      alert("Error saving challenge: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Challenge Management">
        <div className={styles.container}>
          <p className={styles.loading}>Loading challenge...</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Challenge Management">
      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formTitleRow}>
            <h3>Edit Challenge</h3>
          </div>

          <div className={styles.formGrid}>
            <section className={styles.formSection}>
              <h4>Challenge Information</h4>
              <label className={styles.fieldLabel}>Challenge Title</label>
              <input
                type="text"
                placeholder="Challenge Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <label className={styles.fieldLabel}>Course</label>
              <select
                value={formData.course_id}
                onChange={(e) => handleCourseChange(e.target.value)}
                required
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </section>

            <section className={styles.formSection}>
              <h4>Progress & Rewards</h4>

              <label className={styles.fieldLabel}>Task Order</label>
              <input
                type="number"
                placeholder="Task Order"
                value={formData.lesson_order}
                onChange={(e) =>
                  setFormData({ ...formData, lesson_order: parseInt(e.target.value, 10) || 1 })
                }
                min={1}
              />

              <label className={styles.fieldLabel}>Required XP</label>
              <input
                type="number"
                placeholder="Required XP"
                value={formData.required_xp}
                onChange={(e) =>
                  setFormData({ ...formData, required_xp: parseInt(e.target.value, 10) || 0 })
                }
                min={0}
              />

              <label className={styles.fieldLabel}>Points</label>
              <input
                type="number"
                placeholder="Points"
                value={formData.points}
                onChange={(e) =>
                  setFormData({ ...formData, points: parseInt(e.target.value, 10) || 0 })
                }
              />

              <label className={styles.fieldLabel}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </section>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h4>Questions ({formData.questions.length})</h4>
            {formData.questions.map((question, index) => (
              <div
                key={question.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "15px",
                  marginBottom: "15px",
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h5>Question {index + 1}</h5>
                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      className={styles.btn_delete}
                      onClick={() => removeQuestion(index)}
                      style={{ padding: "5px 10px", fontSize: "12px" }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className={styles.fieldLabel}>Question Text</label>
                <textarea
                  placeholder="Question text"
                  value={question.text}
                  onChange={(e) => updateQuestion(index, "text", e.target.value)}
                  required
                />

                <label className={styles.fieldLabel}>Options</label>
                <textarea
                  placeholder="Options (one per line)"
                  value={question.optionsText}
                  onChange={(e) => updateQuestion(index, "optionsText", e.target.value)}
                  required
                />

                <label className={styles.fieldLabel}>Correct Answer</label>
                <input
                  type="text"
                  placeholder="Correct answer (must match one option)"
                  value={question.correct_answer}
                  onChange={(e) => updateQuestion(index, "correct_answer", e.target.value)}
                  required
                />

                <label className={styles.fieldLabel}>Explanation</label>
                <textarea
                  placeholder="Explanation (optional)"
                  value={question.explanation}
                  onChange={(e) => updateQuestion(index, "explanation", e.target.value)}
                />
              </div>
            ))}

            <button
              type="button"
              className={styles.btn_secondary}
              onClick={addQuestion}
              style={{ marginBottom: "20px" }}
            >
              + Add Another Question
            </button>
          </div>

          <div className={styles.form_buttons}>
            <button type="submit" className={styles.btn_primary} disabled={saving}>
              {saving ? "Updating..." : "Update Challenge"}
            </button>
            <button
              type="button"
              className={styles.btn_secondary}
              onClick={() => router.push("/admin/challenges")}
            >
              Back to Challenges
            </button>
            <button
              type="button"
              className={styles.btn_ghost}
              onClick={() => router.push("/admin/courses")}
            >
              Manage Courses
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
