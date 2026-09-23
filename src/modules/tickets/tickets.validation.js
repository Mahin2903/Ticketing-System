const isInteger = (val) => {
  if (typeof val === "number") return Number.isInteger(val);
  if (typeof val === "string" && val.trim() !== "") {
    const num = Number(val);
    return Number.isInteger(num) && !isNaN(num);
  }
  return false;
};

// Reverted strictly to core supported values with COMPLETED alias support
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "URGENT"];
const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETE", "COMPLETED"];

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

  if (data.user_id === undefined || data.user_id === null || (typeof data.user_id === "string" && !data.user_id.trim())) {
    errors.push("user_id is required.");
  }

  if (!data.mobile || typeof data.mobile !== "string" || !data.mobile.trim()) {
    errors.push("Mobile number is required.");
  }

  if (data.department_id !== undefined && data.department_id !== null && !isInteger(data.department_id)) {
    errors.push("department_id must be an integer.");
  }

  if (data.help_topic_id !== undefined && data.help_topic_id !== null && !isInteger(data.help_topic_id)) {
    errors.push("help_topic_id must be an integer.");
  }

  if (data.priority) {
    const uppercasePriority = String(data.priority).toUpperCase();
    if (!VALID_PRIORITIES.includes(uppercasePriority)) {
      errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}.`);
    }
  }

  if (data.status) {
    const uppercaseStatus = String(data.status).toUpperCase();
    if (!VALID_STATUSES.includes(uppercaseStatus)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(", ")}.`);
    }
  }

  if (data.assigned_to !== undefined && data.assigned_to !== null && !isInteger(data.assigned_to)) {
    errors.push("assigned_to must be an integer.");
  }

  if (data.building_name !== undefined && data.building_name !== null && typeof data.building_name !== "string") {
    errors.push("building_name must be a string.");
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

  if (!VALID_STATUSES.includes(uppercaseStatus)) {
    return {
      isValid: false,
      errors: [`Status must be one of: ${VALID_STATUSES.join(", ")}`],
    };
  }

  return { isValid: true, errors: [] };
};

const validateUpdateTicket = (data) => {
  const errors = [];

  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return { isValid: false, errors: ["Request body with at least one field to update is required."] };
  }

  if (data.subject !== undefined) {
    if (typeof data.subject !== "string" || !data.subject.trim()) {
      errors.push("Subject must be a non-empty string.");
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== "string" || !data.description.trim()) {
      errors.push("Description must be a non-empty string.");
    }
  }

  if (data.user_id !== undefined && data.user_id !== null && !isInteger(data.user_id)) {
    errors.push("user_id must be an integer.");
  }

  if (data.mobile !== undefined) {
    if (typeof data.mobile !== "string" || !data.mobile.trim()) {
      errors.push("Mobile must be a non-empty string.");
    }
  }

  if (data.room !== undefined && data.room !== null && typeof data.room !== "string") {
    errors.push("room must be a string or null.");
  }

  if (data.pabx !== undefined && data.pabx !== null && typeof data.pabx !== "string") {
    errors.push("pabx must be a string or null.");
  }

  if (data.building_name !== undefined && data.building_name !== null && typeof data.building_name !== "string") {
    errors.push("building_name must be a string or null.");
  }

  if (data.department_id !== undefined && data.department_id !== null && !isInteger(data.department_id)) {
    errors.push("department_id must be an integer or null.");
  }

  if (data.help_topic_id !== undefined && data.help_topic_id !== null && !isInteger(data.help_topic_id)) {
    errors.push("help_topic_id must be an integer or null.");
  }

  if (data.priority !== undefined) {
    const uppercasePriority = String(data.priority).toUpperCase();
    if (!VALID_PRIORITIES.includes(uppercasePriority)) {
      errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}.`);
    }
  }

  if (data.status !== undefined) {
    const uppercaseStatus = String(data.status).toUpperCase();
    if (!VALID_STATUSES.includes(uppercaseStatus)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(", ")}.`);
    }
  }

  if (data.assigned_to !== undefined && data.assigned_to !== null && data.assigned_to !== "") {
    if (!isInteger(data.assigned_to)) {
      errors.push("assigned_to must be an integer or null.");
    }
  }

  if (data.total_pending_seconds !== undefined && !isInteger(data.total_pending_seconds)) {
    errors.push("total_pending_seconds must be an integer.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCreateTicket,
  validateUpdateStatus,
  validateUpdateTicket,
  isInteger,
  VALID_PRIORITIES,
  VALID_STATUSES,
};