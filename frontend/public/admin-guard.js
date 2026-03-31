(function () {
  const role = localStorage.getItem("role");
  if (role !== "admin") {
    window.location.href = "/login";
    return;
  }
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    window.location.href = "/login";
  }
})();
