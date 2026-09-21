const db = require("../../config/db");
const { emitTicketFeedback } = require("../../socket/ticket_socket.service");
const { isStaffRole } = require("../../utils/role.validator");
const { sendTicketFeedbackNotification } = require("../../services/mail.service");

/**
 * Service to manage ticket feedback and notification dispatching.
 */

/**
 * Create or update feedback for a completed ticket.
 */
const createFeedback = async ({ ticket_id, user_id, comment }) => {
  const parsedTicketId = parseInt(ticket_id, 10);
  const parsedUserId = parseInt(user_id, 10);

  // 1. Verify ticket exists
  const ticketResult = await db.query(
    `SELECT id, ticket_number, user_id, assigned_to, subject, status
     FROM tickets
     WHERE id = $1`,
    [parsedTicketId]
  );

  if (ticketResult.rows.length === 0) {
    return { error: "TICKET_NOT_FOUND" };
  }

  const ticket = ticketResult.rows[0];

  // 2. Validate ticket completion status
  const normalizedStatus = (ticket.status || "").toUpperCase();
  const isCompleted = normalizedStatus === "COMPLETE" || normalizedStatus === "COMPLETED";

  if (!isCompleted) {
    return {
      error: "TICKET_NOT_COMPLETED",
      message: "Feedback can only be submitted after ticket completion.",
    };
  }

  // 3. Verify user exists
  const userResult = await db.query(
    `SELECT id, name, email, role
     FROM users
     WHERE id = $1`,
    [parsedUserId]
  );

  if (userResult.rows.length === 0) {
    return { error: "USER_NOT_FOUND" };
  }

  const user = userResult.rows[0];

  // 4. Verify user authorization (ticket creator or staff role)
  if (ticket.user_id && parsedUserId !== ticket.user_id && !isStaffRole(user.role)) {
    return {
      error: "UNAUTHORIZED_FEEDBACK",
      message: "Only the user who created the ticket can submit feedback for it.",
    };
  }

  // 5. Check if feedback already exists for this ticket by this user
  const existingFeedbackResult = await db.query(
    `SELECT id FROM ticket_feedback WHERE ticket_id = $1 AND user_id = $2`,
    [parsedTicketId, parsedUserId]
  );

  let feedbackRecord;
  let isUpdated = false;

  if (existingFeedbackResult.rows.length > 0) {
    // Upsert / update existing feedback
    const existingId = existingFeedbackResult.rows[0].id;
    const updateResult = await db.query(
      `UPDATE ticket_feedback
       SET comment = $1, created_at = NOW()
       WHERE id = $2
       RETURNING id, ticket_id, user_id, comment, created_at`,
      [comment.trim(), existingId]
    );
    feedbackRecord = updateResult.rows[0];
    isUpdated = true;
  } else {
    // Insert new feedback
    const insertResult = await db.query(
      `INSERT INTO ticket_feedback (ticket_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING id, ticket_id, user_id, comment, created_at`,
      [parsedTicketId, parsedUserId, comment.trim()]
    );
    feedbackRecord = insertResult.rows[0];
    isUpdated = false;
  }

  // 6. Form complete feedback object with sender & ticket metadata
  const fullFeedback = {
    ...feedbackRecord,
    user_name: user.name,
    user_email: user.email,
    user_role: user.role,
    ticket_number: ticket.ticket_number,
    ticket_subject: ticket.subject,
    ticket_status: ticket.status,
  };

  // 7. Broadcast real-time event via Socket.IO
  emitTicketFeedback(fullFeedback, ticket);

  // 8. Send email notification to assigned staff (non-blocking)
  if (ticket.assigned_to) {
    db.query(`SELECT id, name, email FROM users WHERE id = $1`, [ticket.assigned_to])
      .then((staffRes) => {
        if (staffRes.rows[0]?.email) {
          sendTicketFeedbackNotification(ticket, staffRes.rows[0], fullFeedback);
        }
      })
      .catch((err) => {
        console.error("Feedback notification email failed:", err.message);
      });
  }

  return {
    feedback: fullFeedback,
    ticket,
    isUpdated,
  };
};

/**
 * Fetch feedback list for a specific ticket.
 */
