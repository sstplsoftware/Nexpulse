// C:\NexPulse\backend\src\models\Task.js

import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId, // ADMIN who owns this employee
      ref: "User",
      required: true,
    },

    employeeCustomId: {
      type: String,
      required: false,
    },

    employeeName: {
      type: String,
      required: true,
    },

    morningTask: String,
    eveningUpdate: String,

    isFinal: { type: Boolean, default: false },

    editCount: { type: Number, default: 0 },

    finalSubmittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", TaskSchema);

export default Task;
