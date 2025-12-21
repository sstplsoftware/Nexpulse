// C:\NexPulse\backend\src\controllers\attendanceController.js

import Attendance from "../models/Attendance.js";
import AttendanceSettings from "../models/AttendanceSettings.js";
import Holiday from "../models/Holiday.js";
import Leave from "../models/Leave.js";
import User from "../models/User.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";
import { getDistanceMeters } from "../utils/distance.js";

/* =========================================================
   INTERNAL HELPERS
========================================================= */

// YYYY-MM-DD
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

// YYYY-MM
function monthKey(d) {
  return d.toISOString().slice(0, 7);
}

function getAllDatesOfMonth(month) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const arr = [];
  for (let i = 1; i <= days; i++) {
    arr.push(`${month}-${String(i).padStart(2, "0")}`);
  }
  return arr;
}
function isSunday(dateStr) {
  const d = new Date(dateStr);
  return d.getDay() === 0; // Sunday
}


/* =========================================================
   CORE RESOLVER (SINGLE SOURCE OF TRUTH)
========================================================= */

export async function resolveMonthlyAttendance({
  employeeId,
  adminId,
  month,
}) {
  const dates = getAllDatesOfMonth(month);

  const [attendance, holidays, leaves, employee] = await Promise.all([
    Attendance.find({
      employeeId,
      adminId,
      date: { $regex: `^${month}` },
    }).lean(),

    Holiday.find({
      adminId,
      date: { $regex: `^${month}` },
    }).lean(),

    Leave.find({
      employeeId,
      adminId,
      status: "APPROVED",
      $or: [
        { fromDate: { $regex: `^${month}` } },
        { toDate: { $regex: `^${month}` } },
      ],
    }).lean(),

    User.findById(employeeId).select("profile employeeId"),
  ]);

  const attendanceMap = new Map(attendance.map((a) => [a.date, a]));
  const holidaySet = new Set(holidays.map((h) => h.date));

  const leaveMap = new Map();
  leaves.forEach((l) => {
    let d = new Date(l.fromDate);
    const end = new Date(l.toDate);
    while (d <= end) {
      leaveMap.set(formatDate(d), l);
      d.setDate(d.getDate() + 1);
    }
  });

  return dates.map((date) => {
    // 1️⃣ Holiday
    if (holidaySet.has(date)) {
      return {
        date,
        status: "Holiday",
        isWorkingDay: false,
        employee,
      };
    }

    // 2️⃣ Leave
    const leave = leaveMap.get(date);
    if (leave) {
      return {
        date,
        status: leave.isPaid ? "Paid Leave" : "Absent",
        isWorkingDay: true,
        employee,
        source: "LEAVE",
      };
    }

    // 3️⃣ Attendance punch
    // 3️⃣ Attendance punch (WITH HALF DAY LOGIC)
const a = attendanceMap.get(date);
if (a) {
  let status = a.status || "Present";

  if (a.clockIn && a.clockOut && settings?.halfDayTime) {
    const out = a.clockOut;        // "13:05"
    const half = settings.halfDayTime; // "13:00"
    const end = settings.officeEnd;    // "17:30"

    if (out < half) {
      status = "Half Day (First Half)";
    } else if (out < end) {
      status = "Half Day (Second Half)";
    } else {
      status = "Present";
    }
  }

  return {
    ...a,
    status,
    isWorkingDay: true,
    halfDay:
      status.startsWith("Half Day") ? true : false,
    employee,
    source: "PUNCH",
  };
}

    // 🔥 SUNDAY CHECK (ADD THIS HERE)
const sunday = isSunday(date);

// 4️⃣ Sunday (NON-WORKING DAY)
if (sunday) {
  return {
    date,
    status: "Sunday",
    isWorkingDay: false,
    employee,
    source: "SYSTEM",
  };
}

// 5️⃣ Default absent (ONLY WORKING DAYS)
return {
  date,
  status: "Absent",
  isWorkingDay: true,
  employee,
  source: "SYSTEM",
};
  });
}