const getFeedbackByTicketId = async (ticketId) => {
  const parsedTicketId = parseInt(ticketId, 10);

  const result = await db.query(
    `SELECT 
       tf.id,
       tf.ticket_id,
       tf.user_id,
       tf.comment,
       tf.created_at,
       u.name AS user_name,
       u.email AS user_email,
       u.role AS user_role,
       t.ticket_number,
       t.subject AS ticket_subject,
       t.status AS ticket_status
     FROM ticket_feedback tf
     JOIN users u ON tf.user_id = u.id
     JOIN tickets t ON tf.ticket_id = t.id
     WHERE tf.ticket_id = $1
     ORDER BY tf.created_at DESC`,
    [parsedTicketId]
  );

  return result.rows;
};

/**
 * Fetch a single feedback by ID.
 */
const getFeedbackById = async (feedbackId) => {
  const parsedFeedbackId = parseInt(feedbackId, 10);

  const result = await db.query(
    `SELECT 
       tf.id,
       tf.ticket_id,
       tf.user_id,
       tf.comment,
       tf.created_at,
       u.name AS user_name,
       u.email AS user_email,
       u.role AS user_role,
       t.ticket_number,
       t.subject AS ticket_subject,
       t.status AS ticket_status
     FROM ticket_feedback tf
     JOIN users u ON tf.user_id = u.id
     JOIN tickets t ON tf.ticket_id = t.id
     WHERE tf.id = $1`,
    [parsedFeedbackId]
  );

  return result.rows[0] || null;
};

/**
 * Fetch all feedbacks with optional filters and pagination.
 */
const getAllFeedback = async ({ ticket_id, user_id, page = 1, limit = 20 }) => {
  const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;
  const conditions = [];
  const queryParams = [];

  if (ticket_id) {
    queryParams.push(parseInt(ticket_id, 10));
    conditions.push(`tf.ticket_id = $${queryParams.length}`);
  }

  if (user_id) {
    queryParams.push(parseInt(user_id, 10));
    conditions.push(`tf.user_id = $${queryParams.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM ticket_feedback tf ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0]?.total || "0", 10);

  const queryText = `
    SELECT 
      tf.id,
      tf.ticket_id,
      tf.user_id,
      tf.comment,
      tf.created_at,
      u.name AS user_name,
      u.email AS user_email,
      u.role AS user_role,
      t.ticket_number,
      t.subject AS ticket_subject,
      t.status AS ticket_status
    FROM ticket_feedback tf
    JOIN users u ON tf.user_id = u.id
    JOIN tickets t ON tf.ticket_id = t.id
    ${whereClause}
    ORDER BY tf.created_at DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  queryParams.push(parsedLimit, offset);

  const result = await db.query(queryText, queryParams);

  return {
    total,
    page: parsedPage,
    limit: parsedLimit,
    data: result.rows,
  };
};

/**
 * Update feedback comment.
 */
const updateFeedback = async (feedbackId, { comment, user_id }) => {
  const parsedFeedbackId = parseInt(feedbackId, 10);

  const existing = await getFeedbackById(parsedFeedbackId);
  if (!existing) {
    return { error: "FEEDBACK_NOT_FOUND" };
  }

  // Optional ownership verification if user_id passed
  if (user_id) {
    const parsedUserId = parseInt(user_id, 10);
    const userRes = await db.query(`SELECT id, role FROM users WHERE id = $1`, [parsedUserId]);
    const user = userRes.rows[0];
    if (user && existing.user_id !== parsedUserId && !isStaffRole(user.role)) {
      return {
        error: "UNAUTHORIZED",
        message: "You can only edit your own feedback.",
      };
    }
  }

  const result = await db.query(
    `UPDATE ticket_feedback
     SET comment = $1, created_at = NOW()
     WHERE id = $2
     RETURNING id, ticket_id, user_id, comment, created_at`,
    [comment.trim(), parsedFeedbackId]
  );

  const updatedFeedback = result.rows[0];
  return {
    feedback: {
      ...existing,
      ...updatedFeedback,
    },
  };
};

/**
 * Delete feedback by ID.
 */
const deleteFeedback = async (feedbackId) => {
  const parsedFeedbackId = parseInt(feedbackId, 10);

  const result = await db.query(
    `DELETE FROM ticket_feedback
     WHERE id = $1
     RETURNING *`,
    [parsedFeedbackId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createFeedback,
  getFeedbackByTicketId,
  getFeedbackById,
  getAllFeedback,
  updateFeedback,
  deleteFeedback,
};
