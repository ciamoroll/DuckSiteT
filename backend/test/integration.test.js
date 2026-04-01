const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { app } = require("../src/server");

test("GET /health returns service status", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "ducksite-backend");
});

test("GET /api/auth/me requires bearer token", async () => {
  const response = await request(app).get("/api/auth/me");
  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
});

test("POST /api/public/progress-upsert requires bearer token", async () => {
  const response = await request(app)
    .post("/api/public/progress-upsert")
    .send({ module: "Basics", progress: 10, xp: 100 });
  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
});

test("GET /api/users requires admin auth", async () => {
  const response = await request(app).get("/api/users");
  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
});
