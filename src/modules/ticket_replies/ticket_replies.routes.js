const express = require("express");
const router = express.Router();
const ticketRepliesController = require("./ticket_replies.controller");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

// Base route: /api/ticket-replies
router.post("/", authenticate, authorize("user", "agent", "admin"), ticketRepliesController.createReply);
router.get("/ticket/:ticketId", authenticate, authorize("user", "agent", "admin"), ticketRepliesController.getRepliesByTicket);
router.get("/:id", authenticate, authorize("user", "agent", "admin"), ticketRepliesController.getReplyById);
router.get("/", authenticate, authorize("user", "agent", "admin"), ticketRepliesController.getRepliesByTicket);

module.exports = router;
