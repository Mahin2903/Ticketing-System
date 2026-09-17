require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/socket");

const PORT = process.env.PORT || 8000;

// Create HTTP server wrapping express app
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO server initialized and ready`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});