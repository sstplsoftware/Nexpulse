// C:\NexPulse\backend\src\models\MisRecord.js

import mongoose from "mongoose";

const misRecordSchema = new mongoose.Schema(
  {
    // Scope / ownership
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibleToAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadSource: {
      type: String,
      enum: ["excel", "manual"],
      default: "excel",
    },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Ordering for "add row in between"
    orderIndex: { type: Number, default: 0 },

    // Fast filter fields (camelCase)
    batchId: { type: String, index: true },
    schemeProgramModel: { type: String, index: true },
    sectorSSCName: { type: String, index: true },
    assessorArId: { type: String, index: true },
    batchStartDate: { type: Date, index: true },
    batchEndDate: { type: Date, index: true },
    assessorName: { type: String, index: true },
    assessmentStatus: { type: String, index: true },
    resultStatus: { type: String, index: true },

    // The full MIS row, keyed by your master headings
    rowData: {
      type: Map,
      of: String,
      default: {},
    },

    // Audit
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("MisRecord", misRecordSchema);
