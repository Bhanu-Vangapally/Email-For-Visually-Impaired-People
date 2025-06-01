const express = require("express");
const {
  signup,
  login,
  getSingleUser,
  loginWithName,
  registerWithName,
} = require("../controllers/userController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/get-user", getSingleUser);
router.post("/loginwithName", loginWithName);
router.post("/registerwithName", registerWithName);

module.exports = router;
