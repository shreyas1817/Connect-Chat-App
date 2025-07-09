const express = require("express");
const dotenv = require("dotenv");
const { createServer } = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
connectDB();

const app = express();
app.use(express.json()); // For parsing JSON requests

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------- ROUTES ----------------------
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/upload", uploadRoutes);

// ---------------------- DEPLOYMENT ----------------------
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

// ---------------------- ERROR HANDLERS ----------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------- START SERVER ----------------------
const PORT = process.env.PORT || 5000;
const server = createServer(app);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ---------------------- SOCKET.IO SETUP ----------------------
const io = new Server(server, {
  pingTimeout: 60000, // 1-minute timeout
  cors: {
    origin: process.env.SOCKET_ORIGIN || "http://localhost:3000", // Update with frontend URL
    methods: ["GET", "POST"],
    credentials: true, 
  },
});

// ---------------------- SOCKET AUTHENTICATION ----------------------
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log("Socket authentication failed: No token provided");
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attach user data to socket
    console.log(`Socket authenticated for user: ${decoded._id}`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log(`Socket authentication failed: JWT token expired for user`);
      return next(new Error('jwt expired'));
    } else if (error.name === 'JsonWebTokenError') {
      console.log(`Socket authentication failed: Invalid JWT token`);
      return next(new Error('Invalid token'));
    } else {
      console.log(`Socket authentication failed: ${error.message}`);
      return next(new Error(`Authentication error: ${error.message}`));
    }
  }
});

// ---------------------- SOCKET CONNECTION ----------------------
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user._id}`);

  // ✅ User setup
  socket.on("setup", (userData) => {
    if (!userData?._id) return;
    socket.join(userData._id);
    console.log(`${userData.name} joined the room`);
    socket.emit("connected");
  });

  // ✅ Join specific chat room
  socket.on("join chat", (room) => {
    if (room) {
      socket.join(room);
      console.log(`User joined chat: ${room}`);
    }
  });

  // ✅ Typing indicators
  socket.on("typing", (room) => {
    socket.in(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing");
  });

  // ✅ Handle new messages
  socket.on("new message", (newMessage) => {
    const chat = newMessage.chat;
    
    if (!chat?.users) return console.error("Chat users not defined");

    chat.users.forEach((user) => {
      if (user._id !== newMessage.sender._id) {
        io.to(user._id).emit("message received", newMessage);
      }
    });
  });

  // ✅ Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user._id}`);
  });
});

// ✅ Handle socket errors
io.on("error", (error) => {
  console.error("Socket Error:", error.message);
});
