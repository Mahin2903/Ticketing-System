/**
 * Validation helpers for Ticket Feedback
 */

const isInteger = (val) => {
  if (typeof val === "number") return Number.isInteger(val) && val > 0;
  if (typeof val === "string" && val.trim() !== "") {
    const num = Number(val);
    return Number.isInteger(num) && num > 0;
  }
  return false;
};

const validateCreateFeedback = (data) => {
  const errors = [];

  if (!data || typeof data !== "object") {
    return {
      isValid: false,
      errors: ["Request payload is required."],
    };
  }

  const { ticket_id, user_id, comment } = data;

  if (!isInteger(ticket_id)) {
    errors.push("ticket_id is required and must be a positive integer.");
  }

  if (!isInteger(user_id)) {
    errors.push("user_id is required and must be a positive integer.");
  }

  if (!comment || typeof comment !== "string" || !comment.trim()) {
    errors.push("comment is required and must be a non-empty string.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateFeedback = (data) => {
  const errors = [];

  if (!data || typeof data !== "object") {
    return {
      isValid: false,
      errors: ["Request payload is required."],
    };
  }

  const { comment } = data;

  if (comment === undefined || comment === null || typeof comment !== "string" || !comment.trim()) {
    errors.push("comment is required and must be a non-empty string.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCreateFeedback,
  validateUpdateFeedback,
};
