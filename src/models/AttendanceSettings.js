const attendanceSettingsSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    officeStart: { type: String, required: true }, // "09:00"
    officeEnd: { type: String, required: true },   // "17:30"

    // 🔥 HALF DAY LOGIC
    halfDayTime: { type: String, required: true }, // "13:00"

    halfDayDeduction: {
      type: Boolean,
      default: true, // true = 0.5 salary cut
    },

    // 🔥 WEEKLY OFF CONFIG
    saturdayWorking: {
      type: String,
      enum: ["OFF", "FULL", "HALF"],
      default: "OFF",
    },

    lateMarginMinutes: { type: Number, default: 15 },
    lateMarginDays: { type: Number, default: 0 },

    zones: { type: [zoneSchema], default: [] },
  },
  { timestamps: true }
);
