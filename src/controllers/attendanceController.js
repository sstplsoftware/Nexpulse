import AttendanceSettings from "../models/AttendanceSettings.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { getDistanceMeters } from "../utils/distance.js";

/* ===============================
   TIME HELPERS
================================ */

// "09:30" → minutes
function timeToMinutes(t) {
  if (!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// "04:02 PM" → minutes
function parseTimeStringToMinutes(str) {
  if (!str) return null;

  const match = str.match(/(\d{1,2}):(\d{2})\s*([APap][Mm])?/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase() || null;

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

// IST time string
function getNowString() {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// IST date YYYY-MM-DD
function getTodayKey() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return now.toISOString().slice(0, 10);
}

// Resolve admin for employee/admin
function resolveAdminId(user) {
  return user.role === "EMPLOYEE" ? user.createdBy : user._id;
}

// Permission check
function canManageAttendance(user) {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  if (user.role === "EMPLOYEE" && user.permissions?.ATTENDANCE_MANAGE) return true;
  return false;
}

/* ===============================
   SETTINGS
================================ */

export const saveSettings = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "Only ADMIN allowed" });

    const adminId = req.user._id;
    const { officeSettings, zones } = req.body;

    let settings =
      (await AttendanceSettings.findOne({ adminId })) ||
      new AttendanceSettings({ adminId });

    settings.officeStart = officeSettings.officeStart;
    settings.officeEnd = officeSettings.officeEnd;
    settings.halfDayTime = officeSettings.halfDayTime;
    settings.lateMarginMinutes = officeSettings.lateMarginMinutes ?? 15;
    settings.lateMarginDays = officeSettings.lateMarginDays ?? 0;

    settings.zones = zones?.map(z => ({
      name: z.name || "",
      lat: Number(z.lat),
      lng: Number(z.lng),
      radius: Number(z.radius) || 100,
    }));

    await settings.save();
    res.json({ ok: true, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save settings" });
  }
};

export const getSettings = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    const settings = await AttendanceSettings.findOne({ adminId });
    res.json(settings || null);
  } catch (err) {
    res.status(500).json({ message: "Failed to load settings" });
  }
};

/* ===============================
   EMPLOYEE TODAY VIEW
================================ */

export const getTodayAttendance = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE")
      return res.status(403).json({ message: "EMPLOYEE only" });

    const today = getTodayKey();
    const record = await Attendance.findOne({
      employeeId: req.user._id,
      adminId: req.user.createdBy,
      date: today,
    });

    res.json(
      record || {
        date: today,
        clockIn: "--",
        clockOut: "--",
        totalHours: "--",
        status: "Absent",
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to get attendance" });
  }
};

/* ===============================
   MARK ATTENDANCE
================================ */

export const markAttendance = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE")
      return res.status(403).json({ message: "EMPLOYEE only" });

    const { status, lat, lng } = req.body;
    const adminId = req.user.createdBy;
    const today = getTodayKey();
    const now = getNowString();

    const settings = await AttendanceSettings.findOne({ adminId });
    if (!settings)
      return res.status(400).json({ message: "Attendance settings missing" });

    // GEO CHECK
    let inside = settings.zones.some(
      z => getDistanceMeters(lat, lng, z.lat, z.lng) <= z.radius
    );
    if (!inside)
      return res.status(403).json({ message: "Outside allowed area" });

    let record = await Attendance.findOne({
      employeeId: req.user._id,
      adminId,
      date: today,
    });

    /* ===== IN ===== */
    if (status === "IN") {
      if (record?.clockIn)
        return res.status(400).json({ message: "Already clocked in" });

      const inMin = parseTimeStringToMinutes(now);
      const officeStart = timeToMinutes(settings.officeStart);
      const halfDay = timeToMinutes(settings.halfDayTime);

      let finalStatus = "On Time";
      if (inMin > officeStart + settings.lateMarginMinutes) finalStatus = "Late";
      if (inMin > halfDay) finalStatus = "Half Day";

      record =
        record ||
        new Attendance({
          employeeId: req.user._id,
          adminId,
          date: today,
        });

      record.clockIn = now;
      record.latIn = lat;
      record.lngIn = lng;
      record.status = finalStatus;

      await record.save();
      return res.json({ message: "Clocked In", time: now, status: finalStatus });
    }

    /* ===== OUT ===== */
    if (status === "OUT") {
      if (!record?.clockIn)
        return res.status(400).json({ message: "Cannot OUT before IN" });

      if (record.clockOut)
        return res.status(400).json({ message: "Already clocked out" });

      const inMin = parseTimeStringToMinutes(record.clockIn);
      const outMin = parseTimeStringToMinutes(now);

      if (outMin <= inMin)
        return res.status(400).json({ message: "Invalid OUT time" });

      const diff = outMin - inMin;
      record.clockOut = now;
      record.latOut = lat;
      record.lngOut = lng;
      record.totalHours = `${Math.floor(diff / 60)}h ${diff % 60}m`;

      if (["On Time", "Late"].includes(record.status))
        record.status = "Present";

      await record.save();
      return res.json({
        message: "Clocked Out",
        time: now,
        totalHours: record.totalHours,
        status: record.status,
      });
    }

    res.status(400).json({ message: "Invalid status" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
};

/* ===============================
   ADMIN: FULL MONTH VIEW
================================ */

export const getManageAttendanceAllEmployees = async (req, res) => {
  try {
    if (!canManageAttendance(req.user))
      return res.status(403).json({ message: "Not allowed" });

    const adminId = resolveAdminId(req.user);
    const month = req.query.month || getTodayKey().slice(0, 7);

    const employees = await User.find({
      role: "EMPLOYEE",
      createdBy: adminId,
    }).lean();

    const attendance = await Attendance.find({
      adminId,
      date: { $regex: `^${month}` },
    }).lean();

    const map = new Map();
    attendance.forEach(a => map.set(`${a.employeeId}-${a.date}`, a));

    const [y, m] = month.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();

    const rows = [];
    for (const emp of employees) {
      for (let d = 1; d <= days; d++) {
        const date = `${month}-${String(d).padStart(2, "0")}`;
        const a = map.get(`${emp._id}-${date}`);

        rows.push({
          employee: emp,
          date,
          clockIn: a?.clockIn || "--",
          clockOut: a?.clockOut || "--",
          totalHours: a?.totalHours || "--",
          status: a?.status || "Absent",
        });
      }
    }

    res.json({ ok: true, month, rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to load attendance" });
  }
};
