const express = require("express");
const router = express.Router();
const ticketFeedbackController = require("./ticket_feedback.controller");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

// Base route: /api/ticket-feedback
router.post("/", authenticate, authorize("user", "agent", "admin"), ticketFeedbackController.createFeedback);
router.get("/", authenticate, authorize("user", "agent", "admin"), ticketFeedbackController.getAllFeedback);
router.get("/ticket/:ticketId", authenticate, authorize("user", "agent", "admin"), ticketFeedbackController.getFeedbackByTicket);
router.get("/:id", authenticate, authorize("user", "agent", "admin"), ticketFeedbackController.getFeedbackById);
router.patch("/:id", authenticate, authorize("user", "agent", "admin"), ticketFeedbackController.updateFeedback);
router.delete("/:id", authenticate, authorize("admin"), ticketFeedbackController.deleteFeedback);

module.exports = router;
