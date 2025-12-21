import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, default: 100 },
});

const attendanceSettingsSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    officeStart: { type: String, required: true }, // "09:00"
    officeEnd: { type: String, required: true },   // "17:30"
    lateMarginMinutes: { type: Number, default: 15 },
    lateMarginDays: { type: Number, default: 0 },

    halfDayTime: { type: String, required: true }, // "13:00"

    // 🔥 NEW FLAGS (safe defaults)
    saturdayWorking: { type: Boolean, default: true },
    halfDayDeduction: { type: Boolean, default: true },

    zones: { type: [zoneSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model(
  "AttendanceSettings",
  attendanceSettingsSchema
);
