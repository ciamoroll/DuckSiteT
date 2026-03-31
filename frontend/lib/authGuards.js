import { storage } from "./storage";

export function hasRole() {
  return Boolean(storage.get("role", ""));
}

export function isAdmin() {
  return storage.get("role", "") === "admin";
}

export function logoutAndGoLogin(router) {
  storage.clear();
  router.push("/login");
}
