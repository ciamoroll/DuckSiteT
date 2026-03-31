const express = require("express");
const {
  listProgress,
  getProgressSummary,
} = require("../controllers/progressController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", requireAdmin, listProgress);
router.get("/summary", requireAdmin, getProgressSummary);

module.exports = router;
