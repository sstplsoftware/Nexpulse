// C:\NexPulse\backend\src\utils\seedSuperAdmin.js
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, "../../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const { MONGO_URI, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;

if (!MONGO_URI || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error("❌ Missing required .env variables");
  process.exit(1);
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    const exists = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase().trim() });
    if (exists) {
      console.log("⚠ Super admin already exists:", exists.email);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    await User.create({
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
      createdBy: null,
      isLocked: false,
    });

    console.log("🎉 Super Admin Created:", SUPER_ADMIN_EMAIL);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed Error:", err.message);
    process.exit(1);
  }
}

seed();
