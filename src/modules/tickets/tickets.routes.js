const express = require("express");
const router = express.Router();
const ticketsController = require("./tickets.controller");

// Base route: /api/tickets
router.post("/", ticketsController.createTicket);
router.get("/", ticketsController.getTickets);
router.get("/:id", ticketsController.getTicketById);

// Specific action routes
router.patch("/:id/status", ticketsController.updateTicketStatus);
router.patch("/:id/assign", ticketsController.assignTicket);
router.patch("/:id", ticketsController.updateTicket);
router.delete("/:id", ticketsController.deleteTicket);

module.exports = router;