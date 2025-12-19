import AttendanceSettings from "../models/AttendanceSettings.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { getDistanceMeters } from "../utils/distance.js";
import Holiday from "../models/Holiday.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";


// Format time (HH:mm → minutes)
function timeToMinutes(t) {
  if (!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isSunday(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

async function getHolidayMap(adminId, month) {
  const holidays = await Holiday.find({
    adminId,
    date: { $regex: `^${month}` },
  }).lean();

  const map = new Map();
  holidays.forEach((h) => map.set(h.date, h));
  return map;
}

function parseTimeStringToMinutes(str) {
  if (!str) return null;

  const match = str.match(/(\d{1,2}):(\d{2})\s*([APap][Mm])?/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm) {
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
  }

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return hour * 60 + minute;
}


function canManageAttendance(user) {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  if (user.role === "EMPLOYEE" && user.permissions?.ATTENDANCE_MANAGE)
    return true;
  return false;
}

function getNowString() {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayKey() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return now.toISOString().slice(0, 10);
}
// ===============================
// SAVE ADMIN ATTENDANCE SETTINGS
// ===============================
export const saveSettings = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "Only ADMIN can set attendance settings" });

    const adminId = req.user._id;
    const { officeSettings, zones } = req.body;

    if (!officeSettings) {
      return res.status(400).json({ message: "officeSettings is required" });
    }

    let settings = await AttendanceSettings.findOne({ adminId });
    if (!settings) settings = new AttendanceSettings({ adminId });

    settings.officeStart = officeSettings.officeStart;
    settings.officeEnd = officeSettings.officeEnd;
    settings.halfDayTime = officeSettings.halfDayTime;
    settings.lateMarginMinutes = officeSettings.lateMarginMinutes ?? 15;
    settings.lateMarginDays = officeSettings.lateMarginDays ?? 0;

    settings.zones = zones?.map((z) => ({
      name: z.name || "",
      lat: Number(z.lat) || 0,
      lng: Number(z.lng) || 0,
      radius: Number(z.radius) || 100,
    }));

    await settings.save();
    res.json({ message: "Attendance settings saved", settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save settings" });
  }
};

// ===============================
// GET SETTINGS
// ===============================
export const getSettings = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);

    const settings = await AttendanceSettings.findOne({ adminId });

    if (!settings)
      return res.json({ message: "No settings found", settings: null });

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load settings" });
  }
};

