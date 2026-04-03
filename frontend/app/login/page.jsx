"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { saveAdminSession, saveStudentSession, getRole } from "@/lib/auth";
import styles from "./login.module.css";

const ALLOWED_EMAIL_DOMAIN = "paterostechnologicalcollege.edu.ph";

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
}

function isAllowedInstitutionalEmail(value) {
  return String(value || "").trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (role === "student") router.replace("/dashboard");
    if (role === "admin") router.replace("/admin/dashboard");
  }, [router]);

  async function onLogin() {
    const normalizedIdentifier = String(identifier || "").trim();
    const looksLikeEmail = normalizedIdentifier.includes("@");
    if (!normalizedIdentifier || !password) {
      alert("Email/username and password are required.");
      return;
    }
    if (!isStrongPassword(password)) {
      alert("Password must be at least 8 chars with uppercase, number, and symbol.");
      return;
    } 
    if (looksLikeEmail && !isAllowedInstitutionalEmail(normalizedIdentifier)) {
      alert(`Unauthorized Domain: Please sign in with your institutional email address.`);
      return;
    }

    try {
      setLoading(true);
      // For usernames, go directly to admin login to avoid noisy /auth/login 401.
      if (!looksLikeEmail) {
        const adminPayload = await apiRequest("/api/auth/admin-login", {
          method: "POST",
          body: { username: normalizedIdentifier, password },
        });

        saveAdminSession({
          email: normalizedIdentifier,
          firstName: adminPayload?.firstName || "Prof.",
          lastName: adminPayload?.lastName || "",
          token: adminPayload?.token || "",
        });

        router.push("/admin/dashboard");
        return;
      }

      // Email: try standard auth login first (students and Supabase-based admins).
      try {
        const payload = await apiRequest("/api/auth/login", {
          method: "POST",
          body: { email: normalizedIdentifier.toLowerCase(), password },
        });

        saveStudentSession({
          email: normalizedIdentifier.toLowerCase(),
          firstName: payload?.user?.user_metadata?.first_name || "Student",
          lastName: payload?.user?.user_metadata?.last_name || "",
          userId: payload?.user?.id || "",
          accessToken: payload?.session?.access_token || "",
        });

        const me = await apiRequest("/api/auth/me", { student: true });
        if (me?.profile?.role === "admin") {
          const adminPayload = await apiRequest("/api/auth/admin-login", {
            method: "POST",
            body: { username: normalizedIdentifier, password },
          });

          saveAdminSession({
            email: normalizedIdentifier,
            firstName: adminPayload?.firstName || me?.profile?.first_name || "Prof.",
            lastName: adminPayload?.lastName || me?.profile?.last_name || "",
            token: adminPayload?.token || "",
          });

          router.push("/admin/dashboard");
          return;
        }

        router.push("/dashboard");
        return;
      } catch (_studentErr) {
        // If email auth fails, fallback to admin credentials login.
      }

      const adminPayload = await apiRequest("/api/auth/admin-login", {
        method: "POST",
        body: { username: normalizedIdentifier, password },
      });

      saveAdminSession({
        email: normalizedIdentifier,
        firstName: adminPayload?.firstName || "Prof.",
        lastName: adminPayload?.lastName || "",
        token: adminPayload?.token || "",
      });

      router.push("/admin/dashboard");
    } catch (error) {
      alert(error.message || "Login failed");
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
        <h1 className={styles.title}>Welcome to DuckSiteT</h1>

        <div className={styles.tabRow}>
          <button type="button" className={`${styles.tab} ${styles.activeTab}`}>Login</button>
          <button type="button" className={styles.tab} onClick={() => router.push("/signup")}>Sign up</button>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email / Username</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Enter email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className={styles.loginBtn} onClick={onLogin} disabled={loading}>
          {loading ? "Please wait..." : "Login"}
        </button>
      </section>
    </main>
  );
}
