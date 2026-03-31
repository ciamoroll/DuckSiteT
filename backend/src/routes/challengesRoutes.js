const express = require("express");
const {
  listChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
} = require("../controllers/challengesController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", requireAdmin, listChallenges);
router.post("/", requireAdmin, createChallenge);
router.put("/:id", requireAdmin, updateChallenge);
router.delete("/:id", requireAdmin, deleteChallenge);

module.exports = router;
