const express = require("express");
const dotenv = require("dotenv");
const { createServer } = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();

const app = express();
app.use(express.json()); // For parsing JSON requests

// Routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// ---------------------- Deployment ----------------------
const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running successfully");
  });
}
// ---------------------- Deployment ----------------------

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
const server = createServer(app);
server.listen(PORT, console.log(`Server running on port ${PORT}`));

// Socket.io integration
const io = new Server(server, {
  pingTimeout: 60000, // 1-minute timeout
  cors: {
    origin: "http://localhost:3000", // Update with frontend URL
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // User setup
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log(`${userData.name} joined the room`);
    socket.emit("connected");
  });

  // Joining a specific chat
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`User joined chat: ${room}`);
  });

  // Typing indicators
  socket.on("typing", (room) => {
    socket.in(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing");
  });

  // Handling new messages
  socket.on("new message", (newMessage) => {
    const chat = newMessage.chat;

    if (!chat.users) return console.error("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id === newMessage.sender._id) return; // Skip sender

      socket.in(user._id).emit("message received", newMessage);
    });
  });

  // Disconnecting the user
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});
