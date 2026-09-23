const db = require("../../config/db");
const crypto = require("crypto");
const {
  sendTicketAssignedNotification,
  sendTicketCompletedNotification,
  sendTicketCategoryMatchedNotification,
} = require("../../services/mail.service");
const { isStaffRole } = require("../../utils/role.validator");

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
  building_name = null,
}) => {
  const ticketNumber = generateTicketNumber();
  const formattedPriority = (priority || "MEDIUM").toUpperCase();
  const formattedStatus = (status || "PENDING").toUpperCase();

  const queryText = `
    INSERT INTO tickets (
      ticket_number, user_id, subject, description, priority,
      department_id, help_topic_id, mobile, room, pabx, status, assigned_to, building_name
    ) VALUES ($1, $2, $3, $4, $5::priority, $6, $7, $8, $9, $10, $11::ticket_status, $12, COALESCE($13, 'Administration Building'))
    RETURNING *
  `;

  const values = [
    ticketNumber,
    String(user_id).trim(),
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
    building_name ? building_name.trim() : null,
  ];

  const result = await db.query(queryText, values);
  const newTicket = result.rows[0];

  // Only the specific user(s) whose role_category_id matches the ticket's help_topic_id
  // will receive the email notification on ticket creation.
  if (newTicket.help_topic_id) {
    db.query(
      `SELECT u.id, u.name, u.email, u.role, u.role_category_id, ht.topic_title, ht.topic_code
       FROM users u
       LEFT JOIN help_topics ht ON u.role_category_id = ht.id
       WHERE u.role_category_id = $1`,
      [newTicket.help_topic_id]
    )
      .then((matchedRes) => {
        matchedRes.rows.forEach((matchedUser) => {
          if (matchedUser.email) {
            sendTicketCategoryMatchedNotification(newTicket, matchedUser);
          }
        });
      })
      .catch((err) => {
        console.error("Failed to query category-matched users for ticket notification:", err.message);
      });
  }

  return newTicket;
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
    queryParams.push(String(user_id).trim());
    conditions.push(`(user_id = $${queryParams.length} OR user_id IN (SELECT id::text FROM users WHERE firebase_uid = $${queryParams.length}))`);
  }

  if (email) {
    queryParams.push(email.trim().toLowerCase());
    conditions.push(`(user_id IN (SELECT id::text FROM users WHERE LOWER(email) = $${queryParams.length}) OR user_id IN (SELECT firebase_uid FROM users WHERE LOWER(email) = $${queryParams.length}))`);
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
  const ticket = result.rows[0] || null;

  if (!ticket) return null;

  // Query and attach associated feedback
  const feedbackResult = await db.query(
    `SELECT 
       tf.id,
       tf.ticket_id,
       tf.user_id,
       tf.comment,
       tf.created_at,
       u.name AS user_name,
       u.email AS user_email,
       u.role AS user_role
     FROM ticket_feedback tf
     JOIN users u ON tf.user_id = u.id
     WHERE tf.ticket_id = $1
     ORDER BY tf.created_at DESC`,
    [ticket.id]
  );

  ticket.feedback = feedbackResult.rows[0] || null;
  ticket.feedbacks = feedbackResult.rows;

  return ticket;
};

