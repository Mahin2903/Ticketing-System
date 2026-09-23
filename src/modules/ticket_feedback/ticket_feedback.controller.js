const ticketFeedbackService = require("./ticket_feedback.service");
const {
  validateCreateFeedback,
  validateUpdateFeedback,
} = require("./ticket_feedback.validation");

/**
 * Ticket Feedback Controller
 */

/**
 * POST /api/ticket-feedback or /api/tickets/:id/feedback
 * Submit feedback for a completed ticket.
 */
const createFeedback = async (req, res, next) => {
  try {
    const ticketId = req.params.ticketId || req.params.id || req.body.ticket_id;
    const userId = req.user?.dbId || req.user?.id;
    const comment = req.body.comment || req.body.message || req.body.feedback;

    const payload = {
      ticket_id: ticketId,
      user_id: userId,
      comment,
    };

    const validation = validateCreateFeedback(payload);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const result = await ticketFeedbackService.createFeedback(payload);

    if (result.error === "TICKET_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Ticket with ID ${ticketId} not found.`,
      });
    }

    if (result.error === "TICKET_NOT_COMPLETED") {
      return res.status(400).json({
        success: false,
        message: result.message || "Feedback can only be submitted after ticket completion.",
      });
    }

    if (result.error === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found.`,
      });
    }

    if (result.error === "UNAUTHORIZED_FEEDBACK") {
      return res.status(403).json({
        success: false,
        message: result.message || "Only the user who created the ticket can submit feedback.",
      });
    }

    const statusCode = result.isUpdated ? 200 : 201;
    const responseMsg = result.isUpdated
      ? "Ticket feedback updated successfully."
      : "Ticket feedback submitted successfully.";

    return res.status(statusCode).json({
      success: true,
      message: responseMsg,
      data: result.feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ticket-feedback/ticket/:ticketId or /api/tickets/:id/feedback
 * Fetch feedback for a specific ticket.
 */
const getFeedbackByTicket = async (req, res, next) => {
  try {
    const ticketId = req.params.ticketId || req.params.id || req.query.ticket_id;
    const parsedTicketId = parseInt(ticketId, 10);

    if (!ticketId || isNaN(parsedTicketId) || parsedTicketId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive integer ticket ID is required.",
      });
    }

    const feedbacks = await ticketFeedbackService.getFeedbackByTicketId(parsedTicketId);

    return res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ticket-feedback/:id
 * Fetch a single feedback by its ID.
 */
const getFeedbackById = async (req, res, next) => {
  try {
    const feedbackId = req.params.id;
    const parsedFeedbackId = parseInt(feedbackId, 10);

    if (!feedbackId || isNaN(parsedFeedbackId) || parsedFeedbackId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive integer feedback ID is required.",
      });
    }

    const feedback = await ticketFeedbackService.getFeedbackById(parsedFeedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: `Feedback with ID ${feedbackId} not found.`,
      });
    }

    return res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ticket-feedback
 * Fetch all feedbacks with filters and pagination.
 */
const getAllFeedback = async (req, res, next) => {
  try {
    const { ticket_id, user_id, page = 1, limit = 20 } = req.query;

    const result = await ticketFeedbackService.getAllFeedback({
      ticket_id,
      user_id,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/ticket-feedback/:id or PATCH /api/tickets/:id/feedback
 * Update feedback comment.
 */
const updateFeedback = async (req, res, next) => {
  try {
    const feedbackId = req.params.id;
    const comment = req.body.comment || req.body.message || req.body.feedback;
    const userId = req.user?.dbId || req.user?.id;

    const validation = validateUpdateFeedback({ comment });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const result = await ticketFeedbackService.updateFeedback(feedbackId, {
      comment,
      user_id: userId,
    });

    if (result.error === "FEEDBACK_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: `Feedback with ID ${feedbackId} not found.`,
      });
    }

    if (result.error === "UNAUTHORIZED") {
      return res.status(403).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Feedback updated successfully.",
      data: result.feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ticket-feedback/:id
 * Delete feedback by ID.
 */
const deleteFeedback = async (req, res, next) => {
  try {
    const feedbackId = req.params.id;
    const parsedFeedbackId = parseInt(feedbackId, 10);

    if (!feedbackId || isNaN(parsedFeedbackId) || parsedFeedbackId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive integer feedback ID is required.",
      });
    }

    const deleted = await ticketFeedbackService.deleteFeedback(parsedFeedbackId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Feedback with ID ${feedbackId} not found.`,
      });
    }

    return res.json({
      success: true,
      message: "Feedback deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFeedback,
  getFeedbackByTicket,
  getFeedbackById,
  getAllFeedback,
  updateFeedback,
  deleteFeedback,
};
