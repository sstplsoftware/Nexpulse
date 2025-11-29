// C:\NexPulse\backend\src\index.js
import "./loadEnv.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import http from "http"; // 🔥 REQUIRED FOR SOCKET.IO

import { connectDB } from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminEmployeeRoutes from "./routes/adminEmployeeRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";

// Bell Call
import bellRoutes from "./routes/bellRoutes.js";

// 🔥 SOCKET (REAL-TIME BELL)
import { initBellSocket } from "./socket/bellSocket.js";

const app = express();

// Wrap Express with HTTP server (REQUIRED for socket.io)
const httpServer = http.createServer(app);

// ------------------------------
// CORS CONFIG (SAFE + PRODUCTION)
// ------------------------------
const allowedOrigins = [

  "http://localhost:5173",

  // FRONTEND (cPanel domain)
  "https://your-cpanel-domain.com",
  "http://your-cpanel-domain.com",

  // Backend Render domain (Socket fallback)
  "https://crm-fft1.onrender.com",
  "http://crm-fft1.onrender.com",

  // Nexpulse domain
  "https://nexpulse.sstpltech.com",
  "https://www.nexpulse.sstpltech.com",

  "http://localhost:5173",           // local dev
  "https://nexpulse.sstpltech.com",  // production
  "https://www.nexpulse.sstpltech.com/",
  "http://nexpulse.sstpltech.com"
];


app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked Origin:", origin);
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ------------------------------
// ROUTES
// ------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminEmployeeRoutes);
app.use("/api/employee", employeeRoutes);

// bell
app.use("/api/bell", bellRoutes);

// health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "NexPulse CRM Backend is Live 🚀",
    docs: "/api/health",
    version: "1.0.0",
  });
});

// ------------------------------
// START SERVER + SOCKET.IO
// ------------------------------
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  console.log("📌 MongoDB Connected");

  // Initialize Socket.IO
  initBellSocket(httpServer);

  httpServer.listen(PORT, () =>
    console.log(`🚀 Server + Socket running on port ${PORT}`)
  );
}

start();
