const express = require("express");
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/usersController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", requireAdmin, listUsers);
router.get("/:id", requireAdmin, getUserById);
router.post("/", requireAdmin, createUser);
router.put("/:id", requireAdmin, updateUser);
router.delete("/:id", requireAdmin, deleteUser);

module.exports = router;
