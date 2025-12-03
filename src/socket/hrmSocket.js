// C:\NexPulse\backend\src\socket\hrmSocket.js

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function initHrmSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://crm-fft1.onrender.com",
        "http://crm-fft1.onrender.com"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["polling", "websocket"],
    allowEIO3: true
  });

  console.log("💬 HRM Socket.IO Initialized");

  // Attach globally for controllers
  global.io = io;

  // AUTH MIDDLEWARE
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("NO_TOKEN"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) return next(new Error("INVALID_USER"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("AUTH_FAILED"));
    }
  });

  // USER JOINS ROOM
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    socket.join(userId);

    console.log("🔗 HRM socket connected:", userId);

    socket.on("disconnect", () => {
      console.log("❌ HRM socket disconnected:", userId);
    });
  });
}
