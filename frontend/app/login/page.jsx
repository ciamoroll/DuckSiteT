"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { saveAdminSession, saveStudentSession, getRole } from "@/lib/auth";
import styles from "./login.module.css";

const ALLOWED_EMAIL_DOMAIN = "paterostechnologicalcollege.edu.ph";

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
      alert("Email and password are required.");
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
          middleName: adminPayload?.middleName || "",
          lastName: adminPayload?.lastName || "",
          token: adminPayload?.token || "",
        });

        router.push("/admin/dashboard");
        return;
      }

      // Email: always use standard auth login. Do not fallback to admin-login,
      // otherwise student login failures show misleading admin authorization errors.
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email: normalizedIdentifier.toLowerCase(), password },
      });

      saveStudentSession({
        email: normalizedIdentifier.toLowerCase(),
        firstName: payload?.user?.user_metadata?.first_name || "Student",
        middleName: payload?.user?.user_metadata?.middle_name || "",
        lastName: payload?.user?.user_metadata?.last_name || "",
        userId: payload?.user?.id || "",
        accessToken: payload?.session?.access_token || "",
      });

      try {
        const me = await apiRequest("/api/auth/me", { student: true });
        if (me?.profile?.role === "admin") {
          const adminPayload = await apiRequest("/api/auth/admin-login", {
            method: "POST",
            body: { username: normalizedIdentifier, password },
          });

          saveAdminSession({
            email: normalizedIdentifier,
            firstName: adminPayload?.firstName || me?.profile?.first_name || "Prof.",
            middleName: adminPayload?.middleName || me?.profile?.middle_name || "",
            lastName: adminPayload?.lastName || me?.profile?.last_name || "",
            token: adminPayload?.token || "",
          });

          router.push("/admin/dashboard");
          return;
        }
      } catch (_meErr) {
        // Keep student session and continue to dashboard if profile probe fails.
      }

      router.push("/dashboard");
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
          {/* suppressHydrationWarning: browser extensions (e.g. form fillers) inject attrs like fdprocessedid on controls */}
          <button
            type="button"
            className={`${styles.tab} ${styles.activeTab}`}
            suppressHydrationWarning
          >
            Login
          </button>
          <button
            type="button"
            className={styles.tab}
            onClick={() => router.push("/signup")}
            suppressHydrationWarning
          >
            Sign up
          </button>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Enter email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            suppressHydrationWarning
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
            suppressHydrationWarning
          />
        </div>

        <button
          className={styles.loginBtn}
          onClick={onLogin}
          disabled={loading}
          suppressHydrationWarning
        >
          {loading ? "Please wait..." : "Login"}
        </button>
      </section>
    </main>
  );
}
