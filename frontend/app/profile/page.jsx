"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getRole, getStudentToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import styles from "./profile.module.css";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [userRank, setUserRank] = useState(null);
  const [userLevel, setUserLevel] = useState(1);
  const [userXp, setUserXp] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    studentId: "",
    yearLevel: "",
    bio: "",
    classId: null,
  });

  useEffect(() => {
    const role = getRole();
    const token = getStudentToken();
    if (role !== "student" || !token) {
      router.push("/login");
      return;
    }
    fetchProfile();
  }, [router]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const [meData, classesData, leaderboardResponse, myCoursesData, allCoursesData] = await Promise.all([
        apiRequest("/api/auth/me", { student: true }),
        apiRequest("/api/public/classes"),
        apiRequest("/api/public/leaderboard"),
        apiRequest("/api/public/my-courses", { student: true }),
        apiRequest("/api/public/courses"),
      ]);
      
      setProfile(meData.profile);
      setClasses(classesData?.classes || []);
      setMyCourses(myCoursesData?.courses || []);
      setAllCourses(allCoursesData?.courses || []);
      setUserXp(Number(meData?.profile?.xp || 0));
      
      // Calculate user's rank and level
      const leaderboard = leaderboardResponse?.leaderboard || [];
      
      const userIndex = leaderboard.findIndex(
        (entry) => String(entry?.id || entry?.user_id || "") === String(meData?.profile?.id || "")
      );
      
      if (userIndex !== -1) {
        setUserRank(userIndex + 1);
        setUserLevel(Math.max(1, Math.floor((Number(meData?.profile?.xp || 0)) / 500) + 1));
      } else {
        setUserLevel(Math.max(1, Math.floor((Number(meData?.profile?.xp || 0)) / 500) + 1));
      }
      
      setCurrentStep(meData.profile.profile_step || 1);
      setFormData({
        firstName: meData.profile.first_name || "",
        middleName: meData.profile.middle_name || "",
        lastName: meData.profile.last_name || "",
        studentId: meData.profile.student_id || "",
        yearLevel: meData.profile.year_level || "",
        bio: meData.profile.bio || "",
        classId: meData.profile.class_id || null,
      });
    } catch (err) {
      alert("Failed to load profile: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function enrollCourse(courseId) {
    const selectedClassId = Number(formData.classId || profile?.class_id || 0);
    if (!Number.isInteger(selectedClassId) || selectedClassId <= 0) {
      alert("Please select your class before enrolling in courses.");
      return;
    }

    setEnrollingCourseId(courseId);
    try {
      await apiRequest("/api/public/my-courses/enroll", {
        method: "POST",
        body: { courseId },
        student: true,
      });

      const myCoursesData = await apiRequest("/api/public/my-courses", { student: true });
      setMyCourses(myCoursesData?.courses || []);
      alert("Enrolled successfully");
    } catch (error) {
      alert(error.message || "Failed to enroll");
    } finally {
      setEnrollingCourseId(null);
    }
  }

  async function handleNext(step) {
    // Validate current step
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        alert("Please fill in first and last name");
        return;
      }
    } else if (step === 2) {
      if (!formData.studentId.trim()) {
        alert("Please enter your student ID");
        return;
      }
      if (!formData.yearLevel) {
        alert("Please select your year level");
        return;
      }
      if (!formData.classId) {
        alert("Please select your class");
        return;
      }
    }

    try {
      await apiRequest("/api/auth/me", {
        method: "PUT",
        body: {
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          student_id: formData.studentId,
          year_level: formData.yearLevel,
          bio: formData.bio,
          class_id: formData.classId || null,
          profile_step: step + 1,
        },
        student: true,
      });
      if (step === 2 && Number.isInteger(Number(formData.classId || 0)) && Number(formData.classId || 0) > 0) {
        setProfile((prev) => (prev ? { ...prev, class_id: Number(formData.classId) } : prev));
      }
      setCurrentStep(step + 1);
    } catch (err) {
      alert("Error saving profile: " + err.message);
    }
  }

  async function handleComplete() {
    const normalizedClassId = Number(formData.classId || profile?.class_id || 0);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert("Please fill in first and last name before completing your profile");
      return;
    }

    if (!formData.studentId.trim()) {
      alert("Please enter your student ID before completing your profile");
      return;
    }

    if (!formData.yearLevel) {
      alert("Please select your year level before completing your profile");
      return;
    }

    if (!Number.isInteger(normalizedClassId) || normalizedClassId <= 0) {
      alert("Please select your class before completing your profile");
      return;
    }

    const payload = {
      first_name: formData.firstName.trim(),
      middle_name: formData.middleName.trim(),
      last_name: formData.lastName.trim(),
      student_id: formData.studentId.trim(),
      year_level: formData.yearLevel,
      bio: formData.bio,
      class_id: normalizedClassId,
      profile_completed: true,
      profile_step: 3,
    };

    try {
      await apiRequest("/api/auth/me", {
        method: "PUT",
        body: payload,
        student: true,
      });
      alert("Profile completed successfully!");
      router.push("/dashboard");
    } catch (err) {
      console.error("[Profile Complete] Failed to update profile", { payload, error: err });
      alert("Error completing profile: " + err.message);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.shell}>
          <section className={styles.loadingCard}>Loading profile...</section>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.shell}>
          <section className={styles.loadingCard}>Unable to load profile</section>
        </div>
      </main>
    );
  }

  const currentClassId = Number(formData.classId || profile?.class_id || 0);
  const hasClassSelected = Number.isInteger(currentClassId) && currentClassId > 0;
  const classLocked = Number.isInteger(Number(profile?.class_id || 0)) && Number(profile?.class_id || 0) > 0;
  const selectedClass = classes.find((cls) => Number(cls.id) === currentClassId) || null;
  const selectedClassLabel = selectedClass ? `${selectedClass.name} (${selectedClass.code})` : "";
  const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
  const enrolledIds = new Set(myCourses.map((course) => Number(course.id)));
  const availableToEnroll = allCourses.filter((course) => {
    if (enrolledIds.has(Number(course.id))) return false;
    if (!hasClassSelected) return false;
    const allowedClassIds = Array.isArray(course.class_ids)
      ? course.class_ids.map((value) => Number(value)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    if (allowedClassIds.length === 0) return hasClassSelected;
    return Number.isInteger(currentClassId) && currentClassId > 0 && allowedClassIds.includes(currentClassId);
  });

  if (profile.profile_completed) {
    return (
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.shell}>
          <header className={styles.topBar}>
            <div className={styles.brand}>
              <Image src="/images/DucksiteT-logo.png" alt="DuckSiteT" width={220} height={56} className={styles.brandLogo} priority />
            </div>
            <nav className={styles.topNav}>
              <button type="button" onClick={() => router.push("/dashboard")}>Dashboard</button>
              <button type="button" onClick={() => router.push("/courses")}>Courses</button>
              <button type="button" onClick={() => router.push("/leaderboard")}>Leaderboard</button>
              <button type="button" className={styles.active}>Profile</button>
              <button type="button" onClick={() => { clearSession(); router.push("/login"); }}>Logout</button>
            </nav>
            <div className={styles.playerMeta}>
              <span>XP {userXp}</span>
              <span>Level {userLevel}</span>
            </div>
          </header>

          <section className={styles.profilePlayerSection}>
            <div className={styles.playerCardLabel}>PROFILE PLAYER</div>
            
            <div className={styles.playerCard}>
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>{fullName}</div>
                <div className={styles.playerLevel}>LEVEL {userLevel}</div>
                {userRank && <div className={styles.playerRank}>TOP {userRank}</div>}
                <div className={styles.playerEmail}>{profile.email}</div>
              </div>
              
              <div className={styles.playerAvatar}>
                <Image
                  src="/images/duck_profile_image.png"
                  alt="Profile"
                  width={280}
                  height={280}
                  className={styles.avatarImage}
                  priority
                />
              </div>
            </div>

            <button
              type="button"
              className={styles.scrollCue}
              onClick={() => document.getElementById("profile-lower-sections")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Scroll for Profile Info ↓
            </button>
          </section>

          <div id="profile-lower-sections" className={styles.settingsGrid}>
            <section className={styles.settingsCard}>
              <h3>Profile Information</h3>
              <p className={styles.settingsSubtitle}>Your profile details</p>
              
              <div className={styles.reviewSection}>
                <div className={styles.reviewItem}>
                  <span className={styles.label}>Student ID:</span>
                  <span className={styles.value}>{formData.studentId}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.label}>Year Level:</span>
                  <span className={styles.value}>{formData.yearLevel}</span>
                </div>
                {formData.bio && (
                  <div className={styles.reviewItem}>
                    <span className={styles.label}>Bio:</span>
                    <span className={styles.value}>{formData.bio}</span>
                  </div>
                )}
              </div>
            </section>

            <section className={styles.settingsCard}>
              <h3>Class Selection</h3>
              <p className={styles.settingsSubtitle}>Your section determines which courses are available.</p>
              
              <div className={styles.classPanel}>
                <div className={styles.classPanelHeader}>
                  <span className={styles.classPill}>Class Section</span>
                  <span className={`${styles.classState} ${classLocked ? styles.classStateLocked : styles.classStateOpen}`}>
                    {classLocked ? "Locked" : "Not Set"}
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Section</label>
                  <select
                    value={formData.classId || ""}
                    disabled={classLocked}
                    onChange={async (e) => {
                      const newClassId = e.target.value ? Number(e.target.value) : null;
                      setFormData({ ...formData, classId: newClassId });
                      if (!newClassId) return;
                      try {
                        await apiRequest("/api/auth/me", {
                          method: "PUT",
                          body: { class_id: newClassId },
                          student: true,
                        });
                        const myCoursesData = await apiRequest("/api/public/my-courses", { student: true });
                        setMyCourses(myCoursesData?.courses || []);
                      } catch (err) {
                        alert("Failed to update class: " + err.message);
                      }
                    }}
                    className={styles.formInput}
                  >
                    <option value="">Select your section</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
                    ))}
                  </select>
                </div>

                <p className={styles.classPanelHint}>
                  {classLocked
                    ? `Assigned section: ${selectedClassLabel || "Assigned section"}. You cannot change this.`
                    : "Select your section once. After it is saved, it will be locked."}
                </p>
              </div>

              <button onClick={() => router.push("/dashboard")} className={styles.btnSecondary}>
                Back to Dashboard
              </button>
            </section>
          </div>

          <section className={styles.catalogSection}>
            <h3>Course Catalog</h3>
            <p className={styles.settingsSubtitle}>Enroll in more courses from your profile page</p>
            <div className={styles.catalogGrid}>
              {availableToEnroll.length === 0 ? (
                <p className={styles.catalogMuted}>
                  {hasClassSelected
                    ? "No additional courses available for enrollment."
                    : "Select and save your class first to see class-based courses."}
                </p>
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
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.bgLayer} />
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <Image src="/images/DucksiteT-logo.png" alt="DuckSiteT" width={220} height={56} className={styles.brandLogo} priority />
          </div>
          <nav className={styles.topNav}>
            <button type="button" onClick={() => router.push("/dashboard")}>Dashboard</button>
            <button type="button" onClick={() => router.push("/courses")}>Courses</button>
            <button type="button" onClick={() => router.push("/leaderboard")}>Leaderboard</button>
            <button type="button" className={styles.active}>Profile</button>
            <button type="button" onClick={() => { clearSession(); router.push("/login"); }}>Logout</button>
          </nav>
          <div className={styles.playerMeta}>
            <span>XP {userXp}</span>
            <span>Level {userLevel}</span>
          </div>
        </header>

        <section className={styles.profileCard}>
          <div className={styles.progress}>
            <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ""}`}>1</div>
            <div className={`${styles.line} ${currentStep >= 2 ? styles.active : ""}`}></div>
            <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ""}`}>2</div>
            <div className={`${styles.line} ${currentStep >= 3 ? styles.active : ""}`}></div>
            <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}>3</div>
          </div>

          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <h2>Personal Information</h2>
              <p className={styles.stepDesc}>Let&apos;s start with your basic information</p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First Name"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last Name"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Middle Name (Optional)</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  placeholder="Middle Name"
                  className={styles.formInput}
                />
              </div>
              <button onClick={() => handleNext(1)} className={styles.btnPrimary}>
                Next
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <h2>Student Information</h2>
              <p className={styles.stepDesc}>Tell us more about yourself</p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Student ID</label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="Your Student ID"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Year Level</label>
                <select
                  value={formData.yearLevel}
                  onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
                  className={styles.formInput}
                >
                  <option value="">Select Year Level</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bio (Optional)</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows="3"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Class Section</label>
                <div className={styles.classPanelCompact}>
                  <select
                    value={formData.classId || ""}
                    disabled={classLocked}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value ? Number(e.target.value) : null })}
                    className={styles.formInput}
                  >
                    <option value="">Select your section</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
                    ))}
                  </select>
                  <small className={styles.classPanelHintInline}>
                    {classLocked
                      ? `Locked section: ${selectedClassLabel || "Assigned section"}.`
                      : "Pick your section carefully. It becomes locked after saving."}
                  </small>
                </div>
              </div>
              <div className={styles.buttonGroup}>
                <button onClick={() => setCurrentStep(1)} className={styles.btnSecondary}>
                  Back
                </button>
                <button onClick={() => handleNext(2)} className={styles.btnPrimary}>
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <h2>Review Your Information</h2>
              <p className={styles.stepDesc}>Please review your information before completing</p>
              <div className={styles.reviewSection}>
                <div className={styles.reviewItem}>
                  <span className={styles.label}>Name:</span>
                  <span className={styles.value}>{fullName}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.label}>Email:</span>
                  <span className={styles.value}>{profile.email}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.label}>Student ID:</span>
                  <span className={styles.value}>{formData.studentId}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.label}>Year Level:</span>
                  <span className={styles.value}>{formData.yearLevel}</span>
                </div>
                {formData.bio && (
                  <div className={styles.reviewItem}>
                    <span className={styles.label}>Bio:</span>
                    <span className={styles.value}>{formData.bio}</span>
                  </div>
                )}
              </div>
              <div className={styles.buttonGroup}>
                <button onClick={() => setCurrentStep(2)} className={styles.btnSecondary}>
                  Back
                </button>
                <button onClick={handleComplete} className={styles.btnPrimary}>
                  Complete Profile
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
