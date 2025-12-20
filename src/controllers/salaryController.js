import Salary from "../models/Salary.js";
import Attendance from "../models/Attendance.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";

/* =========================
   EMPLOYEE: CURRENT MONTH
========================= */
export const getMySalary = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const month = req.query.month; // YYYY-MM

    const salary = await Salary.findOne({ employeeId, month });

    if (!salary) {
      return res.status(200).json(null); // frontend fallback works
    }

    res.json(salary);
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
   ADMIN: CREATE / UPDATE
========================= */
export const createOrUpdateSalary = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);

    const {
      employeeId,
      month,
      baseSalary,
    } = req.body;

    // 🔥 Attendance-based calculation
    const attendance = await Attendance.find({
      employeeId,
      adminId,
      date: { $regex: `^${month}` },
    });

    const totalWorkingDays = attendance.length;
    let paidDays = 0;
    let absentDays = 0;

    attendance.forEach((a) => {
      if (a.status?.includes("PAID")) paidDays++;
      else if (a.status === "Absent") absentDays++;
      else paidDays++;
    });

    const perDay = baseSalary / totalWorkingDays;
    const deduction = absentDays * perDay;
    const finalSalary = Math.round(baseSalary - deduction);

    const salary = await Salary.findOneAndUpdate(
      { employeeId, month },
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
        generatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    res.json({ ok: true, salary });
  } catch (err) {
    console.error(err);
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
