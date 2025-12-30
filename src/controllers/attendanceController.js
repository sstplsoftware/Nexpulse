// C:\NexPulse\backend\src\controllers\attendanceController.js

import Attendance from "../models/Attendance.js";
import AttendanceSettings from "../models/AttendanceSettings.js";
import Holiday from "../models/Holiday.js";
import Leave from "../models/Leave.js";
import User from "../models/User.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";
import { getDistanceMeters } from "../utils/distance.js";
import { formatISTDate, formatISTTime } from "../utils/istDate.js";


/* =========================================================
   INTERNAL HELPERS
========================================================= */

// YYYY-MM-DD
function formatDate(d) {
   return formatISTDate(d);
}

function monthKey(d = new Date()) {
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}`;
}


function getAllDatesOfMonth(month) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0, 12).getDate(); // noon = safe
  const arr = [];
  for (let i = 1; i <= days; i++) {
    arr.push(`${month}-${String(i).padStart(2, "0")}`);
  }
  return arr;
}

function isSunday(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay() === 0;
}

function isSaturday(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay() === 6;
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isInsideAnyZone({ lat, lng, zones = [] }) {
  if (!zones.length) return true; // 🔥 no zones = no restriction

  return zones.some((z) => {
    const distance = getDistanceMeters(
      lat,
      lng,
      z.lat,
      z.lng
    );

    return distance <= (z.radius || 100);
  });
}
function calculateTotalHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return "--";

  const inMin = timeToMinutes(clockIn);
  const outMin = timeToMinutes(clockOut);

  if (outMin <= inMin) return "--";

  const diff = outMin - inMin;
  const h = Math.floor(diff / 60);
  const m = diff % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

  // 🔥 LOAD SETTINGS (WAS MISSING → CAUSED 500 ERROR)
  const settings = await AttendanceSettings.findOne({ adminId }).lean();

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
    let d = new Date(`${l.fromDate}T12:00:00`);
const end = new Date(`${l.toDate}T12:00:00`);
    while (d <= end) {
      leaveMap.set(formatDate(d), l);
      d.setDate(d.getDate() + 1);
    }
  });
// 🔥 Monthly late counter (RESET PER MONTH)
let lateCount = 0;

  return dates.map((date) => {
    const sunday = isSunday(date);
const saturday = isSaturday(date);

/* 0️⃣ SUNDAY (ALWAYS NON-WORKING) */
if (sunday) {
  return {
    date,
    status: "Sunday",
    isWorkingDay: false,
    employee,
    source: "SYSTEM",
  };
}

/* 0️⃣ SATURDAY (OPTIONAL WORKING) */
if (saturday && settings?.saturdayWorking === false) {
  return {
    date,
    status: "Saturday Off",
    isWorkingDay: false,
    employee,
    source: "SYSTEM",
  };
}

    /* ============================
       1️⃣ HOLIDAY
    ============================ */
    if (holidaySet.has(date)) {
      return {
        date,
        status: "Holiday",
        isWorkingDay: false,
        employee,
        source: "HOLIDAY",
      };
    }

    /* ============================
       2️⃣ LEAVE
    ============================ */
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

   /* ============================
   3️⃣ ATTENDANCE PUNCH
============================ */
const a = attendanceMap.get(date);
if (a) {
  let status = "Present";
  let halfDay = false;

  const inMin = a.clockIn ? timeToMinutes(a.clockIn) : null;
  const outMin = a.clockOut ? timeToMinutes(a.clockOut) : null;

  const officeStartMin = settings?.officeStart
  ? timeToMinutes(settings.officeStart)
  : null;

const officeEndMin = settings?.officeEnd
  ? timeToMinutes(settings.officeEnd)
  : null;

const halfDayMin = settings?.halfDayTime
  ? timeToMinutes(settings.halfDayTime)
  : null;

  const lateMarginMin = settings?.lateMarginMinutes || 0;

  /* ==========================
     HALF DAY (TIME BASED)
  ========================== */
  if (
    settings?.halfDayDeduction === true &&
    outMin !== null &&
    halfDayMin &&
    officeEndMin
  ) {
    if (outMin < halfDayMin) {
      status = "Half Day (First Half)";
      halfDay = true;
    } else if (outMin < officeEndMin) {
      status = "Half Day (Second Half)";
      halfDay = true;
    }
  }

 /* ==========================
   🔥 LATE + AUTO HALF-DAY
========================== */
if (
  !halfDay &&
  inMin !== null &&
  officeStartMin !== null &&
  inMin > officeStartMin + lateMarginMin
) {
  lateCount += 1;

  // 🟡 Grace late days (still marked Late, no penalty)
  if (lateCount <= (settings?.graceLateDays || 0)) {
    status = "Late";
  }
  // 🟠 Auto Half-Day after limit
  else if (
    settings?.lateToHalfDayAfter &&
    lateCount >= settings.lateToHalfDayAfter
  ) {
    status = "Half Day (Auto Late)";
    halfDay = true;
  }
  // 🟡 Normal late
  else {
    status = "Late";
  }
}

  return {
    ...a,
    status,
    isWorkingDay: true,
    halfDay,
    employee,
    source: "PUNCH",
    lateCount, // optional (useful for UI)
  };
}


/* ============================
   4️⃣ DEFAULT ABSENT (WORKING DAY)
============================ */
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
  try {
    const user = req.user;
    const adminId = resolveAdminId(user);
    const { status, lat, lng } = req.body;

    /* ================= VALIDATION ================= */
    if (!status || !["IN", "OUT"].includes(status)) {
      return res.status(400).json({ message: "Invalid attendance status" });
    }

    if (lat == null || lng == null) {
      return res.status(400).json({
        message: "Location permission required",
      });
    }

    /* ================= LOAD SETTINGS ================= */
    const settings = await AttendanceSettings.findOne({ adminId }).lean();
    if (!settings) {
      return res.status(400).json({
        message: "Attendance settings not configured by admin",
      });
    }

    /* ================= WFH / ZONE POLICY ================= */
    const employee = await User.findById(user._id).select("attendancePolicy");

if (employee?.attendancePolicy !== "ANYWHERE") {
  const allowed = isInsideAnyZone({
    lat,
    lng,
    zones: settings.zones || [],
  });

  if (!allowed) {
    return res.status(403).json({
      message: "You are outside the allowed office location",
    });
  }
}

    /* ================= DATE ================= */
    const today = formatISTDate();

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
    totalHours: "--",
  });
}

    /* ================= PUNCH LOGIC ================= */
    if (status === "IN") {
      if (record.clockIn) {
        return res.status(400).json({
          message: "Already punched in for today",
        });
      }

      record.clockIn = formatISTTime();
      record.latIn = lat;
      record.lngIn = lng;
      record.status = "Present";
    }

    if (status === "OUT") {
  if (!record.clockIn) {
    return res.status(400).json({
      message: "Punch-in required before punch-out",
    });
  }

  const outTime = formatISTTime();

  // ⛔ BLOCK instant punch-out (same minute)
  const inMin = timeToMinutes(record.clockIn);
  const outMin = timeToMinutes(outTime);

  if (outMin <= inMin) {
    return res.status(400).json({
      message: "Punch-out too soon. Minimum working time required.",
    });
  }

  record.clockOut = outTime;
  record.latOut = lat;
  record.lngOut = lng;

  record.totalHours = calculateTotalHours(
    record.clockIn,
    outTime
  );
}



    await record.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error("markAttendance error:", err);
    return res.status(500).json({
      message: "Failed to mark attendance",
    });
  }
}

/* =========================================================
   TODAY ATTENDANCE
========================================================= */

export async function getTodayAttendance(req, res) {
  const adminId = resolveAdminId(req.user);
  const today = formatISTDate();

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
  try {
    const adminId = resolveAdminId(req.user);
    const month = req.query.month || monthKey(new Date());

    const rows = await resolveMonthlyAttendance({
      employeeId: req.user._id,
      adminId,
      month,
    });

    return res.json({ rows });
  } catch (err) {
    console.error("getMyMonthlyAttendance error:", err);
    return res.status(500).json({ message: "Failed to load attendance" });
  }
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
  try {
    const adminId = resolveAdminId(req.user);

    console.log("🔍 WFH EMPLOYEE LIST");
    console.log("USER:", req.user._id, req.user.role);
    console.log("ADMIN ID:", adminId);

    const employees = await User.find({
      role: { $in: ["EMPLOYEE", "employee"] },
      $or: [
        { createdBy: adminId },
        { createdBy: { $exists: false } },
        { createdBy: null },
      ],
    }).select("_id profile employeeId attendancePolicy");

    console.log("EMP COUNT:", employees.length);

    res.json({ employees });
  } catch (err) {
    console.error("getManageEmployeesAll error:", err);
    res.status(500).json({ message: "Failed to load employees" });
  }
}

/* =========================================================
   ADMIN – UPDATE / DELETE (SAFE)
========================================================= */

export async function updateAttendance(req, res) {
  const { id } = req.params;

 const allowed = [
  "Present",
  "Late",
  "Absent",
  "On Time",
  "Half Day (First Half)",
  "Half Day (Second Half)",
  "Half Day (Auto Late)",
];


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
//Work from home attendance controller functions can be added below
export async function updateEmployeeAttendancePolicy(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { employeeId, attendancePolicy } = req.body;

    if (!employeeId || !attendancePolicy) {
      return res.status(400).json({ message: "employeeId and attendancePolicy required" });
    }

    // ✅ only employees under this admin (or legacy)
    const emp = await User.findOne({
      _id: employeeId,
      role: "EMPLOYEE",
      $or: [{ createdBy: adminId }, { createdBy: { $exists: false } }, { createdBy: null }],
    });

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    emp.attendancePolicy = attendancePolicy; // "ANYWHERE" | "OFFICE_ONLY"
    await emp.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("updateEmployeeAttendancePolicy:", err);
    res.status(500).json({ message: "Server error" });
  }
}