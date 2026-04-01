"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentRouteGuard from "@/components/StudentRouteGuard";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [attemptResults, setAttemptResults] = useState({});
  const [submittingChallengeId, setSubmittingChallengeId] = useState(null);
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

  async function submitChallenge(challengeId) {
    const answer = (answers[challengeId] || "").trim();
    if (!answer) {
      alert("Please select an answer first.");
      return;
    }

    setSubmittingChallengeId(challengeId);
    try {
      const result = await apiRequest(`/api/public/challenges/${challengeId}/attempt`, {
        method: "POST",
        body: { answer },
        student: true,
      });

      setAttemptResults((prev) => ({ ...prev, [challengeId]: result }));
      setProfile((prev) => {
        if (!prev) return prev;
        return { ...prev, xp: Number(result?.totalXp || prev.xp || 0) };
      });
    } catch (error) {
      alert(error.message || "Failed to submit challenge");
    } finally {
      setSubmittingChallengeId(null);
    }
  }

  return (
    <StudentRouteGuard>
      <main className="page-wrap stack">
        <div className="panel stack">
          <h1>Student Dashboard</h1>
          <p>Welcome back, {firstName}.</p>
          <div className="nav">
            <span className="badge">Courses: {courses.length}</span>
            <span className="badge">XP: {xp}</span>
            <span className="badge">Class: {yearLevel}</span>
            <span className="badge">Top Leaderboard Loaded: {leaders.length}</span>
          </div>
          <button className="danger" onClick={logout}>
            Logout
          </button>
        </div>

        {loading ? (
          <div className="panel">
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-2">
              <section className="panel stack">
                <h3>Your Profile</h3>
                <p><strong>Name:</strong> {firstName}</p>
                <p><strong>Student ID:</strong> {studentId}</p>
                <p><strong>Year Level:</strong> {yearLevel}</p>
                <p><strong>Class:</strong> {classCode || "Not set"}</p>
                <p><strong>Total XP:</strong> {xp}</p>
                <select
                  value={classId || ""}
                  onChange={(e) => saveClassId(e.target.value ? Number(e.target.value) : null)}
                  disabled={savingClass}
                >
                  <option value="">Select your class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
                  ))}
                </select>
                <button onClick={() => router.push("/profile")}>Edit Profile</button>
              </section>

              <section className="panel stack">
                <h3>Quick Stats</h3>
                <p><strong>Enrolled Courses:</strong> {courses.length}</p>
                <p><strong>Leaderboard Rank:</strong> -</p>
                <p><strong>Profile Status:</strong> <span className="badge">Complete</span></p>
              </section>
            </div>

            <div className="grid grid-2">
              <section className="panel stack">
                <h3>Your Enrolled Courses</h3>
                {courses.length === 0 ? (
                  <p>You are not enrolled in any course yet.</p>
                ) : (
                  courses.slice(0, 8).map((course) => (
                    <div key={course.id || course.code || course.name} className="panel">
                      <strong>{course.name || "Untitled Course"}</strong>
                      <p>{course.code || "No code"}</p>
                    </div>
                  ))
                )}
              </section>

              <section className="panel stack">
                <h3>Leaderboard Snapshot</h3>
                {leaders.length === 0 ? (
                  <p>No leaderboard data yet.</p>
                ) : (
                  leaders.map((row, index) => (
                    <div key={row.id || index} className="panel">
                      <strong>#{index + 1} {row.name || "Student"}</strong>
                      <p>XP: {Number(row.xp || 0)}</p>
                    </div>
                  ))
                )}
              </section>
            </div>

            <section className="panel stack">
              <h3>Course Catalog</h3>
              {availableToEnroll.length === 0 ? (
                <p>No additional courses available for enrollment.</p>
              ) : (
                availableToEnroll.slice(0, 12).map((course) => (
                  <div key={course.id || course.code || course.name} className="panel stack">
                    <strong>{course.name || "Untitled Course"}</strong>
                    <p>{course.code || "No code"}</p>
                    <button
                      type="button"
                      onClick={() => enrollCourse(course.id)}
                      disabled={enrollingCourseId === course.id}
                    >
                      {enrollingCourseId === course.id ? "Enrolling..." : "Enroll"}
                    </button>
                  </div>
                ))
              )}
            </section>

            <section className="panel stack">
              <h3>Challenge Arena</h3>
              {challenges.length === 0 ? (
                <p>No active challenges right now.</p>
              ) : (
                challenges.map((challenge) => {
                  const options = Array.isArray(challenge.options) ? challenge.options : [];
                  const selected = answers[challenge.id] || "";
                  const result = attemptResults[challenge.id];

                  return (
                    <div key={challenge.id} className="panel stack">
                      <strong>{challenge.title || "Challenge"}</strong>
                      <p>{challenge.question_text || "No question provided."}</p>
                      <p><strong>Reward:</strong> {Number(challenge.points || 0)} XP</p>

                      {options.length === 0 ? (
                        <p>No options configured yet.</p>
                      ) : (
                        <div className="stack">
                          {options.map((option) => (
                            <button
                              key={`${challenge.id}-${option}`}
                              type="button"
                              className={selected === option ? "secondary" : ""}
                              onClick={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [challenge.id]: option,
                                }))
                              }
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => submitChallenge(challenge.id)}
                        disabled={submittingChallengeId === challenge.id || options.length === 0}
                      >
                        {submittingChallengeId === challenge.id ? "Submitting..." : "Submit Answer"}
                      </button>

                      {result && (
                        <div className="stack">
                          <p>
                            <strong>Result:</strong> {result.isCorrect ? "Correct" : "Incorrect"}
                          </p>
                          <p>
                            <strong>Awarded XP:</strong> {Number(result.awardedXp || 0)}
                          </p>
                          <p>
                            <strong>Total XP:</strong> {Number(result.totalXp || 0)}
                          </p>
                          {result.alreadyRewarded ? <p>This challenge was already rewarded before.</p> : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </main>
    </StudentRouteGuard>
  );
}
