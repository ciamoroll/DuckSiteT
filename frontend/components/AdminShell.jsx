"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { storage } from "@/lib/storage";
import styles from "./AdminShell.module.css";

export default function AdminShell({ title, children }) {
  const router = useRouter();
  const firstName = storage.get("firstName", "Prof.");
  const middleName = storage.get("middleName", "");
  const lastName = storage.get("lastName", "Cabantog");
  const adminFullName = [firstName, middleName, lastName].filter(Boolean).join(" ") || "Prof. Cabantog";

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <div className={styles.adminIdentity}>
            <div className={styles.avatar}>👩‍🏫</div>
            <div>
              <h1 className={styles.adminName}>{adminFullName}</h1>
              <p className={styles.adminRole}>Teacher&apos;s Admin</p>
            </div>
          </div>
          <div className={styles.topActions}>
            <button type="button" className={styles.headerBtn} onClick={() => router.push("/admin/dashboard")}>Admin Dashboard</button>
            <button type="button" className={styles.headerBtn} onClick={logout}>Logout</button>
          </div>
        </header>

        <section className={styles.intro}>
          <h2>{title}</h2>
          <p>Welcome Admin! Manage users, classes, courses, materials, challenges, and monitor student progress.</p>
        </section>

        <section className={styles.contentWrap}>{children}</section>
      </div>
    </main>
  );
}
