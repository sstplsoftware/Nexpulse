// C:\NexPulse\backend\src\index.js

import "./loadEnv.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initHrmSocket } from "./socket/hrmSocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import http from "http";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminEmployeeRoutes from "./routes/adminEmployeeRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import bellRoutes from "./routes/bellRoutes.js";

import { initBellSocket } from "./socket/bellSocket.js";

const app = express();
const httpServer = http.createServer(app);

// 🟡 DO NOT initialize sockets here
// initHrmSocket(httpServer) ❌ wrong
// initBellSocket(httpServer) ❌ wrong

// =========================
// CORS
// =========================
const allowedOrigins = [
  "http://localhost:5173",
  "https://crm-fft1.onrender.com",
  "http://crm-fft1.onrender.com",
  "https://nexpulse.sstpltech.com",
  "https://www.nexpulse.sstpltech.com",
  "http://nexpulse.sstpltech.com",
];

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      console.log("❌ Blocked by CORS:", origin);
      return cb(new Error("CORS Not Allowed"));
    },
    credentials: true,
  })
);

// Body Parser
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminEmployeeRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/bell", bellRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "running", version: "1.0.0" });
});

app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "NexPulse CRM Backend is Live 🚀",
  });
});

// =========================
// START SERVER + SOCKETS
// =========================
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  console.log("📌 MongoDB Connected");

  // 🔥 Sockets must be initialized AFTER DB
  initBellSocket(httpServer);
  initHrmSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server + Socket running on port ${PORT}`);
  });
}

start();
