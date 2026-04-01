"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole, getStudentToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { storage } from "@/lib/storage";
import styles from "./profile.module.css";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
    yearLevel: "",
    bio: "",
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
      const data = await apiRequest("/api/auth/me", { student: true });
      setProfile(data.profile);
      setCurrentStep(data.profile.profile_step || 1);
      setFormData({
        firstName: data.profile.first_name || "",
        lastName: data.profile.last_name || "",
        studentId: data.profile.student_id || "",
        yearLevel: data.profile.year_level || "",
        bio: data.profile.bio || "",
      });
    } catch (err) {
      alert("Failed to load profile: " + err.message);
    } finally {
      setLoading(false);
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
    }

    try {
      await apiRequest("/api/auth/me", {
        method: "PUT",
        body: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          student_id: formData.studentId,
          year_level: formData.yearLevel,
          bio: formData.bio,
          profile_step: step + 1,
        },
        student: true,
      });
      setCurrentStep(step + 1);
    } catch (err) {
      alert("Error saving profile: " + err.message);
    }
  }

  async function handleComplete() {
    try {
      await apiRequest("/api/auth/me", {
        method: "PUT",
        body: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          student_id: formData.studentId,
          year_level: formData.yearLevel,
          bio: formData.bio,
          profile_completed: true,
          profile_step: 3,
        },
        student: true,
      });
      alert("Profile completed successfully!");
      router.push("/dashboard");
    } catch (err) {
      alert("Error completing profile: " + err.message);
    }
  }

  if (loading) {
    return <div className={styles.container}><p>Loading profile...</p></div>;
  }

  if (!profile) {
    return <div className={styles.container}><p>Unable to load profile</p></div>;
  }

  if (profile.profile_completed) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>Profile Already Complete</h2>
          <p>Your profile is already set up and complete.</p>
          <button onClick={() => router.push("/dashboard")} className={styles.btn_primary}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.progress}>
          <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ""}`}>1</div>
          <div className={`${styles.line} ${currentStep >= 2 ? styles.active : ""}`}></div>
          <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ""}`}>2</div>
          <div className={`${styles.line} ${currentStep >= 3 ? styles.active : ""}`}></div>
          <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}>3</div>
        </div>

        {currentStep === 1 && (
          <div className={styles.step_content}>
            <h2>Personal Information</h2>
            <p className={styles.step_desc}>Let&apos;s start with your basic information</p>
            <div className={styles.form_group}>
              <label>First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First Name"
              />
            </div>
            <div className={styles.form_group}>
              <label>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last Name"
              />
            </div>
            <button onClick={() => handleNext(1)} className={styles.btn_primary}>
              Next
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className={styles.step_content}>
            <h2>Student Information</h2>
            <p className={styles.step_desc}>Tell us more about yourself</p>
            <div className={styles.form_group}>
              <label>Student ID</label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="Your Student ID"
              />
            </div>
            <div className={styles.form_group}>
              <label>Year Level</label>
              <select
                value={formData.yearLevel}
                onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
              >
                <option value="">Select Year Level</option>
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
              </select>
            </div>
            <div className={styles.form_group}>
              <label>Bio (Optional)</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows="3"
              />
            </div>
            <div className={styles.button_group}>
              <button onClick={() => setCurrentStep(1)} className={styles.btn_secondary}>
                Back
              </button>
              <button onClick={() => handleNext(2)} className={styles.btn_primary}>
                Next
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className={styles.step_content}>
            <h2>Review Your Information</h2>
            <p className={styles.step_desc}>Please review your information before completing</p>
            <div className={styles.review_section}>
              <div className={styles.review_item}>
                <span className={styles.label}>Name:</span>
                <span className={styles.value}>{formData.firstName} {formData.lastName}</span>
              </div>
              <div className={styles.review_item}>
                <span className={styles.label}>Email:</span>
                <span className={styles.value}>{profile.email}</span>
              </div>
              <div className={styles.review_item}>
                <span className={styles.label}>Student ID:</span>
                <span className={styles.value}>{formData.studentId}</span>
              </div>
              <div className={styles.review_item}>
                <span className={styles.label}>Year Level:</span>
                <span className={styles.value}>{formData.yearLevel}</span>
              </div>
              {formData.bio && (
                <div className={styles.review_item}>
                  <span className={styles.label}>Bio:</span>
                  <span className={styles.value}>{formData.bio}</span>
                </div>
              )}
            </div>
            <div className={styles.button_group}>
              <button onClick={() => setCurrentStep(2)} className={styles.btn_secondary}>
                Back
              </button>
              <button onClick={handleComplete} className={styles.btn_primary}>
                Complete Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
