"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { apiRequest } from "@/lib/api";
import styles from "./progress.module.css";

export default function ProgressPage() {
  const [progressData, setProgressData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  useEffect(() => {
    Promise.all([fetchProgress(), fetchClasses()]);
  }, []);

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

  async function fetchClasses() {
    try {
      const data = await apiRequest("/api/classes", { admin: true });
      setClasses(data?.classes || []);
    } catch (_err) {
      setClasses([]);
    }
  }

  const availableClassCodes = Array.from(
    new Set(
      [
        ...progressData.map((item) => String(item.class_code || "").trim()),
        ...classes.map((item) => String(item.code || "").trim()),
      ].filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const classFilteredData = progressData.filter((item) => {
    return classFilter === "all" || String(item.class_code || "").trim() === classFilter;
  });

  const summary = classFilteredData.reduce(
    (acc, item) => {
      const status = String(item.status || "");
      acc.total += 1;
      if (status === "Completed") acc.completed += 1;
      else if (status === "In Progress") acc.inProgress += 1;
      return acc;
    },
    { total: 0, completed: 0, inProgress: 0 }
  );

  const filteredData = classFilteredData.filter((item) => {
    const statusMatch = statusFilter === "all" || String(item.status || "") === statusFilter;
    return statusMatch;
  });

  return (
    <AdminShell title="Progress Monitoring">
      <div className={styles.container}>
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

        <div className={styles.filters}>
          <label>Filter by Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <label>Filter by Class:</label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">All Classes</option>
            {availableClassCodes.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
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
                  <th>Class</th>
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
                    <td>{item.class_code || "—"}</td>
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
