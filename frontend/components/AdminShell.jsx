"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { storage } from "@/lib/storage";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/challenges", label: "Challenges" },
  { href: "/admin/progress", label: "Progress" },
];

export default function AdminShell({ title, children }) {
  const router = useRouter();
  const firstName = storage.get("firstName", "Prof.");

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className="page-wrap stack">
      <div className="panel stack">
        <h1>{title}</h1>
        <p>Admin: {firstName}</p>
        <div className="nav">
          {links.map((item) => (
            <button key={item.href} className="secondary" onClick={() => router.push(item.href)}>
              {item.label}
            </button>
          ))}
        </div>
        <button className="danger" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="panel">{children}</div>
    </main>
  );
}
