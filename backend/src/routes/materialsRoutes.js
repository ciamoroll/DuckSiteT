const express = require("express");
const {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  uploadMaterialFile,
} = require("../controllers/materialsController");
const { requireAdmin } = require("../middleware/adminMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const router = express.Router();

router.get("/", requireAdmin, listMaterials);
router.post("/", requireAdmin, createMaterial);
router.put("/:id", requireAdmin, updateMaterial);
router.post("/upload", requireAdmin, upload.single("file"), uploadMaterialFile);
router.delete("/:id", requireAdmin, deleteMaterial);

module.exports = router;
