"use client";

import AdminShell from "@/components/AdminShell";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

export default function AdminDashboardPage() {
  const router = useRouter();

  const cards = [
    {
      title: "Manage Users",
      description: "View, verify, and manage student accounts.",
      action: "Manage Users",
      href: "/admin/users",
      icon: "🪪",
    },
    {
      title: "Create Classes",
      description: "Create and manage student classes.",
      action: "Manage Classes",
      href: "/admin/classes",
      icon: "🧩",
    },
    {
      title: "Add Courses",
      description: "Create and assign courses to classes.",
      action: "Manage Courses",
      href: "/admin/courses",
      icon: "📚",
    },
    {
      title: "Add Materials",
      description: "Upload learning materials for courses.",
      action: "Manage Materials",
      href: "/admin/materials",
      icon: "📝",
    },
    {
      title: "Create Challenges",
      description: "Design challenges with points and rewards.",
      action: "Manage Challenges",
      href: "/admin/challenges",
      icon: "🖥️",
    },
    {
      title: "Monitor Progress",
      description: "Track student performance and achievements.",
      action: "View Progress",
      href: "/admin/progress",
      icon: "📊",
    },
  ];

  return (
    <AdminShell title="Admin Dashboard">
      <section className={styles.grid}>
        {cards.map((card) => (
          <article key={card.href} className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.icon}>{card.icon}</div>
              <h3>{card.title}</h3>
            </div>
            <p>{card.description}</p>
            <button type="button" onClick={() => router.push(card.href)}>{card.action}</button>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
