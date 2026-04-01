"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import StudentRouteGuard from "@/components/StudentRouteGuard";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import styles from "./leaderboard.module.css";

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const me = await apiRequest("/api/auth/me", { student: true });
        if (!isMounted) return;

        setProfile(me?.profile || null);
        if (!me?.profile?.profile_completed) {
          router.push("/profile");
          return;
        }

        const leaderboardData = await apiRequest("/api/public/leaderboard");
        if (!isMounted) return;
        setLeaders(leaderboardData?.leaderboard || []);
      } catch (_error) {
        if (!isMounted) return;
        setLeaders([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [router]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const firstName = profile?.first_name || "Student";
  const xp = Number(profile?.xp || 0);
  const level = Math.floor(xp / 500) + 1;
  const userRankIndex = leaders.findIndex((row) => profile && profile.id === row.id);

  return (
    <StudentRouteGuard>
      <main className={styles.page}>
        <div className={styles.bgLayer} />
        <div className={styles.shell}>
          <header className={styles.topBar}>
            <div className={styles.brand}>
              <Image src="/images/DucksiteT-logo.png" alt="DuckSiteT" width={220} height={56} className={styles.brandLogo} priority />
            </div>
            <nav className={styles.topNav}>
              <button type="button" onClick={() => router.push("/dashboard")}>Dashboard</button>
              <button type="button" onClick={() => router.push("/courses")}>Courses</button>
              <button type="button" className={styles.active} onClick={() => router.push("/leaderboard")}>Leaderboard</button>
              <button type="button" onClick={() => router.push("/profile")}>Profile</button>
              <button type="button" onClick={logout}>Logout</button>
            </nav>
            <div className={styles.playerMeta}>
              <span>XP {xp}</span>
              <span>Level {level}</span>
            </div>
          </header>

          {loading ? (
            <section className={styles.loadingCard}>Loading leaderboard...</section>
          ) : (
            <>
              <section className={styles.hero}>
                <div>
                  <h1>Top Ducks This Week</h1>
                  <p>See where you rank among your peers!</p>
                </div>
              </section>

              <section className={styles.panelWide}>
                <h2>Rankings</h2>
                {leaders.length === 0 ? (
                  <p className={styles.muted}>No leaderboard data yet.</p>
                ) : (
                  <div className={styles.leaderList}>
                    {leaders.map((row, index) => {
                      const studentName = row.name || row.first_name || "Student";
                      const studentXp = Number(row.xp || 0);
                      const studentLevel = Math.floor(studentXp / 500) + 1;
                      const isCurrentUser = profile && profile.id === row.id;
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";

                      return (
                        <div
                          key={row.id || index}
                          className={`${styles.leaderRow} ${isCurrentUser ? styles.currentUserRow : ""}`}
                        >
                          <div className={styles.rankInfo}>
                            <span className={styles.rankNumber}>
                              {medal ? medal : `#${index + 1}`}
                            </span>
                            <div>
                              <h4>{studentName}</h4>
                              <p>Level {studentLevel}</p>
                            </div>
                          </div>
                          <div className={styles.pointsInfo}>
                            <span className={styles.xpValue}>{studentXp} XP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {profile && userRankIndex >= 0 && (
                <section className={styles.panelWide}>
                  <h2>Your Position</h2>
                  <div className={styles.yourRankRow}>
                    <div className={styles.rankInfo}>
                      <span className={styles.rankNumber}>#{userRankIndex + 1}</span>
                      <div>
                        <h4>{firstName}</h4>
                        <p>Level {level}</p>
                      </div>
                    </div>
                    <div className={styles.pointsInfo}>
                      <span className={styles.xpValue}>{xp} XP</span>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </StudentRouteGuard>
  );
}
