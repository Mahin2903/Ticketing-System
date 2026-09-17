const express = require("express");
const router = express.Router();
const ticketRepliesController = require("./ticket_replies.controller");

// Base route: /api/ticket-replies
router.post("/", ticketRepliesController.createReply);
router.get("/ticket/:ticketId", ticketRepliesController.getRepliesByTicket);
router.get("/:id", ticketRepliesController.getReplyById);
router.get("/", ticketRepliesController.getRepliesByTicket);

module.exports = router;
