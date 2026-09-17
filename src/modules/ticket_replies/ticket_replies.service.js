const db = require("../../config/db");
const { emitTicketReply } = require("../../socket/ticket_socket.service");
const { isStaffRole } = require("../../utils/role.validator");
const {
  sendAgentResponseNotification,
  sendUserReplyNotification,
} = require("../../services/mail.service");

/**
 * Service to handle ticket replies and real-time event dispatching.
 */

const createReply = async ({ ticket_id, user_id, message }) => {
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

  // 2. Verify user exists
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

  // 3. Insert reply into database
  const insertResult = await db.query(
    `INSERT INTO ticket_replies (ticket_id, user_id, message)
     VALUES ($1, $2, $3)
     RETURNING id, ticket_id, user_id, message, created_at`,
    [parsedTicketId, parsedUserId, message.trim()]
  );

  const newReply = insertResult.rows[0];

  // 4. Form complete reply object with sender metadata
  const fullReply = {
    ...newReply,
    user_name: user.name,
    user_email: user.email,
    user_role: user.role,
  };

  // 5. Broadcast to Socket.IO clients in real time
  emitTicketReply(fullReply, ticket);

  // 6. Send email notification based on sender's role
  if (isStaffRole(user.role) && ticket.user_id) {
    // Staff replied → notify the ticket creator
    db.query(`SELECT id, name, email FROM users WHERE id = $1`, [ticket.user_id])
      .then((ownerRes) => {
        if (ownerRes.rows[0]?.email) {
          sendAgentResponseNotification(ticket, ownerRes.rows[0], fullReply);
        }
      })
      .catch((err) => console.error("Reply email (staff→user) failed:", err.message));
  } else if (ticket.assigned_to) {
    // User replied → notify the assigned agent/admin
    db.query(`SELECT id, name, email FROM users WHERE id = $1`, [ticket.assigned_to])
      .then((staffRes) => {
        if (staffRes.rows[0]?.email) {
          sendUserReplyNotification(ticket, staffRes.rows[0], fullReply);
        }
      })
      .catch((err) => console.error("Reply email (user→staff) failed:", err.message));
  }

  return { reply: fullReply, ticket };
};

const getRepliesByTicketId = async (ticketId) => {
  const parsedTicketId = parseInt(ticketId, 10);

  const result = await db.query(
    `SELECT 
       tr.id,
       tr.ticket_id,
       tr.user_id,
       tr.message,
       tr.created_at,
       u.name AS user_name,
       u.email AS user_email,
       u.role AS user_role
     FROM ticket_replies tr
     JOIN users u ON tr.user_id = u.id
     WHERE tr.ticket_id = $1
     ORDER BY tr.created_at ASC`,
    [parsedTicketId]
  );

  return result.rows;
};

const getReplyById = async (replyId) => {
  const parsedReplyId = parseInt(replyId, 10);

  const result = await db.query(
    `SELECT 
       tr.id,
       tr.ticket_id,
       tr.user_id,
       tr.message,
       tr.created_at,
       u.name AS user_name,
       u.email AS user_email,
       u.role AS user_role
     FROM ticket_replies tr
     JOIN users u ON tr.user_id = u.id
     WHERE tr.id = $1`,
    [parsedReplyId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createReply,
  getRepliesByTicketId,
  getReplyById,
};
