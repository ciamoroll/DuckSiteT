const express = require("express");
const {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
} = require("../controllers/classesController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", requireAdmin, listClasses);
router.post("/", requireAdmin, createClass);
router.put("/:id", requireAdmin, updateClass);
router.delete("/:id", requireAdmin, deleteClass);

module.exports = router;
