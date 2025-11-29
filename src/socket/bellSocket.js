// C:\NexPulse\backend\src\socket\bellSocket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
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
