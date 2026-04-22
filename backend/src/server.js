const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const coursesRoutes = require("./routes/coursesRoutes");
const progressRoutes = require("./routes/progressRoutes");
const challengesRoutes = require("./routes/challengesRoutes");
const classesRoutes = require("./routes/classesRoutes");
const materialsRoutes = require("./routes/materialsRoutes");
const publicRoutes = require("./routes/publicRoutes");
const { supabase } = require("./services/supabaseService");
const { requestLogger } = require("./middleware/requestLogger");
const { makeErrorId } = require("./utils/response");

const app = express();

const defaultAllowedOrigins = [
  "https://ducksite-ne14006pn-patricias-projects-ee9e3b1c.vercel.app",
  "http://localhost:3000",
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultAllowedOrigins;

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin header) and configured frontend origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

app.get("/health", async (_req, res) => {
  const warnings = [];

  try {
    const { data, error } = await supabase.rpc("has_users_auth_fk_cascade");
    if (error) {
      warnings.push("Unable to verify users->auth.users FK cascade (RPC missing or inaccessible)");
    } else if (!data) {
      warnings.push("users->auth.users FK cascade appears missing");
    }
  } catch (_err) {
    warnings.push("Unable to verify users->auth.users FK cascade (health check exception)");
  }

  res.json({
    ok: true,
    service: "ducksite-backend",
    warnings,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/challenges", challengesRoutes);
app.use("/api/public", publicRoutes);

// Express error fallback with structured error id.
app.use((err, req, res, _next) => {
  const errorId = makeErrorId();
  console.error(
    JSON.stringify({
      errorId,
      requestId: req.requestId,
      message: err.message,
      stack: err.stack,
    }),
  );
  res.status(500).json({
    ok: false,
    message: "Unexpected server error",
    errorId,
  });
});

const port = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}

module.exports = { app };
