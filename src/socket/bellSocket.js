// C:\NexPulse\backend\src\socket\bellSocket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";


export function initBellSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://nexpulse.sstpltech.com",
        "http://nexpulse.sstpltech.com",
        "https://www.nexpulse.sstpltech.com",
        "https://crm-fft1.onrender.com"  // allow same domain on Render
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  console.log("🔌 Socket.IO Initialized for Bell System");

  // ============================================
  // 🔐 SOCKET AUTH MIDDLEWARE (JWT CHECK)
  // ============================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("❌ Socket rejected: No token");
        return next(new Error("NO_TOKEN"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        console.log("❌ Socket rejected: Invalid user");
        return next(new Error("INVALID_USER"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.log("❌ Socket auth error:", err.message);
      next(new Error("INVALID_TOKEN"));
    }
  });

  // ============================================
  // 🔥 SOCKET CONNECTION
  // ============================================
  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    const userEmail = socket.user.email;

    console.log(`⚡ SOCKET CONNECTED → ${userEmail}`);

    // Join personal room (very important)
    socket.join(userId);

    // ============================================
    // 🔔 RECEIVE FROM BACKEND → SEND TO USER
    // ============================================
    socket.on("bell:send", (payload) => {
      // payload = { to, bellId, message, fromName }
      console.log("🔔 Socket Bell Sending →", payload);

      io.to(payload.to).emit("bell:new", payload);
    });

    // ============================================
    // 🛑 STOP BELL (receiver)
    // ============================================
    socket.on("bell:stop", (payload) => {
      io.to(payload.to).emit("bell:stopped", payload);
    });

    // ============================================
    // ❌ DISCONNECT
    // ============================================
    socket.on("disconnect", () => {
      console.log(`❌ SOCKET DISCONNECTED → ${userEmail}`);
    });
  });
}

import "../loadEnv.js";

let ioInstance = null;

// userId -> Set<socketId>
const userSockets = new Map();

export const initBellSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*", // you can restrict to your frontend URL
      methods: ["GET", "POST"],
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("_id role");
      if (!user) return next(new Error("User not found"));

      socket.user = { id: user._id.toString(), role: user.role };
      next();
    } catch (err) {
      console.error("Socket auth error:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user.id;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    socket.join(userId); // room = userId

    socket.on("disconnect", () => {
      const set = userSockets.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(userId);
      }
    });
  });

  return ioInstance;
};

export const getIo = () => ioInstance;

export const emitBellToUser = (userId, payload) => {
  if (!ioInstance) return;
  ioInstance.to(userId.toString()).emit("bell:new", payload);
};

export const emitBellStoppedToUser = (userId, payload) => {
  if (!ioInstance) return;
  ioInstance.to(userId.toString()).emit("bell:stopped", payload);
};

