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
  const [allCourses, setAllCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [savingClass, setSavingClass] = useState(false);

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

        const [courseData, allCourseData, classesData, leaderboardData, challengeData] = await Promise.all([
          apiRequest("/api/public/my-courses", { student: true }),
          apiRequest("/api/public/courses"),
          apiRequest("/api/public/classes"),
          apiRequest("/api/public/leaderboard"),
          apiRequest("/api/public/my-challenges", { student: true }),
        ]);

        if (!isMounted) return;
        setCourses(courseData?.courses || []);
        setAllCourses(allCourseData?.courses || []);
        setClasses(classesData?.classes || []);
        setLeaders((leaderboardData?.leaderboard || []).slice(0, 5));
        setChallenges(challengeData?.challenges || []);
      } catch (_error) {
        if (!isMounted) return;
        setCourses([]);
        setAllCourses([]);
        setClasses([]);
        setLeaders([]);
        setChallenges([]);
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
  const enrolledIds = new Set(courses.map((course) => Number(course.id)));
  const availableToEnroll = allCourses.filter((course) => {
    if (enrolledIds.has(Number(course.id))) return false;
    const allowedClassIds = Array.isArray(course.class_ids)
      ? course.class_ids.map((value) => Number(value)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    if (allowedClassIds.length === 0) return true;
    return Number.isInteger(classId) && classId > 0 && allowedClassIds.includes(classId);
  });

  async function saveClassId(nextClassId) {
    setSavingClass(true);
    try {
      await apiRequest("/api/auth/me", {
        method: "PUT",
        body: { class_id: nextClassId || null },
        student: true,
      });

      const [me, myCoursesData, myChallengesData] = await Promise.all([
        apiRequest("/api/auth/me", { student: true }),
        apiRequest("/api/public/my-courses", { student: true }),
        apiRequest("/api/public/my-challenges", { student: true }),
      ]);

      setProfile(me?.profile || null);
      setCourses(myCoursesData?.courses || []);
      setChallenges(myChallengesData?.challenges || []);
      alert("Class updated");
    } catch (error) {
      alert(error.message || "Failed to update class");
    } finally {
      setSavingClass(false);
    }
  }

  async function enrollCourse(courseId) {
    setEnrollingCourseId(courseId);
    try {
      await apiRequest("/api/public/my-courses/enroll", {
        method: "POST",
        body: { courseId },
        student: true,
      });

      const [myCoursesData, myChallengesData] = await Promise.all([
        apiRequest("/api/public/my-courses", { student: true }),
        apiRequest("/api/public/my-challenges", { student: true }),
      ]);

      setCourses(myCoursesData?.courses || []);
      setChallenges(myChallengesData?.challenges || []);
      alert("Enrolled successfully");
    } catch (error) {
      alert(error.message || "Failed to enroll");
    } finally {
      setEnrollingCourseId(null);
    }
  }



  return (
    <StudentRouteGuard>
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.shell}>
          <header className={styles.topBar}>
            <div className={styles.brand}>DuckSiteT</div>
            <nav className={styles.topNav}>
              <button type="button" onClick={() => router.push("/dashboard")}>Dashboard</button>
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
                  <h3>{courses.length}</h3>
                  <p>Enrolled Courses</p>
                </article>
                <article>
                  <h3>{challenges.length}</h3>
                  <p>Active Challenges</p>
                </article>
                <article>
                  <h3>{leaders.length}</h3>
                  <p>Leaderboard Loaded</p>
                </article>
                <article>
                  <h3>{classCode || "N/A"}</h3>
                  <p>Current Class</p>
                </article>
              </section>

              <section className={styles.mainGrid}>
                <div className={styles.panel}>
                  <h2>Profile Settings</h2>
                  <label className={styles.inputLabel}>Select Class</label>
                  <select
                    value={classId || ""}
                    onChange={(e) => saveClassId(e.target.value ? Number(e.target.value) : null)}
                    disabled={savingClass}
                    className={styles.select}
                  >
                    <option value="">Select your class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
                    ))}
                  </select>
                  <button type="button" className={styles.editBtn} onClick={() => router.push("/profile")}>Edit Full Profile</button>
                </div>

                <div className={styles.panel}>
                  <h2>Leaderboard</h2>
                  {leaders.length === 0 ? (
                    <p className={styles.muted}>No leaderboard data yet.</p>
                  ) : (
                    <div className={styles.leaderList}>
                      {leaders.map((row, index) => (
                        <div key={row.id || index} className={styles.leaderRow}>
                          <span>#{index + 1} {row.name || "Student"}</span>
                          <strong>{Number(row.xp || 0)} XP</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

              <section className={styles.panelWide}>
                <h2>Course Catalog</h2>
                <div className={styles.catalogGrid}>
                  {availableToEnroll.length === 0 ? (
                    <p className={styles.muted}>No additional courses available for enrollment.</p>
                  ) : (
                    availableToEnroll.slice(0, 12).map((course) => (
                      <article key={course.id || course.code || course.name} className={styles.catalogCard}>
                        <h4>{course.name || "Untitled Course"}</h4>
                        <p>{course.code || "No code"}</p>
                        <button
                          type="button"
                          onClick={() => enrollCourse(course.id)}
                          disabled={enrollingCourseId === course.id}
                        >
                          {enrollingCourseId === course.id ? "Enrolling..." : "Enroll"}
                        </button>
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
