const express = require("express");
const router = express.Router();
const mailController = require("./mail.controller");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

// Mail diagnostic & testing routes: strictly ADMIN only
router.get("/verify", authenticate, authorize("admin"), mailController.verifyConnection);
router.post("/test", authenticate, authorize("admin"), mailController.sendTestEmail);

module.exports = router;
