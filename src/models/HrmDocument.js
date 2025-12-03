import mongoose from "mongoose";

const HrmDocumentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,   // ADMIN ID
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    fileUrl: { type: String, required: true },

  },
  { timestamps: true }
);

export default mongoose.model("HrmDocument", HrmDocumentSchema);
