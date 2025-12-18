import Holiday from "../models/Holiday.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";

/* ==============================
   CREATE HOLIDAY
============================== */
export async function markHoliday(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { holidayName, holidayDate, description } = req.body;

    if (!holidayName || !holidayDate) {
      return res.status(400).json({ message: "Name & date required" });
    }

    const exists = await Holiday.findOne({
      adminId,
      date: holidayDate,
    });

    if (exists) {
      return res.status(400).json({ message: "Holiday already exists" });
    }

    const holiday = await Holiday.create({
      adminId,
      date: holidayDate,
      name: holidayName,
      description,
    });

    return res.json({ ok: true, holiday });
  } catch (err) {
    console.error("markHoliday error:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ==============================
   GET HOLIDAYS (VIEW)
============================== */
export async function getHolidays(req, res) {
  try {
    const adminId = resolveAdminId(req.user);

    const holidays = await Holiday.find({ adminId })
      .sort({ date: 1 })
      .lean();

    return res.json({ ok: true, holidays });
  } catch (err) {
    console.error("getHolidays error:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ==============================
   UPDATE HOLIDAY
============================== */
export async function updateHoliday(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { holidayName, holidayDate, description } = req.body;

    const holiday = await Holiday.findOne({
      _id: id,
      adminId,
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    if (holidayName) holiday.name = holidayName;
    if (holidayDate) holiday.date = holidayDate;
    if (description !== undefined) holiday.description = description;

    await holiday.save();

    return res.json({ ok: true, holiday });
  } catch (err) {
    console.error("updateHoliday error:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ==============================
   DELETE HOLIDAY
============================== */
export async function deleteHoliday(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const holiday = await Holiday.findOneAndDelete({
      _id: id,
      adminId,
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteHoliday error:", err.message);
    return res.status(500).json({ message: err.message });
  }
}
