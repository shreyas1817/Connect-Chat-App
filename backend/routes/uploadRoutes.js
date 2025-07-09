const express = require("express");
const { uploadProfileImage } = require("../controllers/uploadController");

const router = express.Router();

// Upload profile image route
router.post("/profile-image", uploadProfileImage);

module.exports = router;
