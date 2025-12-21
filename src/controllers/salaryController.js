// C:\NexPulse\backend\src\controllers\salaryController.js

import Salary from "../models/Salary.js";
import User from "../models/User.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";
import { resolveMonthlyAttendance } from "./attendanceController.js";

/* =========================================================
   HELPERS
========================================================= */

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function daysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Salary calculation rules (SYNC WITH HR LOGIC):
 * - Holiday: not counted as working day (no deduction)
 * - Paid Leave: NOT deducted (treated like present day)
 * - Absent: deducted
 * - Punch present/late/halfday/on time: NOT deducted (for now)
 *
 * NOTE: You can later add "Half Day = 0.5 deduction" if you want.
 */
function computeSalaryFromResolvedRows({ baseSalary, month, rows, settings }) {
  // Only count actual working days (no Sunday, no holiday)
  const workingDayRows = rows.filter((r) => r.isWorkingDay === true);

  let absentDays = 0;
  let halfDays = 0;

  workingDayRows.forEach((r) => {
    const status = String(r.status || "").toLowerCase();

    if (status === "absent") {
      absentDays += 1;
    }

    // 🔥 Half day = 0.5 deduction (configurable)
    if (
      status.includes("half day") &&
      settings?.halfDayDeduction !== false
    ) {
      halfDays += 0.5;
    }
  });

  // ✅ salary per-day based on ACTUAL working days
  const totalWorkingDays = workingDayRows.length || 1;
  const perDaySalary = baseSalary / totalWorkingDays;

  const totalDeductionDays = absentDays + halfDays;
  const deduction = Math.round(totalDeductionDays * perDaySalary);

  const finalSalary = Math.max(
    0,
    Math.round(baseSalary - deduction)
  );

  return {
    totalWorkingDays,
    absentDays,
    halfDays,
    deduction,
    finalSalary,
  };
}


/* =========================================================
   EMPLOYEE: GET MY SALARY (MONTH)
   GET /api/salary/my?month=YYYY-MM
========================================================= */
export async function getMySalary(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const month = req.query.month || monthKey();

    const salary = await Salary.findOne({
      employeeId: req.user._id,
      adminId,
      month,
    })
      .populate("employeeId", "profile employeeId")
      .lean();

    // If not created yet, return null (frontend handles EMPTY model)
    return res.json(salary || null);
  } catch (err) {
    console.error("getMySalary error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   EMPLOYEE: SALARY HISTORY (LAST 6)
   GET /api/salary/my/history
========================================================= */
export async function getSalaryHistory(req, res) {
  try {
    const adminId = resolveAdminId(req.user);

    const rows = await Salary.find({
      employeeId: req.user._id,
      adminId,
    })
      .sort({ month: -1 })
      .limit(6)
      .lean();

    return res.json({ rows });
  } catch (err) {
    console.error("getSalaryHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   ADMIN: LIST SALARIES (OPTIONAL employeeId FILTER)
   GET /api/salary/admin?employeeId=...
========================================================= */
export async function getAdminSalaries(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { employeeId } = req.query;

    const q = { adminId };
    if (employeeId) q.employeeId = employeeId;

    const rows = await Salary.find(q)
      .sort({ month: -1, createdAt: -1 })
      .populate("employeeId", "profile employeeId")
      .lean();

    return res.json(rows);
  } catch (err) {
    console.error("getAdminSalaries error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   ADMIN: CREATE OR UPDATE SALARY (CALCULATES FROM RESOLVED ATTENDANCE)
   POST /api/salary/manage
   body: { employeeId, month, baseSalary }
========================================================= */
export async function createOrUpdateSalary(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { employeeId, month, baseSalary } = req.body;

    if (!employeeId || !month || baseSalary == null) {
      return res.status(400).json({
        message: "employeeId, month, baseSalary are required",
      });
    }

    const emp = await User.findOne({
      _id: employeeId,
      role: "EMPLOYEE",
      createdBy: adminId,
    }).select("_id");

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // If salary exists & PAID -> locked
    const existing = await Salary.findOne({ employeeId, adminId, month });
    if (existing && existing.status === "PAID") {
      return res.status(400).json({ message: "Salary is PAID and locked" });
    }

    // ✅ Get resolved attendance (includes leave + holiday + default absent)
    const resolvedRows = await resolveMonthlyAttendance({
      employeeId,
      adminId,
      month,
    });

    const settings = await AttendanceSettings.findOne({ adminId }).lean();

const calc = computeSalaryFromResolvedRows({
  baseSalary: Number(baseSalary),
  month,
  rows: resolvedRows,
  settings,
});
    const payload = {
      employeeId,
      adminId,
      month,
      baseSalary: Number(baseSalary),
      totalWorkingDays: calc.totalWorkingDays,
      absentDays: calc.absentDays,
      deduction: calc.deduction,
      finalSalary: calc.finalSalary,

      lastUpdatedBy: req.user._id,
      generatedBy: req.user._id,
    };

    const saved = await Salary.findOneAndUpdate(
      { employeeId, adminId, month },
      { $set: payload },
      { upsert: true, new: true }
    ).populate("employeeId", "profile employeeId");

    return res.json({ ok: true, salary: saved });
  } catch (err) {
    console.error("createOrUpdateSalary error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   ADMIN: DELETE SALARY (ONLY IF NOT PAID)
   DELETE /api/salary/:id
========================================================= */
export async function deleteSalary(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const s = await Salary.findOne({ _id: id, adminId });
    if (!s) return res.status(404).json({ message: "Salary not found" });

    if (s.status === "PAID") {
      return res.status(400).json({ message: "PAID salary cannot be deleted" });
    }

    await Salary.deleteOne({ _id: id, adminId });
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteSalary error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   ADMIN ONLY: MARK SALARY PAID
   PATCH /api/salary/:id/pay
========================================================= */
export async function markSalaryPaid(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const s = await Salary.findOne({ _id: id, adminId });
    if (!s) return res.status(404).json({ message: "Salary not found" });

    if (s.status === "PAID") {
      return res.json({ ok: true, message: "Already PAID" });
    }

    s.status = "PAID";
    s.lastUpdatedBy = req.user._id;
    await s.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("markSalaryPaid error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
