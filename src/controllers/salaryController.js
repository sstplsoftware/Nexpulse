// C:\NexPulse\backend\src\controllers\salaryController.js

import Salary from "../models/Salary.js";
import Attendance from "../models/Attendance.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";

/* =========================
   EMPLOYEE: CURRENT MONTH
========================= */
export const getMySalary = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const month = req.query.month;

    const salary = await Salary.findOne({ employeeId, month });

    res.json(salary || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load salary" });
  }
};

/* =========================
   EMPLOYEE: HISTORY
========================= */
export const getSalaryHistory = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const rows = await Salary.find({ employeeId }).sort({ month: -1 });
    res.json({ rows });
  } catch {
    res.status(500).json({ message: "Failed to load history" });
  }
};

/* =========================
   ADMIN: VIEW SALARIES
========================= */
export const getAdminSalaries = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    const { employeeId } = req.query;

    const filter = { adminId };
    if (employeeId && employeeId !== "all") {
      filter.employeeId = employeeId;
    }

    const rows = await Salary.find(filter)
      .populate("employeeId", "profile.name")
      .sort({ month: -1 });

    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to load salaries" });
  }
};

/* =========================
   ADMIN: CREATE / UPDATE SALARY
========================= */
export const createOrUpdateSalary = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    const { employeeId, month, baseSalary } = req.body;

    if (!employeeId || !month || !baseSalary) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🔒 HARD LOCK — PAID SALARY
    const existing = await Salary.findOne({ employeeId, month, adminId });
    if (existing && existing.status === "PAID") {
      return res.status(400).json({
        message: "Salary already PAID and locked",
      });
    }

    // 🔥 FETCH ATTENDANCE (EXCLUDES SUNDAYS / HOLIDAYS BY DESIGN)
    const attendance = await Attendance.find({
      employeeId,
      adminId,
      date: { $regex: `^${month}` },
    }).lean();

    let paidDays = 0;
    let absentDays = 0;

    attendance.forEach((a) => {
      switch (a.status) {
        case "Absent":
          absentDays++;
          break;

        case "On Time":
        case "Late":
        case "Half Day":
          paidDays++;
          break;

        default:
          // Safety: treat unknown as unpaid
          absentDays++;
      }
    });

    const totalWorkingDays = paidDays + absentDays;

    // 🧮 PER DAY SALARY
    const perDay =
      totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;

    const deduction = Math.round(absentDays * perDay);
    const finalSalary = Math.max(
      0,
      Math.round(baseSalary - deduction)
    );

    // 💾 UPSERT SALARY
    const salary = await Salary.findOneAndUpdate(
      { employeeId, month, adminId },
      {
        employeeId,
        adminId,
        month,
        baseSalary,
        totalWorkingDays,
        paidDays,
        absentDays,
        deduction,
        finalSalary,
        status: "PENDING",

        // 🧾 AUDIT
        generatedBy: req.user._id,
        lastUpdatedBy: req.user._id,
        lastRecalculatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ ok: true, salary });
  } catch (err) {
    console.error("SALARY ERROR:", err);
    res.status(500).json({ message: "Salary calculation failed" });
  }
};


/* =========================
   ADMIN: DELETE
========================= */
export const deleteSalary = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    await Salary.deleteOne({ _id: req.params.id, adminId });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

/* =========================
   ADMIN: MARK PAID
========================= */
export const markSalaryPaid = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    const salary = await Salary.findOne({
      _id: req.params.id,
      adminId,
    });

    if (!salary) {
      return res.status(404).json({ message: "Salary not found" });
    }

    if (salary.status === "PAID") {
      return res.status(400).json({ message: "Already PAID" });
    }

    salary.status = "PAID";
    await salary.save();

    res.json({ message: "Salary marked as PAID" });
  } catch {
    res.status(500).json({ message: "Failed to mark PAID" });
  }
};
