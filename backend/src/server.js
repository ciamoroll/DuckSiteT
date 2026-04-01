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
const { requestLogger } = require("./middleware/requestLogger");
const { makeErrorId } = require("./utils/response");

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ducksite-backend" });
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
