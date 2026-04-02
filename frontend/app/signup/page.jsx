"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import styles from "./signup.module.css";

const ALLOWED_EMAIL_DOMAIN = "paterostechnologicalcollege.edu.ph";

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
}

function isAllowedInstitutionalEmail(value) {
  return String(value || "").trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSignup() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !normalizedEmail || !password) {
      alert("Please fill all fields.");
      return;
    }
    if (!isStrongPassword(password)) {
      alert("Password must be at least 8 chars with uppercase, number, and symbol.");
      return;
    }
    if (!isAllowedInstitutionalEmail(normalizedEmail)) {
      alert(`Only institutional email addresses ending with @${ALLOWED_EMAIL_DOMAIN} are allowed.`);
      return;
    }

    try {
      setLoading(true);
      await apiRequest("/api/auth/signup", {
        method: "POST",
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password,
        },
      });
      alert("Account created. Please login.");
      router.push("/login");
    } catch (error) {
      alert(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.bgLayer} />
      <div className={styles.topBrand}>
        <Image src="/images/DucksiteT-logo.png" alt="DuckSiteT" width={210} height={54} priority />
      </div>

      <section className={styles.authCard}>
        <h1 className={styles.title}>Create Student Account</h1>

        <div className={styles.tabRow}>
          <button type="button" className={styles.tab} onClick={() => router.push("/login")}>Login</button>
          <button type="button" className={`${styles.tab} ${styles.activeTab}`}>Sign up</button>
        </div>

        <div className={styles.nameGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>First Name</label>
            <input
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Last Name</label>
            <input
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
          />
        </div>

        <button className={styles.actionBtn} onClick={onSignup} disabled={loading}>
          {loading ? "Please wait..." : "Create Account"}
        </button>

        <button className={styles.backBtn} type="button" onClick={() => router.push("/login")}>
          Back to Login
        </button>
      </section>
    </main>
  );
}
