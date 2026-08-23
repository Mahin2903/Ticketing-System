const isInteger = (val) => {
  if (typeof val === "number") return Number.isInteger(val);
  if (typeof val === "string" && val.trim() !== "") {
    return Number.isInteger(Number(val));
  }
  return false;
};

const validateCreateTicket = (data) => {
  const errors = [];

  if (!data) {
    return { isValid: false, errors: ["Request body is required."] };
  }

  if (!data.subject || typeof data.subject !== "string" || !data.subject.trim()) {
    errors.push("Subject is required and must be a non-empty string.");
  }

  if (!data.description || typeof data.description !== "string" || !data.description.trim()) {
    errors.push("Description is required and must be a non-empty string.");
  }

  if (data.user_id === undefined || data.user_id === null || !isInteger(data.user_id)) {
    errors.push("user_id is required and must be an integer.");
  }

  if (!data.mobile || typeof data.mobile !== "string" || !data.mobile.trim()) {
    errors.push("Mobile number is required.");
  }

  if (data.priority) {
    const uppercasePriority = String(data.priority).toUpperCase();
    if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(uppercasePriority)) {
      errors.push("Priority must be one of: LOW, MEDIUM, HIGH, URGENT.");
    }
  }

  if (data.assigned_to !== undefined && data.assigned_to !== null && !isInteger(data.assigned_to)) {
    errors.push("assigned_to must be an integer.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateStatus = (data) => {
  if (!data || !data.status) {
    return { isValid: false, errors: ["Status field is required."] };
  }

  const uppercaseStatus = String(data.status).toUpperCase();
  const validStatuses = ["PENDING", "IN_PROGRESS", "COMPLETE"];

  if (!validStatuses.includes(uppercaseStatus)) {
    return {
      isValid: false,
      errors: [`Status must be one of: ${validStatuses.join(", ")}`],
    };
  }

  return { isValid: true, errors: [] };
};

module.exports = {
  validateCreateTicket,
  validateUpdateStatus,
  isInteger,
};
