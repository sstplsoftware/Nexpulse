// C:\NexPulse\backend\src\socket\bellSocket.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function initBellSocket(io) {
  const bell = io.of("/bell");

  console.log("🔌 Bell namespace ready");

  // Authentication
  bell.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("NO_TOKEN"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) return next(new Error("INVALID_USER"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("INVALID_TOKEN"));
    }
  });

  // Connection
  bell.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    socket.join(userId);

    console.log(`🔔 Bell connected → ${socket.user.email}`);

    socket.on("bell:send", (payload) => {
      bell.to(payload.to).emit("bell:new", payload);
    });

    socket.on("bell:stop", (payload) => {
      bell.to(payload.to).emit("bell:stopped", payload);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Bell disconnected → ${socket.user.email}`);
    });
  });
}
