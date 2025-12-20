import Salary from "../models/Salary.js";
import Attendance from "../models/Attendance.js";

export async function recalculateSalaryForEmployee({
  employeeId,
  adminId,
  month,
  updatedBy,
}) {
  const salary = await Salary.findOne({ employeeId, month, adminId });

  // 🔒 Do not touch PAID salary
  if (!salary || salary.status === "PAID") return;

  const attendance = await Attendance.find({
    employeeId,
    adminId,
    date: { $regex: `^${month}` },
  }).lean();

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();

  let absentDays = 0;
  let paidDays = 0;

  attendance.forEach((a) => {
    if (a.status === "Absent") absentDays++;
    else paidDays++;
  });

  const perDay = salary.baseSalary / daysInMonth;
  const deduction = Math.round(absentDays * perDay);
  const finalSalary = Math.max(
    0,
    Math.round(salary.baseSalary - deduction)
  );

  salary.absentDays = absentDays;
  salary.paidDays = paidDays;
  salary.totalWorkingDays = daysInMonth;
  salary.deduction = deduction;
  salary.finalSalary = finalSalary;

  // 🧾 audit hook
  salary.lastRecalculatedBy = updatedBy;
  salary.lastRecalculatedAt = new Date();

  await salary.save();
}
