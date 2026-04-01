"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./progress.module.css";

export default function ProgressPage() {
  const [progressData, setProgressData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    Promise.all([fetchProgress(), fetchSummary()]);
  }, [filter]);

  async function fetchProgress() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/progress", { admin: true });
      setProgressData(data?.rows || []);
    } catch (err) {
      alert("Failed to fetch progress: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary() {
    try {
      const data = await apiRequest("/api/progress/summary", { admin: true });
      setSummary(data?.summary || null);
    } catch (err) {
      console.log("Failed to fetch summary");
    }
  }

  const filteredData =
    filter === "all" ? progressData : progressData.filter((p) => String(p.status || "") === filter);

  return (
    <AdminShell title="Progress Monitoring">
      <div className={styles.container}>
        {summary && (
          <div className={styles.summary}>
            <div className={styles.summary_card}>
              <h4>Total Students</h4>
              <p className={styles.summary_number}>{summary.total || 0}</p>
            </div>
            <div className={styles.summary_card}>
              <h4>In Progress</h4>
              <p className={styles.summary_number}>{summary.inProgress || 0}</p>
            </div>
            <div className={styles.summary_card}>
              <h4>Completed</h4>
              <p className={styles.summary_number}>{summary.completed || 0}</p>
            </div>
          </div>
        )}

        <div className={styles.filters}>
          <label>Filter by Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <p>Loading progress data...</p>
        ) : progressData.length === 0 ? (
          <p>No progress data found</p>
        ) : (
          <div className={styles.table_container}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Current Module</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name || "—"}</td>
                    <td>{item.module || "—"}</td>
                    <td><span className={styles.badge}>{item.status || "—"}</span></td>
                    <td>{item.progress || 0}%</td>
                    <td>{item.last_updated ? new Date(item.last_updated).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
