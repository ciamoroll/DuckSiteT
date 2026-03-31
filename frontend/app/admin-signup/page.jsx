"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function AdminSignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");

  function validatePassword(value) {
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value || "");
  }

  async function createAdminAccount() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !setupKey) {
      alert("Please fill all fields");
      return;
    }
    if (!validatePassword(password)) {
      alert(
        "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.",
      );
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/admin-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          setupKey,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Failed to create admin account");
      }
      alert("Admin account created. You can now login as admin.");
      router.push("/login");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
        }
        .page {
          height: 100vh;
          background: url("/images/backgrounds/background.jpg") no-repeat center/cover;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .container {
          background: rgba(255, 255, 200, 0.85);
          padding: 30px;
          border-radius: 20px;
          width: 350px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
          border: 3px solid #2f6b2f;
        }
        h2 {
          margin-bottom: 20px;
          text-align: center;
          color: #2f6b2f;
          font-weight: bold;
          font-size: 22px;
        }
        input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          border: 1px solid #ccc;
          border-radius: 5px;
          background: #2f6b2f;
          color: white;
        }
        input::placeholder {
          color: #ddd;
        }
        button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .create-btn {
          background: #f4e7a1;
          color: #2f6b2f;
        }
        .back-btn {
          background: #ccc;
          color: #333;
        }
      `}</style>
      <div className="page">
        <div className="container">
          <h2>🦆 Admin Account Setup</h2>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Admin Email" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
          />
          <input
            value={setupKey}
            onChange={(e) => setSetupKey(e.target.value)}
            type="password"
            placeholder="Admin Setup Key"
          />
          <button className="create-btn" onClick={createAdminAccount}>
            Create Admin Account
          </button>
          <button className="back-btn" onClick={() => router.push("/login")}>
            Back to Login
          </button>
        </div>
      </div>
    </>
  );
}
