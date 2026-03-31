export const storage = {
  get(key, fallback = null) {
    if (typeof window === "undefined") return fallback;
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  },
  set(key, value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, String(value));
  },
  remove(key) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.clear();
  },
};