/* =========================================================
   SETTINGS
========================================================= */

export async function saveSettings(req, res) {
  const adminId = resolveAdminId(req.user);

  const settings = await AttendanceSettings.findOneAndUpdate(
    { adminId },
    { ...req.body, adminId },
    { upsert: true, new: true }
  );

  res.json(settings);
}

export async function getSettings(req, res) {
  const adminId = resolveAdminId(req.user);
  const settings = await AttendanceSettings.findOne({ adminId });
  res.json(settings);
}

/* =========================================================
   MARK ATTENDANCE (EMPLOYEE)
========================================================= */

export async function markAttendance(req, res) {
  const user = req.user;
  const adminId = resolveAdminId(user);
  const { status, lat, lng } = req.body;

  const today = formatDate(new Date());

  let record = await Attendance.findOne({
    employeeId: user._id,
    adminId,
    date: today,
  });

  if (!record) {
    record = new Attendance({
      employeeId: user._id,
      adminId,
      date: today,
    });
  }

  if (status === "IN") {
    record.clockIn = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    record.latIn = lat;
    record.lngIn = lng;
    record.status = "Present";
  }

  if (status === "OUT") {
    record.clockOut = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    record.latOut = lat;
    record.lngOut = lng;
  }

  await record.save();
  res.json({ ok: true });
}

/* =========================================================
   TODAY ATTENDANCE
========================================================= */

export async function getTodayAttendance(req, res) {
  const adminId = resolveAdminId(req.user);
  const today = formatDate(new Date());

  const a = await Attendance.findOne({
    employeeId: req.user._id,
    adminId,
    date: today,
  });

  res.json(a || null);
}

/* =========================================================
   EMPLOYEE MONTH VIEW
========================================================= */

export async function getMyMonthlyAttendance(req, res) {
  const adminId = resolveAdminId(req.user);
  const month = req.query.month || monthKey(new Date());

  const rows = await resolveMonthlyAttendance({
    employeeId: req.user._id,
    adminId,
    month,
  });

  res.json({ rows });
}

/* =========================================================
   ADMIN – SINGLE EMPLOYEE (MAIN FIX)
========================================================= */

export async function getManageAttendanceFiltered(req, res) {
  const adminId = resolveAdminId(req.user);
  const { employeeId, month } = req.query;

  if (!employeeId || !month) {
    return res.status(400).json({ message: "employeeId & month required" });
  }

  const rows = await resolveMonthlyAttendance({
    employeeId,
    adminId,
    month,
  });

  res.json({ rows });
}

/* =========================================================
   ADMIN – EMPLOYEE LIST
========================================================= */

export async function getManageEmployeesAll(req, res) {
  const adminId = resolveAdminId(req.user);

  const employees = await User.find({
    createdBy: adminId,
    role: "EMPLOYEE",
  }).select("_id profile employeeId");

  res.json({ employees });
}

/* =========================================================
   ADMIN – UPDATE / DELETE (SAFE)
========================================================= */

export async function updateAttendance(req, res) {
  const { id } = req.params;

  const allowed = ["Present", "Late", "Half Day", "Absent", "On Time"];

  if (req.body.status && !allowed.includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  await Attendance.findByIdAndUpdate(id, req.body);
  res.json({ ok: true });
}

export async function deleteAttendance(req, res) {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}
// 🔥 THIS IS WHAT WAS MISSING
export async function getManageAttendance(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { employeeId, month } = req.query;

    const filter = { adminId };

    if (employeeId) filter.employeeId = employeeId;
    if (month) filter.date = { $regex: `^${month}` };

    const rows = await Attendance.find(filter)
      .populate("employeeId", "profile.name employeeId")
      .sort({ date: -1 });

    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load manage attendance" });
  }
}