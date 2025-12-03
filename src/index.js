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
import http from "http"; // Needed for socket.io
import fileUpload from "express-fileupload";

// DB
import { connectDB } from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminEmployeeRoutes from "./routes/adminEmployeeRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import bellRoutes from "./routes/bellRoutes.js";

// Socket (Bell)
import { initBellSocket } from "./socket/bellSocket.js";

const app = express();
const httpServer = http.createServer(app);

// =======================================
//    CORS CONFIG (Production Safe)
// =======================================
const allowedOrigins = [
  "http://localhost:5173",

  // cPanel frontend (replace when deployed)
  "https://your-cpanel-domain.com",
  "http://your-cpanel-domain.com",

  // Render backend
  "https://crm-fft1.onrender.com",
  "http://crm-fft1.onrender.com",

  // Nexpulse
  "https://nexpulse.sstpltech.com",
  "https://www.nexpulse.sstpltech.com",
  "http://nexpulse.sstpltech.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // mobile apps / postman
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("CORS Not Allowed"));
      }
    },
    credentials: true,
  })
);

// =======================================
// Middleware
// =======================================
app.use(express.json());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// =======================================
// Routes
// =======================================
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminEmployeeRoutes);
app.use("/api/employee", employeeRoutes);

// Bell Routes
app.use("/api/bell", bellRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "running", version: "1.0.0" });
});

// Root (fallback)
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "NexPulse CRM Backend is Live 🚀",
    docs: "/api/health",
  });
});

// =======================================
// Start Server + Socket.IO
// =======================================
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  console.log("📌 MongoDB Connected");

  // Initialize socket.io for Bell
  initBellSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server + Socket running on port ${PORT}`);
  });
}

start();
