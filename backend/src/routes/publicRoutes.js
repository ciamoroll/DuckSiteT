const express = require("express");
const {
  listPublicCourses,
  listPublicClasses,
  listPublicMaterials,
  listLeaderboard,
  upsertPublicProgress,
  listPublicChallenges,
  debugPublicRoutes,
  listMyCourses,
  listMyChallenges,
  enrollMyCourse,
  submitChallengeAttempt,
} = require("../controllers/publicController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/courses", listPublicCourses);
router.get("/classes", listPublicClasses);
router.get("/materials", listPublicMaterials);
router.get("/leaderboard", listLeaderboard);
router.get("/challenges", listPublicChallenges);
router.get("/debug-routes", debugPublicRoutes);
router.get("/my-courses", authMiddleware, listMyCourses);
router.get("/my-challenges", authMiddleware, listMyChallenges);
router.post("/my-courses/enroll", authMiddleware, enrollMyCourse);
router.post("/progress-upsert", authMiddleware, upsertPublicProgress);
router.post("/challenges/:id/attempt", authMiddleware, submitChallengeAttempt);

module.exports = router;
