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
  
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  
  server.close(() => {
    
  });
});