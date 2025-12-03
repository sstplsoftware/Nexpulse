// HrmChat.js
import mongoose from "mongoose";

const HrmChatSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // admin id

    message: { type: String, required: true },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("HrmChat", HrmChatSchema);
