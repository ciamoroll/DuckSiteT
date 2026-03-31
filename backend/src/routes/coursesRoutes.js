const express = require("express");
const {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/coursesController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", requireAdmin, listCourses);
router.post("/", requireAdmin, createCourse);
router.put("/:id", requireAdmin, updateCourse);
router.delete("/:id", requireAdmin, deleteCourse);

module.exports = router;
