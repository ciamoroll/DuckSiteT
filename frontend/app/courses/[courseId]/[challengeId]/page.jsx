"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import StudentRouteGuard from "@/components/StudentRouteGuard";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import styles from "./lesson.module.css";

export default function LessonChallengePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params?.courseId);
  const challengeId = Number(params?.challengeId);

  const [profile, setProfile] = useState(null);
  const [course, setCourse] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [attempts, setAttempts] = useState([]);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await apiRequest("/api/auth/me", { student: true });
        const [myCourses, myChallenges, myAttempts] = await Promise.all([
          apiRequest("/api/public/my-courses", { student: true }),
          apiRequest("/api/public/my-challenges", { student: true }),
          apiRequest(`/api/public/my-attempts?courseId=${courseId}`, { student: true }),
        ]);

        if (!alive) return;

        const selectedCourse = (myCourses?.courses || []).find((c) => Number(c.id) === courseId) || null;
        const lessonRows = (myChallenges?.challenges || [])
          .filter((ch) => Number(ch.course_id) === courseId)
          .sort((a, b) => {
            const orderA = Number(a.lesson_order || 9999);
            const orderB = Number(b.lesson_order || 9999);
            if (orderA !== orderB) return orderA - orderB;
            return Number(a.id) - Number(b.id);
          });

        const found = lessonRows.find((ch) => Number(ch.id) === challengeId) || null;
        const index = Math.max(0, lessonRows.findIndex((ch) => Number(ch.id) === challengeId));

        setProfile(me?.profile || null);
        setCourse(selectedCourse);
        setChallenge(found);
        setLessonIndex(index);
        setAttempts(myAttempts?.attempts || []);
      } catch (_err) {
        if (!alive) return;
        setChallenge(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (Number.isInteger(courseId) && Number.isInteger(challengeId)) load();
    else setLoading(false);

    return () => {
      alive = false;
    };
  }, [courseId, challengeId]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const xp = Number(profile?.xp || 0);
  const level = Math.floor(xp / 500) + 1;
  const requiredXp = useMemo(() => Number(challenge?.required_xp ?? lessonIndex * 100), [challenge, lessonIndex]);
  const isUnlocked = xp >= requiredXp;

  const solved = useMemo(() => {
    return (attempts || []).some((row) => Number(row.challenge_id) === challengeId && row.is_correct);
  }, [attempts, challengeId]);

  async function submitAnswer() {
    if (!selected) {
      alert("Please select an answer first.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest(`/api/public/challenges/${challengeId}/attempt`, {
        method: "POST",
        body: { answer: selected },
        student: true,
      });
      setResult(response);

      const me = await apiRequest("/api/auth/me", { student: true });
      setProfile(me?.profile || null);

      const latestAttempts = await apiRequest(`/api/public/my-attempts?courseId=${courseId}`, { student: true });
      setAttempts(latestAttempts?.attempts || []);
    } catch (error) {
      alert(error.message || "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StudentRouteGuard>
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.overlay}>
          <header className={styles.topBar}>
            <div className={styles.brand}>
              <Image src="/images/DucksiteT-logo.png" alt="DuckSiteT" width={220} height={56} className={styles.brandLogo} priority />
            </div>
            <nav className={styles.topNav}>
              <button type="button" onClick={() => router.push("/dashboard")}>Dashboard</button>
              <button type="button" className={styles.active} onClick={() => router.push(`/courses/${courseId}`)}>Courses</button>
              <button type="button" onClick={() => router.push("/leaderboard")}>Leaderboard</button>
              <button type="button" onClick={() => router.push("/profile")}>Profile</button>
              <button type="button" onClick={logout}>Logout</button>
            </nav>
            <div className={styles.meta}>
              <span>{xp} pts</span>
              <span>Level {level}</span>
            </div>
          </header>

          {loading ? (
            <section className={styles.loading}>Loading lesson...</section>
          ) : !challenge ? (
            <section className={styles.loading}>Lesson not found or not accessible.</section>
          ) : !isUnlocked ? (
            <section className={styles.loading}>This lesson is locked. You need {requiredXp} XP to unlock it.</section>
          ) : (
            <section className={styles.lessonWrap}>
              <h1>{course?.name || "Course"}</h1>
              <h2>{challenge.title || "Lesson Challenge"}</h2>
              <p className={styles.question}>{challenge.question_text || "No question provided."}</p>
              <p className={styles.reward}>Reward: {Number(challenge.points || 0)} XP</p>

              <div className={styles.options}>
                {(Array.isArray(challenge.options) ? challenge.options : []).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={selected === option ? styles.optionActive : styles.optionBtn}
                    onClick={() => setSelected(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className={styles.actions}>
                <button type="button" onClick={submitAnswer} disabled={submitting || solved}>
                  {solved ? "Completed" : submitting ? "Submitting..." : "Submit Answer"}
                </button>
                <button type="button" onClick={() => router.push(`/courses/${courseId}`)}>Back to Stages</button>
              </div>

              {solved ? <p className={styles.success}>Already solved. XP reward has been counted.</p> : null}

              {result ? (
                <div className={styles.resultBox}>
                  <p>{result.isCorrect ? "Correct answer!" : "Incorrect answer. Try again."}</p>
                  <p>Awarded XP: {Number(result.awardedXp || 0)}</p>
                  <p>Total XP: {Number(result.totalXp || 0)}</p>
                </div>
              ) : null}
            </section>
          )}
        </div>
      </main>
    </StudentRouteGuard>
  );
}
