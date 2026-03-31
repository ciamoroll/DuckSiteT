const express = require("express");
const { login, signup, adminLogin, adminSignup } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/admin-login", adminLogin);
router.post("/admin-signup", adminSignup);

module.exports = router;
