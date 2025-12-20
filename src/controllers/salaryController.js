import Attendance from "../models/Attendance.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";
import Salary from "../models/Salary.js";

import Salary from "../models/Salary.js";

/* ================= ADMIN: CREATE / UPDATE SALARY ================= */
export const upsertSalary = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      baseSalary,
      totalWorkingDays,
      presentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      leaveDeduction,
      otherDeductions,
      remarks,
      status,
    } = req.body;

    const netSalary =
      baseSalary - (leaveDeduction || 0) - (otherDeductions || 0);

    const salary = await Salary.findOneAndUpdate(
      { employeeId, month },
      {
        employeeId,
        adminId: req.user._id,
        month,
        baseSalary,
        totalWorkingDays,
        presentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        leaveDeduction,
        otherDeductions,
        netSalary,
        remarks,
        status,
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Salary saved", salary });
  } catch (err) {
    res.status(500).json({ message: "Error saving salary" });
  }
};

/* ================= ADMIN: VIEW SALARIES ================= */
export const adminSalaryList = async (req, res) => {
  try {
    const { employeeId } = req.query;

    const filter = {};
    if (employeeId && employeeId !== "all") {
      filter.employeeId = employeeId;
    }

    const salaries = await Salary.find(filter)
      .populate("employeeId", "profile.name email")
      .sort({ month: -1 });

    res.json(salaries);
  } catch {
    res.status(500).json({ message: "Error loading salaries" });
  }
};

/* ================= EMPLOYEE: VIEW OWN SALARY ================= */
export const mySalaryByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    const salary = await Salary.findOne({
      employeeId: req.user._id,
      month,
    });

    if (!salary) {
      return res.json(null); // frontend safe
    }

    res.json(salary);
  } catch {
    res.status(500).json({ message: "Error loading salary" });
  }
};

/* ================= EMPLOYEE: SALARY HISTORY ================= */
export const mySalaryHistory = async (req, res) => {
  try {
    const data = await Salary.find({ employeeId: req.user._id }).sort({
      month: -1,
    });
    res.json(data);
  } catch {
    res.status(500).json({ message: "Error loading history" });
  }
};

/* ================= ADMIN: DELETE SALARY ================= */
export const deleteSalary = async (req, res) => {
  try {
    await Salary.findByIdAndDelete(req.params.id);
    res.json({ message: "Salary deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};
