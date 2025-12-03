import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  month: Number,
  year: Number,
  basic: Number,
  hra: Number,
  bonus: Number,
  deductions: Number,
  netPay: Number,
  slipUrl: String,
});

export default mongoose.model("Salary", salarySchema);
