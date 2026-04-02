"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  const [materials, setMaterials] = useState([]);
  const [solvedSet, setSolvedSet] = useState(new Set());
  const [attemptedSet, setAttemptedSet] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const me = await apiRequest("/api/auth/me", { student: true });
        const [myCourses, myChallenges, myAttempts, courseMaterials] = await Promise.all([
          apiRequest("/api/public/my-courses", { student: true }),
          apiRequest("/api/public/my-challenges", { student: true }),
          apiRequest(`/api/public/my-attempts?courseId=${courseId}`, { student: true }),
          apiRequest(`/api/public/materials?courseId=${courseId}`, { student: true }),
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

        const attempted = new Set(
          (myAttempts?.attempts || [])
            .map((row) => Number(row.challenge_id))
            .filter((id) => Number.isInteger(id))
        );

        setProfile(me?.profile || null);
        setCourse(selectedCourse);
        setLessons(challengeRows);
        setMaterials(courseMaterials?.materials || []);
        setSolvedSet(solved);
        setAttemptedSet(attempted);
      } catch (_error) {
        if (!alive) return;
        setCourse(null);
        setLessons([]);
        setSolvedSet(new Set());
        setAttemptedSet(new Set());
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
      const meetsXp = xp >= requiredXp;
      const previousLessonId = index > 0 ? Number(lessons[index - 1]?.id) : null;
      const meetsPrerequisite = previousLessonId == null ? true : solvedSet.has(previousLessonId);
      const isUnlocked = meetsXp && meetsPrerequisite;
      const solved = solvedSet.has(Number(lesson.id));
      const attempted = attemptedSet.has(Number(lesson.id));

      let actionLabel = "Locked";
      if (isUnlocked && solved) actionLabel = "Review";
      else if (isUnlocked && attempted) actionLabel = "Continue";
      else if (isUnlocked) actionLabel = "Open";

      let lockMessage = "Unlocked";
      if (solved) lockMessage = "Completed";
      else if (!isUnlocked && !meetsXp && previousLessonId != null && !meetsPrerequisite) {
        lockMessage = `Locked: ${requiredXp} XP and Lesson ${index} completion required`;
      } else if (!isUnlocked && !meetsXp) {
        lockMessage = `Locked: ${requiredXp} XP required`;
      } else if (!isUnlocked && previousLessonId != null && !meetsPrerequisite) {
        lockMessage = `Locked: Finish Lesson ${index} first`;
      }

      return {
        ...lesson,
        lessonNo: index + 1,
        requiredXp,
        meetsXp,
        meetsPrerequisite,
        previousLessonNo: previousLessonId == null ? null : index,
        isUnlocked,
        solved,
        attempted,
        actionLabel,
        lockMessage,
      };
    });
  }, [lessons, xp, solvedSet, attemptedSet]);

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
                  <div className={styles.duckEyes} aria-hidden="true">
                    <span className={styles.eye} />
                    <span className={styles.eye} />
                  </div>
                  <div className={styles.duckBill} aria-hidden="true" />
                  <div className={styles.padTop}>Lesson {lesson.lessonNo}</div>
                  {!lesson.isUnlocked ? (
                    <div className={styles.unlockMeta}>
                      {!lesson.meetsXp
                        ? `Unlocks at ${lesson.requiredXp} XP`
                        : `Finish Lesson ${lesson.previousLessonNo} to unlock`}
                    </div>
                  ) : null}
                  <small>{lesson.lockMessage}</small>
                  <button
                    type="button"
                    disabled={!lesson.isUnlocked}
                    onClick={() => router.push(`/courses/${courseId}/${lesson.id}`)}
                  >
                    {lesson.actionLabel}
                  </button>
                </article>
              ))}
            </section>
          )}

          {materials.length > 0 && (
            <section className={styles.materialsSection}>
              <h2>Course Materials</h2>
              <div className={styles.materialsList}>
                {materials.map((material) => (
                  <div key={material.id} className={styles.materialItem}>
                    <div className={styles.materialInfo}>
                      <h3>{material.title}</h3>
                      {material.description && <p>{material.description}</p>}
                    </div>
                    {material.file_url && (
                      <a href={material.file_url} target="_blank" rel="noopener noreferrer" className={styles.downloadBtn}>
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </StudentRouteGuard>
  );
}
