const apiBaseUrl = window.APP_CONFIG?.API_BASE_URL || "http://localhost:4000";

function requireAdminSession() {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("adminToken");
  if (role !== "admin" || !token) {
    window.location.href = "/login";
    throw new Error("Admin session required");
  }
  return token;
}

async function request(path, options = {}) {
  const token = requireAdminSession();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || "Request failed");
  }
  return payload;
}

window.AdminApi = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
  apiBaseUrl,
  requireAdminSession,
};