const updateTicketStatus = async (idOrNumber, status) => {
  const isNumeric = !isNaN(Number(idOrNumber));
  const rawStatus = (status || "").toUpperCase();
  const formattedStatus = rawStatus === "COMPLETED" ? "COMPLETE" : rawStatus;

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
  const updatedTicket = result.rows[0] || null;

  // Step 4: When a ticket's status is updated to 'COMPLETED', fetch creator and send confirmation email
  if ((formattedStatus === "COMPLETE" || rawStatus === "COMPLETED") && updatedTicket) {
    db.query(`SELECT id, name, email FROM users WHERE firebase_uid = $1 OR id::text = $1`, [updatedTicket.user_id])
      .then((creatorRes) => {
        if (creatorRes.rows[0]?.email) {
          sendTicketCompletedNotification(updatedTicket, creatorRes.rows[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to query creator for completion email:", err.message);
      });
  }

  return updatedTicket;
};

/**
 * Dynamic full/partial ticket updates
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
    "building_name",
  ];

  const setClauses = [];
  const values = [];

  for (const key of allowedKeys) {
    if (updateFields[key] !== undefined) {
      const val = updateFields[key];

      if (key === "priority" && val) {
        values.push(String(val).toUpperCase());
        setClauses.push(`${key} = $${values.length}::priority`);
      } else if (key === "status" && val) {
        const rawStatus = String(val).toUpperCase();
        const formattedStatus = rawStatus === "COMPLETED" ? "COMPLETE" : rawStatus;
        values.push(formattedStatus);
        setClauses.push(`${key} = $${values.length}::ticket_status`);

        // Update completed_at safely with parameterized conditions
        setClauses.push(
          `completed_at = CASE 
            WHEN $${values.length}::ticket_status = 'COMPLETE'::ticket_status THEN NOW() 
            WHEN $${values.length}::ticket_status IN ('PENDING'::ticket_status, 'IN_PROGRESS'::ticket_status) THEN NULL 
            ELSE completed_at 
          END`
        );
      } else if (key === "assigned_to" || key === "department_id" || key === "help_topic_id") {
        values.push(val ? parseInt(val, 10) : null);
        // Explicit ::integer cast prevents PostgreSQL null-parameter type resolution errors
        setClauses.push(`${key} = $${values.length}::integer`);
      } else {
        values.push(val !== null ? String(val).trim() : null);
        setClauses.push(`${key} = $${values.length}`);
      }
    }
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
  const updatedTicket = result.rows[0] || null;

  if (updatedTicket) {
    // Check for status completion
    const rawStatus = updateFields.status ? String(updateFields.status).toUpperCase() : "";
    if (rawStatus === "COMPLETE" || rawStatus === "COMPLETED") {
      db.query(`SELECT id, name, email FROM users WHERE firebase_uid = $1 OR id::text = $1`, [updatedTicket.user_id])
        .then((creatorRes) => {
          if (creatorRes.rows[0]?.email) {
            sendTicketCompletedNotification(updatedTicket, creatorRes.rows[0]);
          }
        })
        .catch((err) => {
          console.error("Failed to query creator for completion email:", err.message);
        });
    }

    // Check for assignment notification
    if (updateFields.assigned_to) {
      const assignedId = parseInt(updateFields.assigned_to, 10);
      db.query(`SELECT id, name, email, role FROM users WHERE id = $1`, [assignedId])
        .then((userRes) => {
          const assignedUser = userRes.rows[0];
          if (assignedUser?.email && isStaffRole(assignedUser.role)) {
            sendTicketAssignedNotification(updatedTicket, assignedUser);
          }
        })
        .catch((err) => {
          console.error("Failed to query assigned user for assignment email:", err.message);
        });
    }
  }

  return updatedTicket;
};

const assignTicket = async (idOrNumber, assignedToUserId, assignmentNote = null) => {
  const isNumeric = !isNaN(Number(idOrNumber));

  const queryText = `
    UPDATE tickets
    SET 
      assigned_to = $1::integer,
      assignment_note = $2
    WHERE ${isNumeric ? "id = $3" : "ticket_number = $3"}
    RETURNING *
  `;

  const value = isNumeric ? parseInt(idOrNumber, 10) : idOrNumber;
  const parsedUserId = assignedToUserId ? parseInt(assignedToUserId, 10) : null;
  const result = await db.query(queryText, [parsedUserId, assignmentNote, value]);
  const updatedTicket = result.rows[0] || null;

  if (updatedTicket && parsedUserId) {
    db.query(`SELECT id, name, email, role FROM users WHERE id = $1`, [parsedUserId])
      .then((userRes) => {
        const assignedUser = userRes.rows[0];
        if (assignedUser?.email && isStaffRole(assignedUser.role)) {
          sendTicketAssignedNotification(updatedTicket, assignedUser);
        }
      })
      .catch((err) => {
        console.error("Failed to query assigned user for assignment email:", err.message);
      });
  }

  return updatedTicket;
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
  updateTicketStatus,
  assignTicket,
  deleteTicket,
};