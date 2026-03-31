const express = require("express");
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/usersController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", requireAdmin, listUsers);
router.get("/:id", requireAdmin, getUserById);
router.post("/", authMiddleware, requireAdmin, createUser);
router.put("/:id", authMiddleware, requireAdmin, updateUser);
router.delete("/:id", authMiddleware, requireAdmin, deleteUser);

module.exports = router;
