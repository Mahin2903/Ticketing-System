const { getIO } = require("./index");
const { isStaffRole } = require("../utils/role.validator");

/**
 * Broadcast ticket reply and notify the appropriate recipient(s).
 * - Broadcasts to the ticket room (`ticket_${ticketId}`).
 * - If sent by agent/admin: pushes direct notification to the ticket creator (`user_${userId}`).
 * - If sent by ticket creator: pushes notification to assigned agent and staff.
 *
 * @param {Object} reply - Joined reply object with user info.
 * @param {Object} ticket - Ticket object containing id, ticket_number, user_id, assigned_to, subject, status.
 */
const emitTicketReply = (reply, ticket) => {
  const io = getIO();
  if (!io) {
    console.warn("Socket.IO not initialized. Skipping real-time socket emit.");
    return;
  }

  const payload = {
    reply,
    ticket: {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      status: ticket.status,
      user_id: ticket.user_id,
      assigned_to: ticket.assigned_to,
    },
  };

  // 1. Broadcast to the active ticket room
  io.to(`ticket_${ticket.id}`).emit("ticket:reply", payload);
  io.to(`ticket_${ticket.id}`).emit("new_ticket_reply", payload);

  const isStaff = isStaffRole(reply.user_role);

  if (isStaff) {
    // 2. Notify the user who created the ticket
    const notification = {
      type: "STAFF_REPLY",
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      reply: {
        id: reply.id,
        sender_id: reply.user_id,
        sender_name: reply.user_name,
        sender_role: reply.user_role,
        message: reply.message,
        created_at: reply.created_at,
      },
    };

    io.to(`user_${ticket.user_id}`).emit("ticket:notification", notification);
    io.to(`user_${ticket.user_id}`).emit("new_ticket_reply", payload);
  } else {
    // 3. User responded: notify assigned agent (if assigned) and staff rooms
    const notification = {
      type: "USER_REPLY",
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      reply: {
        id: reply.id,
        sender_id: reply.user_id,
        sender_name: reply.user_name,
        sender_role: reply.user_role,
        message: reply.message,
        created_at: reply.created_at,
      },
    };

    if (ticket.assigned_to) {
      io.to(`user_${ticket.assigned_to}`).emit("ticket:notification", notification);
      io.to(`user_${ticket.assigned_to}`).emit("new_ticket_reply", payload);
    }

    io.to("role_admin").emit("ticket:staff_notification", notification);
    io.to("role_agent").emit("ticket:staff_notification", notification);
  }
};

/**
 * Broadcast ticket feedback and notify the appropriate recipient(s).
 * - Broadcasts to the ticket room (`ticket_${ticketId}`).
 * - Notifies assigned agent and staff rooms (`role_admin`, `role_agent`).
 *
 * @param {Object} feedback - Joined feedback object with user info.
 * @param {Object} ticket - Ticket object containing id, ticket_number, user_id, assigned_to, subject, status.
 */
const emitTicketFeedback = (feedback, ticket) => {
  const io = getIO();
  if (!io) {
    console.warn("Socket.IO not initialized. Skipping real-time socket emit for feedback.");
    return;
  }

  const payload = {
    feedback,
    ticket: {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      status: ticket.status,
      user_id: ticket.user_id,
      assigned_to: ticket.assigned_to,
    },
  };

  // 1. Broadcast to the active ticket room
  io.to(`ticket_${ticket.id}`).emit("ticket:feedback", payload);
  io.to(`ticket_${ticket.id}`).emit("new_ticket_feedback", payload);

  const notification = {
    type: "TICKET_FEEDBACK",
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
    subject: ticket.subject,
    feedback: {
      id: feedback.id,
      user_id: feedback.user_id,
      user_name: feedback.user_name,
      comment: feedback.comment,
      created_at: feedback.created_at,
    },
  };

  // 2. Notify assigned staff member if ticket is assigned
  if (ticket.assigned_to) {
    io.to(`user_${ticket.assigned_to}`).emit("ticket:notification", notification);
    io.to(`user_${ticket.assigned_to}`).emit("new_ticket_feedback", payload);
  }

  // 3. Notify admin and agent staff rooms
  io.to("role_admin").emit("ticket:staff_notification", notification);
  io.to("role_agent").emit("ticket:staff_notification", notification);
};

module.exports = {
  emitTicketReply,
  emitTicketFeedback,
};

