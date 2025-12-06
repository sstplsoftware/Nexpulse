// C:\NexPulse\backend\src\socket\hrmSocket.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Optional reference for emit helpers
let ioRef = null;

export function initHrmSocket(io) {
  ioRef = io; // store io reference if we want backend emits later

  // Create namespace
  const hrm = io.of("/hrm");

  console.log("💬 HRM namespace ready");

  // ============================
  // AUTH MIDDLEWARE
  // ============================
  hrm.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("NO_TOKEN"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) return next(new Error("INVALID_USER"));

      socket.user = user;
      next();
    } catch (err) {
      console.log("❌ HRM Auth Error:", err.message);
      next(new Error("AUTH_FAILED"));
    }
  });

  // ============================
  // CONNECTION
  // ============================
  hrm.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    socket.join(userId);

    console.log(`🔗 HRM Connected → ${socket.user.email}`);

    socket.on("disconnect", () => {
      console.log(`❌ HRM Disconnected → ${socket.user.email}`);
    });
  });
}

/* =====================================================
   OPTIONAL EMIT HELPERS (use later if HRM needs pushes)
===================================================== */
export const emitHrmToUser = (userId, event, payload) => {
  if (!ioRef) return;
  ioRef.of("/hrm").to(userId.toString()).emit(event, payload);
};
