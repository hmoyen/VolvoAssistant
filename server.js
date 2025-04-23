const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { trainFromDatabase, loadManager } = require('./routes/nlp'); // Adjust the path as needed

dotenv.config();

const db = require("./config/db");
const users = new Map(); // Map to track connected users (socketId -> userDetails)
let activeChats = new Map(); // Map to track active chats (technicianId -> customerId)
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8001;

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CODESPACE_NAME
      ? `https://${process.env.CODESPACE_NAME}-3000.app.github.dev`
      : "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  }),
);
app.use(express.json());

// Routes
const machinesRouter = require('./routes/machineRoutes');
const issuesRouter = require('./routes/issues');
const userRoutes = require("./routes/userRoutes");
const conversationRoutes = require("./routes/conversation");
const scheduleRoutes = require("./routes/scheduleRoutes");
const troubleshootTreeRoutes = require("./routes/troubleshootTree");
app.use("/api/users", userRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/api/tree", troubleshootTreeRoutes);
app.use('/api/machines', machinesRouter);
app.use('/api/issues', issuesRouter);
app.use("/api/conversations", conversationRoutes);


// DB test route
app.get("/api/db-test", (req, res) => {
  db.query("SELECT NOW()", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res
      .status(200)
      .json({ message: "Database connected", result: result.rows });
  });
});

// SOCKET.IO logic
const technicians = new Map();
let liveChatQueue = [];
const videoCallQueue = [];

const generateVideoCallLink = () =>
  `https://meet.google.com/${Math.random().toString(36).substring(2, 15)}`;

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.log("[SOCKET AUTH]: Incoming token:", token);

  if (!token) {
    console.error("[SOCKET AUTH ERROR]: No token provided");
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[SOCKET AUTH]: Token valid, user:", decoded);
    socket.user = decoded;
    next();
  } catch (err) {
    console.error("[SOCKET AUTH ERROR]: Invalid token", err.message);
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle user registration (customer or technician)
  socket.on("registerUser", (userDetails) => {
    users.set(socket.id, userDetails);
    console.log("User registered:", userDetails);

    if (userDetails.role === "technician") {
      io.emit(
        "updateTechnicianStatus",
        Array.from(users.values()).filter((user) => user.role === "technician"),
      );
    }
  });

  // Handle customer joining live chat queue
  socket.on("joinLiveChatQueue", (customerDetails) => {
    liveChatQueue.push({ id: socket.id, ...customerDetails });
    io.emit("updateLiveChatQueue", liveChatQueue); // Notify all technicians
  });

  // Handle technician selecting a customer
  socket.on("selectCustomer", (customerId) => {
    const customer = liveChatQueue.find((c) => c.id === customerId);
    if (customer) {
      liveChatQueue = liveChatQueue.filter((c) => c.id !== customerId);
      activeChats.set(socket.id, customerId); // Map technician to customer
      io.emit("updateLiveChatQueue", liveChatQueue); // Update queue for all technicians
      io.to(customerId).emit("technicianConnected", {
        technicianId: socket.id,
      });
      io.to(socket.id).emit("customerConnected", customer);
    } else {
      console.warn(`[WARN] Customer with ID ${customerId} not found in queue.`);
    }
  });

  // Handle real-time messaging
  socket.on("sendMessage", ({ to, message }) => {
    const messageData = {
      from: socket.id,
      message,
      timestamp: Date.now(), // Add timestamp here
    };

    io.to(to).emit("receiveMessage", messageData);
  });

  // ❌ End chat
  socket.on("endChat", ({ customerId }) => {
    io.to(customerId).emit("chatEnded");
    liveChatQueue = liveChatQueue.filter((c) => c.id !== customerId);
    io.emit(
      "updateLiveChatQueue",
      liveChatQueue.filter((c) => c.connected),
    );
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    const user = users.get(socket.id);
    users.delete(socket.id);

    if (user?.role === "technician") {
      const customerId = activeChats.get(socket.id);
      if (customerId) {
        // Return the customer to the queue if the technician disconnects
        const customer = liveChatQueue.find((c) => c.id === customerId);
        if (customer) {
          liveChatQueue.push(customer);
        }
        activeChats.delete(socket.id);
      }
      io.emit(
        "updateTechnicianStatus",
        Array.from(users.values()).filter((user) => user.role === "technician"),
      );
    }

    liveChatQueue = liveChatQueue.filter(
      (customer) => customer.id !== socket.id,
    );
    io.emit("updateLiveChatQueue", liveChatQueue); // Notify all technicians
  });
});

(async () => {
  // Train NLP manager from the database before starting the server
  await trainFromDatabase();

  // After training, you can load the model (if needed)
  await loadManager();

  // Now start the server
  server.listen(PORT, () => {
    const host = process.env.CODESPACE_NAME
      ? `https://${process.env.CODESPACE_NAME}-5000.app.github.dev`
      : `http://localhost:${PORT}`;
    console.log(`Server is running on ${host}`);
  });
})();