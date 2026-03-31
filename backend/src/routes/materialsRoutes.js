const express = require("express");
const {
  listMaterials,
  createMaterial,
  deleteMaterial,
} = require("../controllers/materialsController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", requireAdmin, listMaterials);
router.post("/", requireAdmin, createMaterial);
router.delete("/:id", requireAdmin, deleteMaterial);

module.exports = router;
