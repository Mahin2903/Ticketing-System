const express = require("express");
const router = express.Router();
const ticketsController = require("./tickets.controller");
const ticketRepliesController = require("../ticket_replies/ticket_replies.controller");
const ticketFeedbackController = require("../ticket_feedback/ticket_feedback.controller");

// Base route: /api/tickets
router.post("/", ticketsController.createTicket);
router.get("/", ticketsController.getTickets);
router.get("/:id", ticketsController.getTicketById);

// Replies nested routes
router.post("/:id/replies", ticketRepliesController.createReply);
router.get("/:id/replies", ticketRepliesController.getRepliesByTicket);

// Feedback nested routes
router.post("/:id/feedback", ticketFeedbackController.createFeedback);
router.get("/:id/feedback", ticketFeedbackController.getFeedbackByTicket);
router.patch("/:id/feedback", ticketFeedbackController.updateFeedback);
router.delete("/:id/feedback", ticketFeedbackController.deleteFeedback);


// Specific action routes
router.patch("/:id/status", ticketsController.updateTicketStatus);
router.patch("/:id/assign", ticketsController.assignTicket);
router.patch("/:id", ticketsController.updateTicket);
router.delete("/:id", ticketsController.deleteTicket);

module.exports = router;