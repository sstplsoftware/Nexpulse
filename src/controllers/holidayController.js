// C:\NexPulse\backend\src\controllers\holidayController.js

import Holiday from "../models/Holiday.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";

/* =====================================================
   GET HOLIDAYS
===================================================== */
export async function getHolidays(req, res) {
  try {
    const adminId = resolveAdminId(req.user);

    const rows = await Holiday.find({ adminId })
      .sort({ date: 1 })
      .lean();

    return res.json({ holidays: rows });
  } catch (err) {
    console.error("getHolidays error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =====================================================
   MARK HOLIDAY
===================================================== */
export async function markHoliday(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { date, name, description } = req.body;

    if (!date || !name) {
      return res.status(400).json({ message: "Date & name required" });
    }

    const exists = await Holiday.findOne({ adminId, date });
    if (exists) {
      return res.status(400).json({ message: "Holiday already exists" });
    }

    const h = await Holiday.create({
      adminId,
      date,
      name,
      description,
    });

    return res.json({ ok: true, holiday: h });
  } catch (err) {
    console.error("markHoliday error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =====================================================
   DELETE HOLIDAY
===================================================== */
export async function deleteHoliday(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    await Holiday.deleteOne({ _id: id, adminId });
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteHoliday error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
