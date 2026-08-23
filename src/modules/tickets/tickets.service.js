const db = require("../../config/db");

/**
 * Generate a clean, unique ticket number formatted as TCK-YYYYMMDD-XXXX
 */
const generateTicketNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TCK-${dateStr}-${randomSuffix}`;
};

/**
 * Insert a new ticket into DB
 */
const createTicket = async ({
  user_id,
  subject,
  description,
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
      mobile, room, pabx, status, assigned_to
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    ticketNumber,
    parseInt(user_id, 10),
    subject.trim(),
    description.trim(),
    formattedPriority,
    mobile.trim(),
    room ? room.trim() : null,
    pabx ? pabx.trim() : null,
    formattedStatus,
    assigned_to ? parseInt(assigned_to, 10) : null,
  ];

  const result = await db.query(queryText, values);
  return result.rows[0];
};

/**
 * Retrieve tickets with optional filtering and pagination
 */
const getTickets = async ({
  status,
  priority,
  user_id,
  assigned_to,
  page = 1,
  limit = 20,
}) => {
  const offset = (page - 1) * limit;
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

  if (user_id) {
    queryParams.push(parseInt(user_id, 10));
    conditions.push(`user_id = $${queryParams.length}`);
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

  queryParams.push(limit, offset);

  const result = await db.query(queryText, queryParams);
  return result.rows;
};

/**
 * Get single ticket by ID (integer) or Ticket Number (string)
 */
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
 * Update ticket status (PENDING, IN_PROGRESS, COMPLETE)
 */
const updateTicketStatus = async (idOrNumber, status) => {
  const isNumeric = !isNaN(Number(idOrNumber));
  const formattedStatus = status.toUpperCase();

  const queryText = `
    UPDATE tickets
    SET 
      status = $1,
      completed_at = CASE WHEN $1 = 'COMPLETE' THEN NOW() ELSE completed_at END
    WHERE ${isNumeric ? "id = $2" : "ticket_number = $2"}
    RETURNING *
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const result = await db.query(queryText, [formattedStatus, value]);
  return result.rows[0] || null;
};

/**
 * Assign ticket to agent/admin
 */
const assignTicket = async (idOrNumber, assignedToUserId) => {
  const isNumeric = !isNaN(Number(idOrNumber));

  const queryText = `
    UPDATE tickets
    SET assigned_to = $1
    WHERE ${isNumeric ? "id = $2" : "ticket_number = $2"}
    RETURNING *
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const result = await db.query(queryText, [parseInt(assignedToUserId, 10), value]);
  return result.rows[0] || null;
};

module.exports = {
  generateTicketNumber,
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
};
