import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fileUrl: String,
  fileName: String,
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Document", documentSchema);
