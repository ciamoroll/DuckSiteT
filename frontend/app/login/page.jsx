"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { saveAdminSession, saveStudentSession, getRole } from "@/lib/auth";

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
}

export default function LoginPage() {
  const router = useRouter();
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (role === "student") router.replace("/dashboard");
    if (role === "admin") router.replace("/admin/dashboard");
  }, [router]);

  async function onStudentLogin() {
    if (!studentEmail || !studentPassword) {
      alert("Email and password are required.");
      return;
    }
    if (!isStrongPassword(studentPassword)) {
      alert("Password must be at least 8 chars with uppercase, number, and symbol.");
      return;
    }

    try {
      setLoading(true);
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email: studentEmail.trim().toLowerCase(), password: studentPassword },
      });

      saveStudentSession({
        email: studentEmail.trim().toLowerCase(),
        firstName: payload?.user?.user_metadata?.first_name || "Student",
        lastName: payload?.user?.user_metadata?.last_name || "",
        userId: payload?.user?.id || "",
        accessToken: payload?.session?.access_token || "",
      });

      router.push("/dashboard");
    } catch (error) {
      alert(error.message || "Student login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onAdminLogin() {
    if (!adminUser || !adminPassword) {
      alert("Admin credentials are required.");
      return;
    }
    if (!isStrongPassword(adminPassword)) {
      alert("Password must be at least 8 chars with uppercase, number, and symbol.");
      return;
    }

    try {
      setLoading(true);
      const payload = await apiRequest("/api/auth/admin-login", {
        method: "POST",
        body: { username: adminUser.trim(), password: adminPassword },
      });

      saveAdminSession({
        email: adminUser.trim(),
        firstName: payload?.firstName || "Prof.",
        lastName: payload?.lastName || "",
        token: payload?.token || "",
      });

      router.push("/admin/dashboard");
    } catch (error) {
      alert(error.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-wrap">
      <div className="panel stack" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1>Ducksite Login</h1>
        <p>Sign in as student or admin.</p>

        <div className="stack">
          <input
            type="email"
            placeholder="Student email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Student password"
            value={studentPassword}
            onChange={(e) => setStudentPassword(e.target.value)}
          />
          <button onClick={onStudentLogin} disabled={loading}>
            {loading ? "Please wait..." : "Login as Student"}
          </button>
          <button className="secondary" onClick={() => router.push("/signup")}>
            Create Student Account
          </button>
        </div>

        <button className="secondary" onClick={() => setShowAdmin((v) => !v)}>
          {showAdmin ? "Hide Admin Login" : "Show Admin Login"}
        </button>

        {showAdmin && (
          <div className="stack panel">
            <h3>Admin Login</h3>
            <input
              placeholder="Admin username or email"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
            />
            <input
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <button onClick={onAdminLogin} disabled={loading}>
              {loading ? "Please wait..." : "Login as Admin"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
