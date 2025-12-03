// C:\NexPulse\backend\src\models\HrmChat.js

import mongoose from "mongoose";

const { Schema } = mongoose;

const hrmChatSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    isReadByAdmin: {
      type: Boolean,
      default: false,
    },
    isReadByEmployee: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("HrmChat", hrmChatSchema);
