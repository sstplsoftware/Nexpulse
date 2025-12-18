import Holiday from "../models/Holiday.js";

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
