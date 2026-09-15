const express = require("express");
const router = express.Router();
const ticketsController = require("./tickets.controller");

// Ticket Endpoints
router.post("/", ticketsController.createTicket);
router.get("/", ticketsController.getTickets);
router.get("/:id", ticketsController.getTicketById);
router.patch("/:id", ticketsController.updateTicket);
router.patch("/:id/status", ticketsController.updateTicketStatus);
router.patch("/:id/assign", ticketsController.assignTicket);
router.delete("/:id", ticketsController.deleteTicket);

module.exports = router;

