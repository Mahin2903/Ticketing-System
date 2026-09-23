const ticketRepliesService = require("./ticket_replies.service");
const ticketsService = require("../tickets/tickets.service");
const { validateCreateReply } = require("./ticket_replies.validation");

/**
 * Ticket Replies Controller
 */

/**
 * POST /api/ticket-replies or /api/tickets/:id/replies
 * Create a new reply for a ticket and broadcast real-time socket events.
 */
const createReply = async (req, res) => {
  const ticketId = req.params.ticketId || req.params.id || req.body.ticket_id;
  
  if (!ticketId) {
    return res.status(400).json({
      success: false,
      message: "Ticket ID is required.",
    });
  }

  const ticket = await ticketsService.getTicketById(ticketId);
  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: `Ticket with ID ${ticketId} not found.`,
    });
  }

  // SECURITY: Regular users can only reply to their own tickets
  if (req.user && req.user.role === "user") {
    const isOwner =
      ticket.user_id === req.user.uid ||
      (req.user.dbId && ticket.user_id === String(req.user.dbId));

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to reply to another user's ticket.",
      });
    }
  }

  // Author identity strictly bound to authenticated user
  const authorUserId = req.user?.dbId || req.user?.id;
  const payload = {
    ticket_id: ticket.id,
    user_id: authorUserId,
    message: req.body.message,
  };

  const validation = validateCreateReply(payload);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  const result = await ticketRepliesService.createReply(payload);

  if (result.error === "TICKET_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: `Ticket with ID ${ticketId} not found.`,
    });
  }

  if (result.error === "USER_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: `User record not found for authenticated user.`,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Ticket reply sent successfully.",
    data: result.reply,
  });
};

/**
 * GET /api/ticket-replies/ticket/:ticketId or /api/tickets/:id/replies
 * Fetch all replies for a ticket in chronological order.
 */
const getRepliesByTicket = async (req, res) => {
  const ticketId = req.params.ticketId || req.params.id || req.query.ticket_id;

  const parsedTicketId = parseInt(ticketId, 10);
  if (!ticketId || isNaN(parsedTicketId) || parsedTicketId <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid positive integer ticket ID is required.",
    });
  }

  const ticket = await ticketsService.getTicketById(parsedTicketId);
  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: `Ticket with ID ${parsedTicketId} not found.`,
    });
  }

  // SECURITY: Regular users can only view replies of their own tickets
  if (req.user && req.user.role === "user") {
    const isOwner =
      ticket.user_id === req.user.uid ||
      (req.user.dbId && ticket.user_id === String(req.user.dbId));

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to view replies for another user's ticket.",
      });
    }
  }

  const replies = await ticketRepliesService.getRepliesByTicketId(parsedTicketId);

  return res.json({
    success: true,
    count: replies.length,
    data: replies,
  });
};

/**
 * GET /api/ticket-replies/:id
 * Fetch a single reply by its ID.
 */
const getReplyById = async (req, res) => {
  const replyId = req.params.id;
  const parsedReplyId = parseInt(replyId, 10);

  if (!replyId || isNaN(parsedReplyId) || parsedReplyId <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid positive integer reply ID is required.",
    });
  }

  const reply = await ticketRepliesService.getReplyById(parsedReplyId);

  if (!reply) {
    return res.status(404).json({
      success: false,
      message: `Reply with ID ${replyId} not found.`,
    });
  }

  return res.json({
    success: true,
    data: reply,
  });
};

module.exports = {
  createReply,
  getRepliesByTicket,
  getReplyById,
};
