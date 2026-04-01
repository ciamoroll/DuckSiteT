import { storage } from "@/lib/storage";

export function saveStudentSession(payload) {
  storage.set("role", "student");
  storage.set("email", payload.email || "");
  storage.set("firstName", payload.firstName || "Student");
  storage.set("lastName", payload.lastName || "");
  storage.set("userId", payload.userId || "");
  storage.set("studentToken", payload.accessToken || "");
}

export function saveAdminSession(payload) {
  storage.set("role", "admin");
  storage.set("email", payload.email || "");
  storage.set("firstName", payload.firstName || "Prof.");
  storage.set("lastName", payload.lastName || "");
  storage.set("adminToken", payload.token || "");
}

export function clearSession() {
  storage.clear();
}

export function getRole() {
  return storage.get("role", "");
}

export function getAdminToken() {
  return storage.get("adminToken", "");
}

export function getStudentToken() {
  return storage.get("studentToken", "");
}
