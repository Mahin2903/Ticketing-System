/**
 * Validation helpers for Ticket Replies
 */

const validateCreateReply = (data) => {
  const errors = [];
  const { ticket_id, user_id, message } = data;

  const parsedTicketId = parseInt(ticket_id, 10);
  if (!ticket_id || isNaN(parsedTicketId) || parsedTicketId <= 0) {
    errors.push("ticket_id is required and must be a positive integer.");
  }

  const parsedUserId = parseInt(user_id, 10);
  if (!user_id || isNaN(parsedUserId) || parsedUserId <= 0) {
    errors.push("user_id is required and must be a positive integer.");
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    errors.push("message is required and must be a non-empty string.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCreateReply,
};
