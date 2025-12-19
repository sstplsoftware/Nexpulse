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
      name: holidayName,
      date: holidayDate,
      description: description || "",
    });

    return res.json({ ok: true, holiday });
  } catch (err) {
    console.error("markHoliday error", err);
    return res.status(500).json({ message: err.message });
  }
}

/* ==============================
   LIST HOLIDAYS
============================== */
export async function getHolidays(req, res) {
  try {
    const adminId = resolveAdminId(req.user);

    const holidays = await Holiday.find({ adminId })
      .sort({ date: 1 })
      .lean();

    res.json({ ok: true, holidays });
  } catch (err) {
    console.error("getHolidays error", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ==============================
   DELETE HOLIDAY
============================== */
export async function deleteHoliday(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const deleted = await Holiday.findOneAndDelete({
      _id: id,
      adminId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("deleteHoliday error", err);
    res.status(500).json({ message: "Server error" });
  }
}
