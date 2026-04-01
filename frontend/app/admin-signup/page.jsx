"use client";

import { useRouter } from "next/navigation";

export default function AdminSignupPage() {
  const router = useRouter();

  return (
    <main className="page-wrap">
      <div className="panel stack" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1>Admin Account Creation Disabled</h1>
        <p>Admin users must be created manually in the database by an authorized maintainer.</p>
        <button onClick={() => router.push("/login")}>Back to Login</button>
      </div>
    </main>
  );
}
