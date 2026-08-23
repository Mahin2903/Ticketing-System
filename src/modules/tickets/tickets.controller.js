const ticketsService = require("./tickets.service");
const { validateCreateTicket, validateUpdateStatus } = require("./tickets.validation");

/**
 * POST /api/tickets - Create a new ticket
 */
const createTicket = async (req, res, next) => {
  try {
    const validation = validateCreateTicket(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const ticket = await ticketsService.createTicket(req.body);

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tickets - List all tickets with optional filtering
 */
const getTickets = async (req, res, next) => {
  try {
    const { status, priority, user_id, assigned_to, page = 1, limit = 20 } = req.query;

    const tickets = await ticketsService.getTickets({
      status,
      priority,
      user_id,
      assigned_to,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tickets/:id - Get ticket by ID or Ticket Number
 */
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await ticketsService.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tickets/:id/status - Update ticket status
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const validation = validateUpdateStatus(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const updatedTicket = await ticketsService.updateTicketStatus(
      req.params.id,
      req.body.status
    );

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.json({
      success: true,
      message: "Ticket status updated successfully",
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tickets/:id/assign - Assign ticket
 */
const assignTicket = async (req, res, next) => {
  try {
    const { assigned_to } = req.body;
    if (assigned_to === undefined || assigned_to === null || isNaN(Number(assigned_to))) {
      return res.status(400).json({
        success: false,
        message: "assigned_to field (integer) is required.",
      });
    }

    const updatedTicket = await ticketsService.assignTicket(
      req.params.id,
      assigned_to
    );

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.json({
      success: true,
      message: "Ticket assigned successfully",
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
};
