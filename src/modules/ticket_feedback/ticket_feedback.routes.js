const express = require("express");
const router = express.Router();
const ticketFeedbackController = require("./ticket_feedback.controller");

// Base route: /api/ticket-feedback
router.post("/", ticketFeedbackController.createFeedback);
router.get("/", ticketFeedbackController.getAllFeedback);
router.get("/ticket/:ticketId", ticketFeedbackController.getFeedbackByTicket);
router.get("/:id", ticketFeedbackController.getFeedbackById);
router.patch("/:id", ticketFeedbackController.updateFeedback);
router.delete("/:id", ticketFeedbackController.deleteFeedback);

module.exports = router;
