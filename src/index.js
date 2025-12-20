// C:\NexPulse\backend\src\index.js

import "./loadEnv.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io"; // ✅ Socket.IO here

// DB
import { connectDB } from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminEmployeeRoutes from "./routes/adminEmployeeRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import bellRoutes from "./routes/bellRoutes.js";
import adminMisRoutes from "./routes/adminMisRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";
// Socket Systems
import { initBellSocket } from "./socket/bellSocket.js";
import { initHrmSocket } from "./socket/hrmSocket.js";

import misRoutes from "./routes/misRoutes.js";

import leaveRoutes from "./routes/leaveRoutes.js";

const app = express();
const httpServer = http.createServer(app);

/* =====================================================
   CORS CONFIG — LOCALHOST + RENDER
===================================================== */
export const allowedOrigins = [
  "http://localhost:5173",
  "http://crm-hrx8.onrender.com",
  "https://crm-hrx8.onrender.com",
  "https://nexpulse.sstpltech.com",
  "https://www.nexpulse.sstpltech.com",
  "http://nexpulse.sstpltech.com",
  "https://crm-hrx8.onrender.com:443", // ✅ ADD THIS
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server & websocket upgrade without origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ Blocked by CORS:", origin);
      return callback(new Error("CORS Not Allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// OPTIONS preflight handler (Express 5-safe)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.sendStatus(200);
  }
  next();
});

/* =====================================================
   PARSERS
===================================================== */
app.use(express.json());

/* =====================================================
   ROUTES
===================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminEmployeeRoutes);
app.use("/api/admin/mis", adminMisRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/bell", bellRoutes);
app.use("/api/mis", misRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/salary", salaryRoutes);
/* =====================================================
   HEALTH CHECK
===================================================== */
app.get("/api/health", (req, res) => {
  res.json({ status: "running", ok: true, version: "1.0.0" });
});

app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "NexPulse CRM Backend is Live 🚀",
  });
});

/* =====================================================
   SOCKET.IO — SINGLE INSTANCE
===================================================== */
const io = new Server(httpServer, {
  cors: {
    // ❗ Fixed: Socket.IO CORS must be a function when using multiple origins
    origin: (origin, callback) => {
      // allow server-to-server / postman / no-origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ Socket.IO CORS BLOCKED:", origin);
      return callback(new Error("CORS_NOT_ALLOWED"));
    },
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
});

/* =====================================================
   START SERVER + SOCKETS
===================================================== */
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  console.log("📌 MongoDB Connected Successfully");

  // ✅ Pass the ONE io instance into your socket modules
  initBellSocket(io);
  initHrmSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server + WebSockets running on port ${PORT}`);
  });
}

start();
