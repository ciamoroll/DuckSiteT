"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
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
    <main className="page-wrap">
      <div className="panel stack" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1>Create Student Account</h1>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button onClick={onSignup} disabled={loading}>
          {loading ? "Please wait..." : "Create Account"}
        </button>
        <button className="secondary" onClick={() => router.push("/login")}>
          Back to Login
        </button>
      </div>
    </main>
  );
}
