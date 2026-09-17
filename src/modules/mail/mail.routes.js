const express = require("express");
const router = express.Router();
const mailController = require("./mail.controller");

// Base route: /api/mail
router.get("/verify", mailController.verifyConnection);
router.post("/test", mailController.sendTestEmail);

module.exports = router;
