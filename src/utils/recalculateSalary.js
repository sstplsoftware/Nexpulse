// C:\NexPulse\backend\src\utils\recalculateSalary.js

import Attendance from "../models/Attendance.js";
import Salary from "../models/Salary.js";
import Holiday from "../models/Holiday.js";
import Leave from "../models/Leave.js";

/* =====================================================
   HELPERS
===================================================== */
function isSunday(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

function daysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/* =====================================================
   MAIN RECALC FUNCTION
===================================================== */
export async function recalculateSalaryForEmployee({
  employeeId,
  adminId,
  month,
  updatedBy,
}) {
  // 🔒 Fetch salary
  const salary = await Salary.findOne({ employeeId, adminId, month });

  // 🔐 HARD LOCK
  if (!salary || salary.status === "PAID") return;

  /* =========================
     LOAD DATA
  ========================= */
  const attendance = await Attendance.find({
    employeeId,
    adminId,
    date: { $regex: `^${month}` },
  }).lean();

  const holidays = await Holiday.find({
    adminId,
    date: { $regex: `^${month}` },
  }).lean();

  const leaves = await Leave.find({
    employeeId,
    adminId,
    status: "APPROVED",
  }).lean();

  const attendanceMap = new Map();
  attendance.forEach((a) => attendanceMap.set(a.date, a));

  const holidaySet = new Set(holidays.map((h) => h.date));

  /* =========================
     LEAVE MAP (PAID / UNPAID)
  ========================= */
  const paidLeaveSet = new Set();
  const unpaidLeaveSet = new Set();

  leaves.forEach((l) => {
    const start = new Date(l.fromDate);
    const end = new Date(l.toDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().slice(0, 10);
      if (l.isPaid) paidLeaveSet.add(dateKey);
      else unpaidLeaveSet.add(dateKey);
    }
  });

  /* =========================
     DAY-BY-DAY RESOLUTION
  ========================= */
  const totalDays = daysInMonth(month);

  let paidDays = 0;
  let absentDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;

    // ❌ Sundays never count
    if (isSunday(date)) continue;

    // ❌ Holidays never count
    if (holidaySet.has(date)) continue;

    // ✅ Paid leave
    if (paidLeaveSet.has(date)) {
      paidDays++;
      continue;
    }

    // ❌ Unpaid leave
    if (unpaidLeaveSet.has(date)) {
      absentDays++;
      continue;
    }

    // ✅ Attendance
    const a = attendanceMap.get(date);
    if (a && a.status !== "Absent") {
      paidDays++;
    } else {
      absentDays++;
    }
  }

  /* =========================
     CALCULATION
  ========================= */
  const workingDays = paidDays + absentDays;
  const perDay = workingDays > 0 ? salary.baseSalary / workingDays : 0;

  const deduction = Math.round(absentDays * perDay);
  const finalSalary = Math.max(
    0,
    Math.round(salary.baseSalary - deduction)
  );

  /* =========================
     SAVE
  ========================= */
  salary.totalWorkingDays = workingDays;
  salary.paidDays = paidDays;
  salary.absentDays = absentDays;
  salary.deduction = deduction;
  salary.finalSalary = finalSalary;

  salary.lastRecalculatedBy = updatedBy;
  salary.lastRecalculatedAt = new Date();

  await salary.save();
}
