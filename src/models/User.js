// C:\NexPulse\backend\src\models\User.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // =========================================================
    // BASIC LOGIN FIELDS (same as your original)
    // =========================================================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"],
      required: true,
    },

    isLocked: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // optional expiry originally in your model
    expiresAt: { type: Date, default: null },

     // EMPLOYEE PERMISSIONS (Admin assigned)
     permissions: { type: Object, default: {} },


    // =========================================================
    // PROFILE (Admin + Employee Shared)
    // =========================================================
    profile: {
      name: { type: String, default: "" },           // Admin or employee name
      companyName: { type: String, default: "" },    // For admins + assigned to employees
    },

    // =========================================================
    // ADMIN-ONLY FIELDS
    // =========================================================
    employeeSize: { type: Number, default: 0 },       // how many employees admin can create
    activeUntil: { type: Date, default: null },       // admin subscription date
    employeeCount: { type: Number, default: 0 },      // how many employees created

    // =========================================================
    // EMPLOYEE-ONLY FIELDS
    // =========================================================
    employeeId: { type: String, default: "" },        // EMP001 etc.
    officialPhone: { type: String, default: "" },
    personalPhone: { type: String, default: "" },
    otherEmail: { type: String, default: "" },
    department: { type: String, default: "" },
    dateOfJoining: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
