import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    date: { type: String, required: true }, // 2025-12-11

    clockIn: { type: String, default: null },
    clockOut: { type: String, default: null },

    latIn: { type: Number, default: null },
    lngIn: { type: Number, default: null },

    latOut: { type: Number, default: null },
    lngOut: { type: Number, default: null },

    totalHours: { type: String, default: "--" },
    status: {
      type: String,
      enum: ["On Time", "Late", "Half Day", "Absent", "Present"],
      default: "Absent",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
