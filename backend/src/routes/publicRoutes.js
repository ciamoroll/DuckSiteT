const express = require("express");
const {
  listPublicCourses,
  listPublicMaterials,
} = require("../controllers/publicController");

const router = express.Router();

router.get("/courses", listPublicCourses);
router.get("/materials", listPublicMaterials);

module.exports = router;
