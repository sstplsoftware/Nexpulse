import Holiday from "../models/Holiday.js";

export const createHoliday = async (req, res) => {
  try {
    const holiday = new Holiday(req.body);
    await holiday.save();
    res.json({ message: "Holiday added", holiday });
  } catch {
    res.status(500).json({ message: "Error creating holiday" });
  }
};

export const listHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find({});
    res.json(holidays);
  } catch {
    res.status(500).json({ message: "Error fetching holidays" });
  }
};
