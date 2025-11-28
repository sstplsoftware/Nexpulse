// C:\NexPulse\backend\src\models\AssignedTask.js

import mongoose from "mongoose";

const AssignedTaskSchema = new mongoose.Schema(
  {
    // BASIC INFO
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },

    // STATUS FLOW
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "COMPLETED"],
      default: "PENDING",
    },
    rejectReason: { type: String, default: "" },
    respondedAt: { type: Date, default: null },

    // WHO ASSIGNED
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedByName: { type: String, default: "" },
    assignedByEmployeeId: { type: String, default: "" },

    // WHO RECEIVES
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedToName: { type: String, default: "" },
    assignedToEmployeeId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("AssignedTask", AssignedTaskSchema);
