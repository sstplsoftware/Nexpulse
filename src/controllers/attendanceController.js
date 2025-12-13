import AttendanceSettings from "../models/AttendanceSettings.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { getDistanceMeters } from "../utils/distance.js";

// Format time (HH:mm → Date object)
function timeToMinutes(t) {
  if (!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
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


// Format current time (HH:MM AM/PM)
function getNowString() {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
}


// Format date YYYY-MM-DD
function getTodayKey() {
  const d = new Date();
  return d.toISOString().split("T")[0];
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
    if (!settings) {
      settings = new AttendanceSettings({ adminId });
    }

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
    res.status(500).json({ message: "Failed to save settings", error: err });
  }
};


// ===============================
// GET SETTINGS (ADMIN OR EMPLOYEE)
// ===============================
export const getSettings = async (req, res) => {
  try {
    let adminId;

    // Employee → use createdBy
    if (req.user.role === "EMPLOYEE") {
      adminId = req.user.createdBy;
    } else {
      adminId = req.user._id;
    }

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
// GET TODAY SUMMARY
// ===============================
export const getTodayAttendance = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE")
      return res.status(403).json({ message: "EMPLOYEE only" });

    const employeeId = req.user._id;
    const adminId = req.user.createdBy;
    const today = getTodayKey();

    let record = await Attendance.findOne({ employeeId, adminId, date: today });

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

    const employeeId = req.user._id;
    const adminId = req.user.createdBy;

    const settings = await AttendanceSettings.findOne({ adminId });
    if (!settings)
      return res.status(400).json({ message: "Attendance settings missing" });

    // CHECK GEOFENCE
    let inside = false;
    for (let z of settings.zones) {
      const d = getDistanceMeters(lat, lng, z.lat, z.lng);
      if (d <= z.radius) inside = true;
    }

    if (!inside)
      return res.status(403).json({ message: "Outside allowed attendance area" });

    const now = getNowString();
    const today = getTodayKey();

    let record = await Attendance.findOne({
      employeeId,
      adminId,
      date: today,
    });

    // MARK IN
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

      if (!record) {
        record = new Attendance({
          employeeId,
          adminId,
          date: today,
        });
      }

      record.clockIn = now;
      record.latIn = lat;
      record.lngIn = lng;
      record.status = finalStatus;

      await record.save();
      return res.json({ message: "Clocked In", time: now, status: finalStatus });
    }

    // MARK OUT
if (status === "OUT") {
  if (!record?.clockIn)
    return res.status(400).json({ message: "Cannot mark OUT before IN" });

  if (record.clockOut)
    return res.status(400).json({ message: "Already marked OUT today" });

  record.clockOut = now;
  record.latOut = lat;
  record.lngOut = lng;

  // Compute total hours (no Invalid Date / NaN)
  const inMin = parseTimeStringToMinutes(record.clockIn);
  const outMin = parseTimeStringToMinutes(now);

  if (inMin == null || outMin == null || outMin < inMin) {
    record.totalHours = "--";
  } else {
    const diffMin = outMin - inMin;
    const hrs = Math.floor(diffMin / 60);
    const min = diffMin % 60;
    record.totalHours = `${hrs}h ${min}m`;
  }

  await record.save();
  return res.json({ message: "Clocked Out", time: now, total: record.totalHours });
}

    res.status(400).json({ message: "Invalid status" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
};

// ===============================
// ADMIN: GET ATTENDANCE MANAGE LIST
// ===============================
export const getManageAttendance = async (req, res) => {
  try {
    const adminId =
      req.user.role === "EMPLOYEE"
        ? req.user.createdBy
        : req.user._id;

    const records = await Attendance.find({ adminId })
      .populate({
        path: "employeeId",
        select: "profile.name employeeId",
      })
      .sort({ date: -1 });

    res.json(
      records.map((r) => ({
        _id: r._id,
        employeeName: r.employeeId?.profile?.name,
        employeeCode: r.employeeId?.employeeId,
        date: r.date,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        totalHours: r.totalHours,
        status: r.status,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load attendance records" });
  }
};

// ===============================
// ADMIN: EMPLOYEES WHO MARKED ATTENDANCE
// ===============================
export const getAttendanceEmployees = async (req, res) => {
  try {
    const adminId =
      req.user.role === "EMPLOYEE"
        ? req.user.createdBy
        : req.user._id;

    // get unique employeeIds from attendance
    const employees = await Attendance.aggregate([
      { $match: { adminId } },
      {
        $group: {
          _id: "$employeeId",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          name: "$user.profile.name",
          employeeId: "$user.employeeId",
        },
      },
    ]);

    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load attendance employees" });
  }
};

// ===============================
// ADMIN: EDIT ATTENDANCE
// ===============================
export const updateAttendance = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "ADMIN only" });

    const { id } = req.params;
    const { clockIn, clockOut, status } = req.body;

    const record = await Attendance.findById(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    if (clockIn) record.clockIn = clockIn;
    if (clockOut) record.clockOut = clockOut;
    if (status) record.status = status;

    // Recalculate hours safely
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
// ===============================
// ADMIN: DELETE ATTENDANCE
// ===============================
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
