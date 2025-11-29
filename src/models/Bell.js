// C:\NexPulse\backend\src\models\Bell.js
import mongoose from "mongoose";

const bellSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // who is calling

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // who is being called

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // true if still active / ringing
    isActive: {
      type: Boolean,
      default: true,
    },

    // optional – if this bell was sent as "ring all"
    ringAll: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Bell = mongoose.model("Bell", bellSchema);
export default Bell;
