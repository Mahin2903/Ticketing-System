const express = require("express");
const cors = require("cors");

const ticketsRoutes = require("./modules/tickets/tickets.routes");
const departmentsRoutes = require("./modules/departments/departments.route");
const helpTopicsRoutes = require("./modules/help_topics/help_topics.routes");
const usersRoutes = require("./modules/users/users.routes");
const ticketRepliesRoutes = require("./modules/ticket_replies/ticket_replies.routes");
const ticketFeedbackRoutes = require("./modules/ticket_feedback/ticket_feedback.routes");
const mailRoutes = require("./modules/mail/mail.routes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Support Ticket API Server is running",
    documentation: {
      tickets: "/api/tickets",
      ticket_replies: "/api/ticket-replies",
      ticket_feedback: "/api/ticket-feedback",
      mail: "/api/mail",
      departments: "/api/departments",
      help_topics: "/api/help-topics",
      users: "/api/users",
    },
  });
});

// API Routes
app.use("/api/tickets", ticketsRoutes);
app.use("/api/ticket-replies", ticketRepliesRoutes);
app.use("/api/ticket-feedback", ticketFeedbackRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/help-topics", helpTopicsRoutes);
app.use("/api/users", usersRoutes);

// 404 Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  // PostgreSQL unique constraint violation (e.g. duplicate email)
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A record with this unique field already exists.",
      detail: err.detail,
    });
  }

  // PostgreSQL invalid input syntax (e.g. invalid integer ID)
  if (err.code === "22P02") {
    return res.status(400).json({
      success: false,
      message: "Invalid input syntax for parameter.",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
