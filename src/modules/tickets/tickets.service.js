const db = require("../../config/db");
const crypto = require("crypto");   

const generateTicketNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `TCK-${dateStr}-${randomSuffix}`;
};


const createTicket = async ({
  user_id,
  subject,
  description,
  department_id,
  help_topic_id,
  mobile,
  room = null,
  pabx = null,
  priority = "MEDIUM",
  status = "PENDING",
  assigned_to = null,
}) => {
  const ticketNumber = generateTicketNumber();
  const formattedPriority = (priority || "MEDIUM").toUpperCase();
  const formattedStatus = (status || "PENDING").toUpperCase();

  const queryText = `
    INSERT INTO tickets (
      ticket_number, user_id, subject, description, priority,
      department_id, help_topic_id, mobile, room, pabx, status, assigned_to
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const values = [
    ticketNumber,
    parseInt(user_id, 10),
    subject.trim(),
    description.trim(),
    formattedPriority,
    parseInt(department_id, 10),
    parseInt(help_topic_id, 10),
    mobile.trim(),
    room ? room.trim() : null,
    pabx ? pabx.trim() : null,
    formattedStatus,
    assigned_to ? parseInt(assigned_to, 10) : null,
  ];

  const result = await db.query(queryText, values);
  return result.rows[0];
};


const getTickets = async ({
  status,
  priority,
  department_id,
  help_topic_id,
  user_id,
  email,
  assigned_to,
  page = 1,
  limit = 20,
}) => {
  const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;
  const conditions = [];
  const queryParams = [];

  if (status) {
    queryParams.push(status.toUpperCase());
    conditions.push(`status = $${queryParams.length}`);
  }

  if (priority) {
    queryParams.push(priority.toUpperCase());
    conditions.push(`priority = $${queryParams.length}`);
  }

  if (department_id) {
    queryParams.push(parseInt(department_id, 10));
    conditions.push(`department_id = $${queryParams.length}`);
  }

  if (help_topic_id) {
    queryParams.push(parseInt(help_topic_id, 10));
    conditions.push(`help_topic_id = $${queryParams.length}`);
  }

  if (user_id) {
    queryParams.push(parseInt(user_id, 10));
    conditions.push(`user_id = $${queryParams.length}`);
  }

  if (email) {
    queryParams.push(email.trim().toLowerCase());
    conditions.push(`user_id IN (SELECT id FROM users WHERE LOWER(email) = $${queryParams.length})`);
  }

  if (assigned_to) {
    queryParams.push(parseInt(assigned_to, 10));
    conditions.push(`assigned_to = $${queryParams.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const queryText = `
    SELECT *
    FROM tickets
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  queryParams.push(parsedLimit, offset);

  const result = await db.query(queryText, queryParams);
  return result.rows;
};

/**
 * Get tickets by user email
 */
const getTicketsByEmail = async (email, options = {}) => {
  return await getTickets({ ...options, email });
};


const getTicketById = async (idOrNumber) => {
  const isNumeric = !isNaN(Number(idOrNumber));

  const queryText = `
    SELECT *
    FROM tickets
    WHERE ${isNumeric ? "id = $1" : "ticket_number = $1"}
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const result = await db.query(queryText, [value]);
  return result.rows[0] || null;
};

/**
 * Update ticket by ID or Ticket Number with any combination of fields
 */
const updateTicket = async (idOrNumber, updateData = {}) => {
  const isNumeric = !isNaN(Number(idOrNumber));
  const updates = [];
  const params = [];

  const {
    subject,
    description,
    priority,
    status,
    department_id,
    help_topic_id,
    user_id,
    mobile,
    room,
    pabx,
    assigned_to,
    total_pending_seconds,
  } = updateData;

  if (subject !== undefined) {
    params.push(subject.trim());
    updates.push(`subject = $${params.length}`);
  }

  if (description !== undefined) {
    params.push(description.trim());
    updates.push(`description = $${params.length}`);
  }

  if (priority !== undefined) {
    params.push(priority.toUpperCase());
    updates.push(`priority = $${params.length}`);
  }

  if (status !== undefined) {
    const formattedStatus = status.toUpperCase();
    params.push(formattedStatus);
    updates.push(`status = $${params.length}`);

    // If status is COMPLETE, update completed_at if not already set, otherwise reset if moving back to PENDING/IN_PROGRESS
    if (formattedStatus === "COMPLETE") {
      updates.push(`completed_at = COALESCE(completed_at, NOW())`);
    } else {
      updates.push(`completed_at = NULL`);
    }
  }

  if (department_id !== undefined) {
    params.push(department_id === null || department_id === "" ? null : parseInt(department_id, 10));
    updates.push(`department_id = $${params.length}`);
  }

  if (help_topic_id !== undefined) {
    params.push(help_topic_id === null || help_topic_id === "" ? null : parseInt(help_topic_id, 10));
    updates.push(`help_topic_id = $${params.length}`);
  }

  if (user_id !== undefined) {
    params.push(parseInt(user_id, 10));
    updates.push(`user_id = $${params.length}`);
  }

  if (mobile !== undefined) {
    params.push(mobile.trim());
    updates.push(`mobile = $${params.length}`);
  }

  if (room !== undefined) {
    params.push(room ? room.trim() : null);
    updates.push(`room = $${params.length}`);
  }

  if (pabx !== undefined) {
    params.push(pabx ? pabx.trim() : null);
    updates.push(`pabx = $${params.length}`);
  }

  if (assigned_to !== undefined) {
    params.push(assigned_to === null || assigned_to === "" ? null : parseInt(assigned_to, 10));
    updates.push(`assigned_to = $${params.length}`);
  }

  if (total_pending_seconds !== undefined) {
    params.push(parseInt(total_pending_seconds, 10));
    updates.push(`total_pending_seconds = $${params.length}`);
  }

  if (updates.length === 0) {
    return await getTicketById(idOrNumber);
  }

  const idParamIndex = params.length + 1;
  params.push(isNumeric ? parseInt(idOrNumber, 10) : idOrNumber);

  const queryText = `
    UPDATE tickets
    SET ${updates.join(", ")}
    WHERE ${isNumeric ? `id = $${idParamIndex}` : `ticket_number = $${idParamIndex}`}
    RETURNING *
  `;

  const result = await db.query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Update ticket status (PENDING, IN_PROGRESS, COMPLETE)
 */
const updateTicketStatus = async (idOrNumber, status) => {
  return await updateTicket(idOrNumber, { status });
};

/**
 * Assign ticket to agent/admin
 */
const assignTicket = async (idOrNumber, assignedToUserId) => {
  return await updateTicket(idOrNumber, { assigned_to: assignedToUserId });
};

/**
 * Delete ticket by ID or Ticket Number
 */
const deleteTicket = async (idOrNumber) => {
  const isNumeric = !isNaN(Number(idOrNumber));

  const queryText = `
    DELETE FROM tickets
    WHERE ${isNumeric ? "id = $1" : "ticket_number = $1"}
    RETURNING *
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const result = await db.query(queryText, [value]);
  return result.rows[0] || null;
};

module.exports = {
  generateTicketNumber,
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
