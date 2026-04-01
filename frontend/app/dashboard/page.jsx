"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentRouteGuard from "@/components/StudentRouteGuard";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import styles from "./dashboard.module.css";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const me = await apiRequest("/api/auth/me", { student: true });
        if (!isMounted) return;

        setProfile(me?.profile || null);
        if (!me?.profile?.profile_completed) {
          router.push("/profile");
          return;
        }

        const [courseData, classesData, challengeData, attemptsData] = await Promise.all([
          apiRequest("/api/public/my-courses", { student: true }),
          apiRequest("/api/public/classes"),
          apiRequest("/api/public/my-challenges", { student: true }),
          apiRequest("/api/public/my-attempts", { student: true }),
        ]);

        if (!isMounted) return;
        setCourses(courseData?.courses || []);
        setClasses(classesData?.classes || []);
        setChallenges(challengeData?.challenges || []);
        setAttempts(attemptsData?.attempts || []);
      } catch (_error) {
        if (!isMounted) return;
        setCourses([]);
        setClasses([]);
        setChallenges([]);
        setAttempts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [router]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const firstName = profile?.first_name || "Student";
  const studentId = profile?.student_id || "N/A";
  const yearLevel = profile?.year_level || "N/A";
  const classId = Number(profile?.class_id || 0);
  const selectedClass = classes.find((cls) => Number(cls.id) === classId) || null;
  const classCode = selectedClass?.code || profile?.class_code || "";
  const xp = Number(profile?.xp || 0);
  const level = Math.floor(xp / 500) + 1;
  const levelProgress = Math.min(100, Math.max(0, (xp % 500) / 5));

  const completedChallenges = new Set(
    attempts.filter((a) => a?.is_correct).map((a) => Number(a.challenge_id))
  ).size;
  const totalBadges = Math.floor(completedChallenges / 5);



  return (
    <StudentRouteGuard>
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.shell}>
          <header className={styles.topBar}>
            <div className={styles.brand}>DuckSiteT</div>
            <nav className={styles.topNav}>
              <button type="button" className={styles.active} onClick={() => router.push("/dashboard")}>Dashboard</button>
              <button type="button" onClick={() => router.push("/courses")}>Courses</button>
              <button type="button" onClick={() => router.push("/leaderboard")}>Leaderboard</button>
              <button type="button" onClick={() => router.push("/profile")}>Profile</button>
              <button type="button" onClick={logout}>Logout</button>
            </nav>
            <div className={styles.playerMeta}>
              <span>XP {xp}</span>
              <span>Level {level}</span>
            </div>
          </header>

          {loading ? (
            <section className={styles.loadingCard}>Loading dashboard...</section>
          ) : (
            <>
              <section className={styles.hero}>
                <div>
                  <h1>Welcome back, {firstName}!</h1>
                  <p>Student ID: {studentId} | Year: {yearLevel} | Class: {classCode || "Not set"}</p>
                </div>
                <div className={styles.levelBox}>
                  <span>Level {level} Progress</span>
                  <div className={styles.levelTrack}>
                    <div className={styles.levelFill} style={{ width: `${levelProgress}%` }} />
                  </div>
                  <small>{xp % 500} / 500 XP</small>
                </div>
              </section>

              <section className={styles.statsGrid}>
                <article>
                  <h3>⭐ {totalBadges}</h3>
                  <p>Total Badges</p>
                </article>
                <article>
                  <h3>🎖️ {level}</h3>
                  <p>Current Level</p>
                </article>
                <article>
                  <h3>✓ {completedChallenges}</h3>
                  <p>Completed Challenges</p>
                </article>
                <article>
                  <h3>💎 {xp}</h3>
                  <p>Total Points</p>
                </article>
              </section>

              <section className={styles.panelWide}>
                <h2>Continue Learning</h2>
                <div className={styles.courseRail}>
                  {courses.length === 0 ? (
                    <p className={styles.muted}>You are not enrolled in any course yet.</p>
                  ) : (
                    courses.slice(0, 8).map((course) => (
                      <article key={course.id || course.code || course.name} className={styles.courseCard}>
                        <h4>{course.name || "Untitled Course"}</h4>
                        <p>{course.code || "No code"}</p>
                        <span>Continue Learning</span>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </StudentRouteGuard>
  );
}
