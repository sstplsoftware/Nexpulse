import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

export default mongoose.model("Holiday", holidaySchema);
