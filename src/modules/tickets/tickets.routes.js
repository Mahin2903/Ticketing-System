const express = require("express");
const router = express.Router();
const ticketsController = require("./tickets.controller");
const ticketRepliesController = require("../ticket_replies/ticket_replies.controller");

// Base route: /api/tickets
router.post("/", ticketsController.createTicket);
router.get("/", ticketsController.getTickets);
router.get("/:id", ticketsController.getTicketById);

// Replies nested routes
router.post("/:id/replies", ticketRepliesController.createReply);
router.get("/:id/replies", ticketRepliesController.getRepliesByTicket);

// Specific action routes
router.patch("/:id/status", ticketsController.updateTicketStatus);
router.patch("/:id/assign", ticketsController.assignTicket);
router.patch("/:id", ticketsController.updateTicket);
router.delete("/:id", ticketsController.deleteTicket);

module.exports = router;