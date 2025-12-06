// C:\NexPulse\backend\src\socket\hrmSocket.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function initHrmSocket(io) {
  const hrm = io.of("/hrm");

  console.log("💬 HRM namespace ready");

  // Authenticate
  hrm.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("NO_TOKEN"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) return next(new Error("INVALID_USER"));

      socket.user = user;
      next();
    } catch {
      next(new Error("AUTH_FAILED"));
    }
  });

  hrm.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    socket.join(userId);

    console.log("🔗 HRM connected:", socket.user.email);

    socket.on("disconnect", () => {
      console.log("❌ HRM disconnected:", socket.user.email);
    });
  });
}
