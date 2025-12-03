import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin
  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ["IN", "OUT"], required: true },
  time: { type: Date, default: Date.now },
});

export default mongoose.model("Attendance", attendanceSchema);