// ===============================
// GET TODAY SUMMARY ✅ FIXED
// ===============================
export const getTodayAttendance = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE")
      return res.status(403).json({ message: "EMPLOYEE only" });

    const employeeId = req.user._id;
    const adminId = resolveAdminId(req.user);
    const today = getTodayKey();
    const month = today.slice(0, 7);

    const holidayMap = await getHolidayMap(adminId, month);

    if (isSunday(today)) {
      return res.status(400).json({
        message: "Attendance not allowed on Sunday (Week Off)",
      });
    }

    if (holidayMap.has(today)) {
      return res.status(400).json({
        message: "Attendance not allowed on Holiday",
      });
    }

    const record = await Attendance.findOne({ employeeId, adminId, date: today });

    if (!record) {
      return res.json({
        date: today,
        clockIn: "--",
        clockOut: "--",
        totalHours: "--",
        status: "Absent",
      });
    }

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get attendance" });
  }
};
// ===============================
// MARK IN / OUT
// ===============================
export const markAttendance = async (req, res) => {
  try {
    const { status, lat, lng } = req.body;

    if (req.user.role !== "EMPLOYEE")
      return res.status(403).json({ message: "EMPLOYEE only" });
    const today = getTodayKey();
const adminId = resolveAdminId(req.user);

if (isSunday(today)) {
  return res.status(400).json({
    message: "Attendance not allowed on Sunday (Week Off)",
  });
}

const holidayExists = await Holiday.exists({
  adminId,
  date: today,
});

if (holidayExists) {
  return res.status(400).json({
    message: "Attendance not allowed on Holiday",
  });
}

    const employeeId = req.user._id;
    const settings = await AttendanceSettings.findOne({ adminId });
    if (!settings)
      return res.status(400).json({ message: "Attendance settings missing" });

    let inside = false;
    for (const z of settings.zones) {
      const d = getDistanceMeters(lat, lng, z.lat, z.lng);
      if (d <= z.radius) inside = true;
    }

    if (!inside)
      return res.status(403).json({ message: "Outside allowed attendance area" });

    const now = getNowString();

    let record = await Attendance.findOne({ employeeId, adminId, date: today });

    if (status === "IN") {
      if (record?.clockIn)
        return res.status(400).json({ message: "Already marked IN today" });

      const clockInMin = parseTimeStringToMinutes(now);
      const officeStartMin = timeToMinutes(settings.officeStart);
      const halfDayMin = timeToMinutes(settings.halfDayTime);

      let finalStatus = "On Time";
      if (clockInMin > officeStartMin + settings.lateMarginMinutes)
        finalStatus = "Late";
      if (clockInMin > halfDayMin) finalStatus = "Half Day";

      if (!record)
        record = new Attendance({ employeeId, adminId, date: today });

      record.clockIn = now;
      record.latIn = lat;
      record.lngIn = lng;
      record.status = finalStatus;

      await record.save();
      return res.json({ message: "Clocked In", time: now, status: finalStatus });
    }

    if (status === "OUT") {
      if (!record?.clockIn)
        return res.status(400).json({ message: "Cannot mark OUT before IN" });

      if (record.clockOut)
        return res.status(400).json({ message: "Already marked OUT today" });

      record.clockOut = now;
      record.latOut = lat;
      record.lngOut = lng;

      const inMin = parseTimeStringToMinutes(record.clockIn);
      const outMin = parseTimeStringToMinutes(now);

      if (inMin != null && outMin != null && outMin >= inMin) {
        const diff = outMin - inMin;
        record.totalHours = `${Math.floor(diff / 60)}h ${diff % 60}m`;
      } else {
        record.totalHours = "--";
      }

      await record.save();
      return res.json({
        message: "Clocked Out",
        time: now,
        total: record.totalHours,
      });
    }

    res.status(400).json({ message: "Invalid status" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
};

// ===============================
// ADMIN: EDIT / DELETE
// ===============================
export const updateAttendance = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "ADMIN only" });

    const { id } = req.params;
    const { clockIn, clockOut, status } = req.body;

    const record = await Attendance.findById(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    if (isSunday(record.date))
      return res.status(400).json({ message: "Cannot edit Sunday" });

    const holidayExists = await Holiday.exists({
      adminId: record.adminId,
      date: record.date,
    });

    if (holidayExists)
      return res.status(400).json({ message: "Cannot edit Holiday" });

    if (clockIn) record.clockIn = clockIn;
    if (clockOut) record.clockOut = clockOut;
    if (status) record.status = status;

    if (record.clockIn && record.clockOut) {
      const inMin = parseTimeStringToMinutes(record.clockIn);
      const outMin = parseTimeStringToMinutes(record.clockOut);
      if (inMin != null && outMin != null && outMin >= inMin) {
        const diff = outMin - inMin;
        record.totalHours = `${Math.floor(diff / 60)}h ${diff % 60}m`;
      }
    }

    await record.save();
    res.json({ message: "Attendance updated", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update attendance" });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "ADMIN only" });

    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: "Attendance deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete attendance" });
  }
};
export const getManageEmployeesAll = async (req, res) => {
  try {
    if (!canManageAttendance(req.user))
      return res.status(403).json({ message: "Not allowed" });

    const adminId = resolveAdminId(req.user);

    const employees = await User.find({
      role: "EMPLOYEE",
      createdBy: adminId,
    })
      .select("profile.name employeeId email department")
      .sort({ "profile.name": 1 });

    res.json({ ok: true, employees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load employees" });
  }
};

export const getManageAttendanceAllEmployees = async (req, res) => {
  try {
    if (!canManageAttendance(req.user))
      return res.status(403).json({ message: "Not allowed" });

    const adminId = resolveAdminId(req.user);
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const employees = await User.find({
      role: "EMPLOYEE",
      createdBy: adminId,
    }).lean();

    const attendance = await Attendance.find({
      adminId,
      date: { $regex: `^${month}` },
    }).lean();

    const attendanceMap = new Map();
    attendance.forEach((a) =>
      attendanceMap.set(`${a.employeeId}-${a.date}`, a)
    );

    const holidayMap = await getHolidayMap(adminId, month);

    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    const rows = [];

    for (const emp of employees) {
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${month}-${String(d).padStart(2, "0")}`;
        const a = attendanceMap.get(`${emp._id}-${date}`);

        let status = "Absent";
        if (isSunday(date)) status = "WEEK OFF";
        else if (holidayMap.has(date)) status = "HOLIDAY";
        else if (a?.status) status = a.status;

        rows.push({
          _id: a?._id || `${emp._id}-${date}`,
          employeeId: emp,
          date,
          clockIn: a?.clockIn || "--",
          clockOut: a?.clockOut || "--",
          totalHours: a?.totalHours || "--",
          status,
        });
      }
    }

    res.json({ ok: true, month, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load attendance" });
  }
};

export const getMyMonthlyAttendance = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE")
      return res.status(403).json({ message: "EMPLOYEE only" });

    const employeeId = req.user._id;
    const adminId = resolveAdminId(req.user);
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const records = await Attendance.find({
      employeeId,
      adminId,
      date: { $regex: `^${month}` },
    }).lean();

    const map = new Map();
    records.forEach((r) => map.set(r.date, r));

    const holidayMap = await getHolidayMap(adminId, month);

    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    const rows = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;

      if (isSunday(date)) {
        rows.push({
          _id: `${employeeId}-${date}`,
          employeeId,
          date,
          clockIn: "--",
          clockOut: "--",
          totalHours: "--",
          status: "WEEK OFF",
        });
        continue;
      }

      if (holidayMap.has(date)) {
        rows.push({
          _id: `${employeeId}-${date}`,
          employeeId,
          date,
          clockIn: "--",
          clockOut: "--",
          totalHours: "--",
          status: "HOLIDAY",
        });
        continue;
      }

      const a = map.get(date);
      rows.push({
        _id: a?._id || `${employeeId}-${date}`,
        employeeId,
        date,
        clockIn: a?.clockIn || "--",
        clockOut: a?.clockOut || "--",
        totalHours: a?.totalHours || "--",
        status: a?.status || "Absent",
      });
    }

    res.json({ ok: true, month, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load my attendance" });
  }
};
