import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    month: {
      type: String, // YYYY-MM
      required: true,
    },

    baseSalary: {
      type: Number,
      required: true,
    },

    totalWorkingDays: Number,
    presentDays: Number,
    paidLeaveDays: Number,
    unpaidLeaveDays: Number,

    leaveDeduction: {
      type: Number,
      default: 0,
    },

    otherDeductions: {
      type: Number,
      default: 0,
    },

    netSalary: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    remarks: String,
  },
  { timestamps: true }
);

salarySchema.index({ employeeId: 1, month: 1 }, { unique: true });

export default mongoose.model("Salary", salarySchema);
