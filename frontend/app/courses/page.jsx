"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import StudentRouteGuard from "@/components/StudentRouteGuard";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import styles from "./courses.module.css";

function toCourseProgressMap(challenges, attempts) {
  const safeAttempts = Array.isArray(attempts) ? attempts : [];
  const totals = new Map();
  const solved = new Map();
  const solvedChallengeIds = new Set(
    safeAttempts
      .filter((row) => row?.is_correct)
      .map((row) => Number(row.challenge_id))
      .filter((id) => Number.isInteger(id))
  );

  for (const challenge of challenges || []) {
    const courseId = Number(challenge.course_id);
    if (!Number.isInteger(courseId)) continue;
    totals.set(courseId, Number(totals.get(courseId) || 0) + 1);

    if (solvedChallengeIds.has(Number(challenge.id))) {
      solved.set(courseId, Number(solved.get(courseId) || 0) + 1);
    }
  }

  const out = new Map();
  for (const [courseId, total] of totals.entries()) {
    const done = Number(solved.get(courseId) || 0);
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    out.set(courseId, { done, total, pct });
  }

  return out;
}

export default function StudentCoursesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [attemptResults, setAttemptResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const me = await apiRequest("/api/auth/me", { student: true });
        if (!active) return;

        setProfile(me?.profile || null);

        const [myCourses, myChallenges] = await Promise.all([
          apiRequest("/api/public/my-courses", { student: true }),
          apiRequest("/api/public/my-challenges", { student: true }),
        ]);

        const myAttempts = await apiRequest("/api/public/my-attempts", { student: true });

        if (!active) return;
        setCourses(myCourses?.courses || []);
        setChallenges(myChallenges?.challenges || []);
        setAttemptResults(myAttempts?.attempts || []);
      } catch (_err) {
        if (!active) return;
        setCourses([]);
        setChallenges([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const xp = Number(profile?.xp || 0);
  const level = Math.floor(xp / 500) + 1;

  const progressMap = useMemo(() => toCourseProgressMap(challenges, attemptResults), [challenges, attemptResults]);

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
              <button type="button" className={styles.active}>Courses</button>
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
            <section className={styles.loading}>Loading courses...</section>
          ) : (
            <section className={styles.grid}>
              {courses.length === 0 ? (
                <article className={styles.empty}>It looks like you aren&apos;t enrolled in any courses yet. To get started, please visit your profile to select your courses and enroll.</article>
              ) : (
                courses.map((course) => {
                  const row = progressMap.get(Number(course.id)) || { done: 0, total: 0, pct: 0 };
                  return (
                    <article key={course.id || course.code || course.name} className={styles.courseCard}>
                      <h3>{course.name || "Untitled Course"}</h3>
                      <p>{course.code || "No code"}</p>
                      <div className={styles.track}>
                        <div className={styles.fill} style={{ width: `${row.pct}%` }} />
                      </div>
                      <small>Progress: {row.pct}% ({row.done}/{row.total || 0})</small>
                      <button
                        type="button"
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className={styles.startBtn}
                      >
                        START
                      </button>
                    </article>
                  );
                })
              )}
            </section>
          )}
        </div>
      </main>
    </StudentRouteGuard>
  );
}
