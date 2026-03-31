const express = require("express");
const {
  listPublicCourses,
  listPublicMaterials,
  listLeaderboard,
  upsertPublicProgress,
} = require("../controllers/publicController");

const router = express.Router();

router.get("/courses", listPublicCourses);
router.get("/materials", listPublicMaterials);
router.get("/leaderboard", listLeaderboard);
router.post("/progress-upsert", upsertPublicProgress);

module.exports = router;
