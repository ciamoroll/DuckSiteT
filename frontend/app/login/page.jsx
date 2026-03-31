"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "student") router.replace("/dashboard");
    if (role === "admin") router.replace("/admin/dashboard");
  }, [router]);

  async function login() {
    if (!username || !password) {
      alert("Fill all fields");
      return;
    }
    try {
      let user = null;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: username, password }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Login failed");
        user = payload.user;
      } catch (_error) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });
        if (error) throw error;
        user = data.user;
      }

      localStorage.setItem("role", "student");
      localStorage.setItem("firstName", user?.user_metadata?.first_name || "Student");
      localStorage.setItem("lastName", "");
      localStorage.setItem("email", username);
      localStorage.setItem("userId", user?.id || "");
      if (!localStorage.getItem("xp")) localStorage.setItem("xp", "0");
      if (!localStorage.getItem("level")) localStorage.setItem("level", "1");
      router.push("/dashboard");
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  }

  function adminLogin() {
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: adminUser, password: adminPass }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message || "Invalid admin credentials!");
        }
        localStorage.setItem("role", "admin");
        localStorage.setItem("adminToken", payload.token);
        localStorage.setItem("firstName", payload.firstName || "Prof.");
        localStorage.setItem("lastName", payload.lastName || "Cabantog");
        router.push("/admin/dashboard");
      } catch (error) {
        alert(error.message || "Invalid admin credentials!");
      }
    })();
  }

  return (
    <>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: Arial;
        }
        .page {
          background: url("/images/backgrounds/background.jpg") center/cover no-repeat fixed;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
        }
        .container {
          background: rgba(0, 0, 0, 0.7);
          padding: 30px;
          border-radius: 15px;
          width: 320px;
          text-align: center;
        }
        h1 {
          margin-bottom: 20px;
          color: #ffd700;
        }
        input {
          width: 100%;
          padding: 10px;
          margin: 8px 0;
          border: none;
          border-radius: 5px;
        }
        button {
          width: 100%;
          padding: 10px;
          margin-top: 10px;
          border: none;
          border-radius: 5px;
          background: #e6d36f;
          color: black;
          font-weight: bold;
          cursor: pointer;
        }
        .toggle {
          margin-top: 15px;
          font-size: 13px;
          cursor: pointer;
          color: #ccc;
          background: transparent;
          border: none;
          width: auto;
          padding: 0;
        }
        .admin-box {
          display: ${showAdmin ? "block" : "none"};
          margin-top: 15px;
          border-top: 1px solid #555;
          padding-top: 15px;
        }
        .create-btn {
          background: #1f4d1f;
          color: white;
        }
      `}</style>
      <div className="page">
        <div className="container">
          <h1>🦆 DuckSiteT</h1>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Email" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button onClick={login}>Login</button>
          <button className="create-btn" onClick={() => router.push("/signup")}>
            Create Account
          </button>
          <button type="button" className="toggle" onClick={() => setShowAdmin((v) => !v)}>
            Login as Admin (Professor)
          </button>
          <div className="admin-box">
            <input
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              placeholder="Admin Username"
            />
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              placeholder="Password"
            />
            <button onClick={adminLogin}>Login as Admin</button>
            <button className="create-btn" onClick={() => router.push("/admin-signup")}>
              Create Admin Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
