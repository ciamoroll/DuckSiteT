"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StudentRouteGuard from "@/components/StudentRouteGuard";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import styles from "./course-stages.module.css";

export default function CourseStagesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params?.courseId);

  const [profile, setProfile] = useState(null);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [solvedSet, setSolvedSet] = useState(new Set());
  const [loading, setLoading] = useState(true);

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
        const challengeRows = (myChallenges?.challenges || [])
          .filter((ch) => Number(ch.course_id) === courseId)
          .sort((a, b) => {
            const orderA = Number(a.lesson_order || 9999);
            const orderB = Number(b.lesson_order || 9999);
            if (orderA !== orderB) return orderA - orderB;
            return Number(a.id) - Number(b.id);
          });

        const solved = new Set(
          (myAttempts?.attempts || [])
            .filter((row) => row?.is_correct)
            .map((row) => Number(row.challenge_id))
            .filter((id) => Number.isInteger(id))
        );

        setProfile(me?.profile || null);
        setCourse(selectedCourse);
        setLessons(challengeRows);
        setSolvedSet(solved);
      } catch (_error) {
        if (!alive) return;
        setCourse(null);
        setLessons([]);
        setSolvedSet(new Set());
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (Number.isInteger(courseId)) load();
    else setLoading(false);

    return () => {
      alive = false;
    };
  }, [courseId]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const xp = Number(profile?.xp || 0);
  const level = Math.floor(xp / 500) + 1;

  const lessonsView = useMemo(() => {
    return lessons.map((lesson, index) => {
      const requiredXp = Number(lesson.required_xp ?? index * 100);
      const isUnlocked = xp >= requiredXp;
      const solved = solvedSet.has(Number(lesson.id));
      return {
        ...lesson,
        lessonNo: index + 1,
        requiredXp,
        isUnlocked,
        solved,
      };
    });
  }, [lessons, xp, solvedSet]);

  return (
    <StudentRouteGuard>
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.overlay}>
          <header className={styles.topBar}>
            <div className={styles.brand}>DuckSiteT</div>
            <nav className={styles.topNav}>
              <button type="button" onClick={() => router.push("/dashboard")}>Dashboard</button>
              <button type="button" onClick={() => router.push("/courses")} className={styles.active}>Courses</button>
              <button type="button" onClick={() => router.push("/leaderboard")}>Leaderboard</button>
              <button type="button" onClick={() => router.push("/profile")}>Profile</button>
              <button type="button" onClick={logout}>Logout</button>
            </nav>
            <div className={styles.meta}>
              <span>{xp} pts</span>
              <span>Level {level}</span>
            </div>
          </header>

          <section className={styles.heading}>
            <h1>{course?.name || "Course Stages"}</h1>
            <p>Choose a lesson to start. Higher lessons unlock at higher XP.</p>
          </section>

          {loading ? (
            <section className={styles.loading}>Loading stages...</section>
          ) : lessonsView.length === 0 ? (
            <section className={styles.loading}>No lessons/challenges configured for this course.</section>
          ) : (
            <section className={styles.lilyGrid}>
              {lessonsView.map((lesson) => (
                <article key={lesson.id} className={styles.pad}>
                  <div className={styles.padTop}>Lesson {lesson.lessonNo}</div>
                  <p>{lesson.title || `Lesson ${lesson.lessonNo}`}</p>
                  <small>
                    {lesson.solved
                      ? "Completed"
                      : lesson.isUnlocked
                        ? "Unlocked"
                        : `Locked: ${lesson.requiredXp} XP required`}
                  </small>
                  <button
                    type="button"
                    disabled={!lesson.isUnlocked}
                    onClick={() => router.push(`/courses/${courseId}/${lesson.id}`)}
                  >
                    {lesson.isUnlocked ? "Open" : "Locked"}
                  </button>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </StudentRouteGuard>
  );
}
