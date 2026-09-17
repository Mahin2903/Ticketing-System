const { Server } = require("socket.io");

let io = null;

/**
 * Initialize Socket.IO server attached to the HTTP server.
 * Configures CORS, connection lifecycle, and room subscriptions.
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Auto-join rooms from handshake auth or query params (if provided)
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    const role = socket.handshake.auth?.role || socket.handshake.query?.role;
    const ticketId = socket.handshake.auth?.ticketId || socket.handshake.query?.ticketId;

    if (userId) {
      socket.join(`user_${userId}`);
    }

    if (role) {
      socket.join(`role_${role}`);
    }

    if (ticketId) {
      socket.join(`ticket_${ticketId}`);
    }

    // Explicit room management events
    socket.on("join_ticket", (id) => {
      if (id) {
        socket.join(`ticket_${id}`);
      }
    });

    socket.on("leave_ticket", (id) => {
      if (id) {
        socket.leave(`ticket_${id}`);
      }
    });

    socket.on("join_user", (id) => {
      if (id) {
        socket.join(`user_${id}`);
      }
    });

    socket.on("leave_user", (id) => {
      if (id) {
        socket.leave(`user_${id}`);
      }
    });

    socket.on("join_role", (userRole) => {
      if (userRole) {
        socket.join(`role_${userRole}`);
      }
    });

    socket.on("leave_role", (userRole) => {
      if (userRole) {
        socket.leave(`role_${userRole}`);
      }
    });

    /**
     * Step 3: WebSocket Agent Response Notification
     * Verifies that sender role is AGENT, ADMIN, or SUPER_ADMIN.
     * Dispatches real-time broadcast and email notification to ticket creator.
     */
    socket.on("ticket:response", async (data, callback) => {
      try {
        const db = require("../config/db");
        const { emitTicketReply } = require("./ticket_socket.service");
        const { sendAgentResponseNotification, sendUserReplyNotification } = require("../services/mail.service");
        const { isStaffRole } = require("../utils/role.validator");

        const ticketId = data?.ticket_id || data?.ticketId;
        const userId = data?.user_id || data?.userId;
        const message = data?.message;

        if (!ticketId || !userId || !message || !String(message).trim()) {
          const errorMsg = "ticket_id, user_id, and message are required.";
          socket.emit("ticket:response_error", { message: errorMsg });
          if (typeof callback === "function") callback({ success: false, message: errorMsg });
          return;
        }

        // Fetch sender
        const userRes = await db.query(
          "SELECT id, name, email, role FROM users WHERE id = $1",
          [parseInt(userId, 10)]
        );
        const sender = userRes.rows[0];

        if (!sender) {
          const errorMsg = `User with ID ${userId} not found.`;
          socket.emit("ticket:response_error", { message: errorMsg });
          if (typeof callback === "function") callback({ success: false, message: errorMsg });
          return;
        }

        // Fetch ticket and associated creator
        const ticketRes = await db.query(
          `SELECT t.*, u.name AS creator_name, u.email AS creator_email
           FROM tickets t
           JOIN users u ON t.user_id = u.id
           WHERE t.id = $1`,
          [parseInt(ticketId, 10)]
        );
        const ticket = ticketRes.rows[0];

        if (!ticket) {
          const errorMsg = `Ticket with ID ${ticketId} not found.`;
          socket.emit("ticket:response_error", { message: errorMsg });
          if (typeof callback === "function") callback({ success: false, message: errorMsg });
          return;
        }

        // Insert reply into ticket_replies
        const insertRes = await db.query(
          `INSERT INTO ticket_replies (ticket_id, user_id, message)
           VALUES ($1, $2, $3)
           RETURNING id, ticket_id, user_id, message, created_at`,
          [parseInt(ticketId, 10), parseInt(userId, 10), String(message).trim()]
        );

        const reply = {
          ...insertRes.rows[0],
          user_name: sender.name,
          user_email: sender.email,
          user_role: sender.role,
        };

        // Broadcast real-time socket events
        emitTicketReply(reply, ticket);

        // Send email notification based on sender's role
        if (isStaffRole(sender.role) && ticket.creator_email) {
          // Staff replied → notify the ticket creator
          sendAgentResponseNotification(
            ticket,
            { name: ticket.creator_name, email: ticket.creator_email },
            reply
          );
        } else if (!isStaffRole(sender.role) && ticket.assigned_to) {
          // User replied → notify the assigned agent/admin
          const staffRes = await db.query(
            "SELECT id, name, email FROM users WHERE id = $1",
            [ticket.assigned_to]
          );
          if (staffRes.rows[0]?.email) {
            sendUserReplyNotification(ticket, staffRes.rows[0], reply);
          }
        }

        socket.emit("ticket:response_success", { success: true, data: reply });
        if (typeof callback === "function") callback({ success: true, data: reply });
      } catch (err) {
        console.error("Error in ticket:response WebSocket handler:", err);
        socket.emit("ticket:response_error", { message: "Internal server error handling response" });
        if (typeof callback === "function") callback({ success: false, message: err.message });
      }
    });

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
};

/**
 * Returns the initialized Socket.IO instance (or null if not yet initialized).
 */
const getIO = () => {
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
