const ticketRepliesService = require("./ticket_replies.service");
const { validateCreateReply } = require("./ticket_replies.validation");

/**
 * Ticket Replies Controller
 * Note: Following the clean code requirement, no explicit try/catch blocks are used.
 * Unhandled exceptions bubble directly to the Express 5 global error middleware.
 */

/**
 * POST /api/ticket-replies or /api/tickets/:id/replies
 * Create a new reply for a ticket and broadcast real-time socket events.
 */
const createReply = async (req, res) => {
  const ticketId = req.params.ticketId || req.params.id || req.body.ticket_id;
  const { user_id, message } = req.body;

  const payload = {
    ticket_id: ticketId,
    user_id,
    message,
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
      message: `User with ID ${user_id} not found.`,
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
