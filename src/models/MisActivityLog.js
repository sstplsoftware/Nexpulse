// C:\NexPulse\backend\src\models\MisActivityLog.js

import mongoose from "mongoose";

const misActivityLogSchema = new mongoose.Schema(
  {
    misRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MisRecord",
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedByRole: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"],
      required: true,
    },
    action: {
      type: String,
      enum: ["create", "update", "delete", "restore"],
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    changedFields: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("MisActivityLog", misActivityLogSchema);
