import Holiday from "../models/Holiday.js";

/* ==============================
   CREATE HOLIDAY
============================== */
export async function markHoliday(req, res) {
  try {
    const adminId = req.user.createdBy || req.user._id;
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

    await Holiday.create({
      adminId,
      date: holidayDate,
      name: holidayName,
      description,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("markHoliday error", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ==============================
   LIST HOLIDAYS
============================== */
export async function listHolidays(req, res) {
  try {
    const adminId = req.user.createdBy || req.user._id;

    const holidays = await Holiday.find({ adminId })
      .sort({ date: 1 })
      .lean();

    res.json({ ok: true, holidays });
  } catch (err) {
    console.error("listHolidays error", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ==============================
   UPDATE HOLIDAY
============================== */
export async function updateHoliday(req, res) {
  try {
    const adminId = req.user.createdBy || req.user._id;
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

    res.json({ ok: true });
  } catch (err) {
    console.error("updateHoliday error", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ==============================
   DELETE HOLIDAY
============================== */
export async function deleteHoliday(req, res) {
  try {
    const adminId = req.user.createdBy || req.user._id;
    const { id } = req.params;

    const holiday = await Holiday.findOneAndDelete({
      _id: id,
      adminId,
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("deleteHoliday error", err);
    res.status(500).json({ message: "Server error" });
  }
}
