const ticketsService = require("./tickets.service");
const {
  validateCreateTicket,
  validateUpdateStatus,
  validateUpdateTicket,
} = require("./tickets.validation");

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
 * GET /api/tickets - Get tickets (supports filtering by status, priority, department, help_topic, user_id, email, assigned_to & pagination)
 */
const getTickets = async (req, res, next) => {
  try {
    const { status, priority, department_id, help_topic_id, user_id, email, assigned_to, page = 1, limit = 20 } = req.query;

    const tickets = await ticketsService.getTickets({
      status,
      priority,
      department_id,
      help_topic_id,
      user_id,
      email,
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
 * GET /api/tickets?email=xxx - Get tickets by user email
 */
const getTicketsByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required.",
      });
    }

    return await getTickets(req, res, next);
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
 * PATCH /api/tickets/:id - Update ticket details (supports all fields: status, priority, department_id, help_topic_id, assigned_to, subject, description, mobile, room, pabx, etc.)
 */
const updateTicket = async (req, res, next) => {
  try {
    const validation = validateUpdateTicket(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const updatedTicket = await ticketsService.updateTicket(
      req.params.id,
      req.body
    );

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.json({
      success: true,
      message: "Ticket updated successfully",
      data: updatedTicket,
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

/**
 * DELETE /api/tickets/:id - Delete a ticket
 */
const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await ticketsService.deleteTicket(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.json({
      success: true,
      message: "Ticket deleted successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketsByEmail,
  getTicketsbyEmail: getTicketsByEmail,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  assignTicket,
  deleteTicket,
};
