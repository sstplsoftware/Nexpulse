import Attendance from "../models/Attendance.js";
import Salary from "../models/Salary.js";

export async function recalculateSalaryForEmployee({
  employeeId,
  adminId,
  month,
  updatedBy,
}) {
  const salary = await Salary.findOne({ employeeId, adminId, month });

  // 🔒 Paid salary is locked
  if (!salary || salary.status === "PAID") return;

  const attendance = await Attendance.find({
    employeeId,
    adminId,
    date: { $regex: `^${month}` },
  }).lean();

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  let absentDays = 0;
  let paidDays = 0;

  attendance.forEach((a) => {
    if (a.status === "Absent") absentDays++;
    else paidDays++;
  });

  const perDay = salary.baseSalary / daysInMonth;
  const deduction = Math.round(absentDays * perDay);

  salary.totalWorkingDays = daysInMonth;
  salary.absentDays = absentDays;
  salary.paidDays = paidDays;
  salary.deduction = deduction;
  salary.finalSalary = Math.max(
    0,
    Math.round(salary.baseSalary - deduction)
  );

  salary.lastRecalculatedBy = updatedBy;
  salary.lastRecalculatedAt = new Date();

  await salary.save();
}
