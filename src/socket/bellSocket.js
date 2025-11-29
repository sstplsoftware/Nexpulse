// C:\NexPulse\backend\src\socket\bellSocket.js

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Active IO instance for emit helpers
let ioInstance = null;

/**
 * Initialize bell socket on startup
 */
export const initBellSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://nexpulse.sstpltech.com",
        "http://nexpulse.sstpltech.com",
        "https://www.nexpulse.sstpltech.com",
        "https://crm-fft1.onrender.com",
        "*"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  ioInstance = io;
  console.log("🔌 Socket.IO Initialized for Bell System");

  // =====================================================
  // 🔐 JWT AUTH MIDDLEWARE
  // =====================================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("❌ Socket rejected → No token");
        return next(new Error("NO_TOKEN"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        console.log("❌ Socket rejected → Invalid user");
        return next(new Error("INVALID_USER"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.log("❌ Socket auth error:", err.message);
      next(new Error("INVALID_TOKEN"));
    }
  });

  // =====================================================
  // 🔥 ON SOCKET CONNECTION
  // =====================================================
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    console.log(`⚡ SOCKET CONNECTED → ${socket.user.email}`);

    // User joins his private room
    socket.join(userId);

    // 🔔 SEND bell
    socket.on("bell:send", (payload) => {
      console.log("🔔 SOCKET SENDING BELL →", payload);
      io.to(payload.to).emit("bell:new", payload);
    });

    // 🛑 STOP bell
    socket.on("bell:stop", (payload) => {
      io.to(payload.to).emit("bell:stopped", payload);
    });

    // ❌ Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ SOCKET DISCONNECTED → ${socket.user.email}`);
    });
  });

  return io;
};

/**
 * Emit helper for backend controllers
 */
export const emitBellToUser = (userId, payload) => {
  if (!ioInstance) return;
  ioInstance.to(userId.toString()).emit("bell:new", payload);
};

export const emitBellStoppedToUser = (userId, payload) => {
  if (!ioInstance) return;
  ioInstance.to(userId.toString()).emit("bell:stopped", payload);
};

export const getIo = () => ioInstance;
