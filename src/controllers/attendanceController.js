import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

// MARK ATTENDANCE (Employee)
export const markAttendance = async (req, res) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().split("T")[0];

    const att = new Attendance({
      userId: user._id,
      createdBy: user.createdBy,
      date: today,
      status: req.body.status,
    });

    await att.save();

    res.json({ message: "Attendance marked", att });
  } catch (err) {
    res.status(500).json({ message: "Error marking attendance" });
  }
};

// ATTENDANCE MANAGE (Admin)
export const manageAttendance = async (req, res) => {
  try {
    const adminId = req.user._id;

    const data = await Attendance.find({ createdBy: adminId })
      .populate("userId", "profile.name email");

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error loading attendance" });
  }
};

// ATTENDANCE VIEW (Admin + Employee)
export const viewAttendance = async (req, res) => {
  try {
    const user = req.user;

    let filter = {};

    if (user.role === "EMPLOYEE") {
      filter.userId = user._id;
    } else {
      filter.createdBy = user._id;
    }

    const data = await Attendance.find(filter)
      .sort({ time: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance" });
  }
};
