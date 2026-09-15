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
    ) VALUES ($1, $2, $3, $4, $5::priority, $6, $7, $8, $9, $10, $11::ticket_status, $12)
    RETURNING *
  `;

  const values = [
    ticketNumber,
    parseInt(user_id, 10),
    subject ? subject.trim() : "",
    description ? description.trim() : "",
    formattedPriority,
    department_id ? parseInt(department_id, 10) : null,
    help_topic_id ? parseInt(help_topic_id, 10) : null,
    mobile ? mobile.trim() : "",
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
    conditions.push(`status = $${queryParams.length}::ticket_status`);
  }

  if (priority) {
    queryParams.push(priority.toUpperCase());
    conditions.push(`priority = $${queryParams.length}::priority`);
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
 * Update ticket priority with explicit ::priority cast for PostgreSQL
 */
const updateTicketPriority = async (idOrNumber, priority) => {
  const isNumeric = !isNaN(Number(idOrNumber));
  const formattedPriority = priority.toUpperCase();

  const queryText = `
    UPDATE tickets
    SET priority = $1::priority
    WHERE ${isNumeric ? "id = $2" : "ticket_number = $2"}
    RETURNING *
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const result = await db.query(queryText, [formattedPriority, value]);
  return result.rows[0] || null;
};

/**
 * Update ticket status with explicit ::ticket_status cast for PostgreSQL
 */
const updateTicketStatus = async (idOrNumber, status) => {
  const isNumeric = !isNaN(Number(idOrNumber));
  const formattedStatus = status.toUpperCase();

  const queryText = `
    UPDATE tickets
    SET 
      status = $1::ticket_status,
      completed_at = CASE 
        WHEN $1 = 'COMPLETE' THEN NOW() 
        WHEN $1 IN ('PENDING', 'IN_PROGRESS', 'HOLD') THEN NULL 
        ELSE completed_at 
      END
    WHERE ${isNumeric ? "id = $2" : "ticket_number = $2"}
    RETURNING *
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const result = await db.query(queryText, [formattedStatus, value]);
  return result.rows[0] || null;
};

/**
 * Dynamic full/partial ticket updates with enum casts
 */
const updateTicket = async (idOrNumber, updateFields) => {
  const isNumeric = !isNaN(Number(idOrNumber));
  const allowedKeys = [
    "subject",
    "description",
    "priority",
    "status",
    "assigned_to",
    "department_id",
    "help_topic_id",
    "mobile",
    "room",
    "pabx",
  ];

  const setClauses = [];
  const values = [];

  for (const key of allowedKeys) {
    if (updateFields[key] !== undefined) {
      let val = updateFields[key];

      if (key === "priority" && val) {
        values.push(String(val).toUpperCase());
        setClauses.push(`${key} = $${values.length}::priority`);
      } else if (key === "status" && val) {
        values.push(String(val).toUpperCase());
        setClauses.push(`${key} = $${values.length}::ticket_status`);
      } else if (key === "assigned_to" || key === "department_id" || key === "help_topic_id") {
        values.push(val ? parseInt(val, 10) : null);
        setClauses.push(`${key} = $${values.length}`);
      } else {
        values.push(val);
        setClauses.push(`${key} = $${values.length}`);
      }
    }
  }

  if (updateFields.status) {
    setClauses.push(
      `completed_at = CASE WHEN '${String(updateFields.status).toUpperCase()}' = 'COMPLETE' THEN NOW() ELSE completed_at END`
    );
  }

  if (setClauses.length === 0) return await getTicketById(idOrNumber);

  values.push(isNumeric ? parseInt(idOrNumber, 10) : idOrNumber);
  const whereIdentifier = isNumeric ? `id = $${values.length}` : `ticket_number = $${values.length}`;

  const queryText = `
    UPDATE tickets
    SET ${setClauses.join(", ")}
    WHERE ${whereIdentifier}
    RETURNING *
  `;

  const result = await db.query(queryText, values);
  return result.rows[0] || null;
};

const assignTicket = async (idOrNumber, assignedToUserId) => {
  const isNumeric = !isNaN(Number(idOrNumber));

  const queryText = `
    UPDATE tickets
    SET assigned_to = $1
    WHERE ${isNumeric ? "id = $2" : "ticket_number = $2"}
    RETURNING *
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const result = await db.query(queryText, [assignedToUserId, value]);
  return result.rows[0] || null;
};

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
  updateTicketPriority,
  updateTicketStatus,
  assignTicket,
  deleteTicket,
};