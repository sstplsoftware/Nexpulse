import Leave from "../models/Leave.js";
import User from "../models/User.js";

// EMPLOYEE REQUESTS LEAVE
export const requestLeave = async (req, res) => {
  try {
    const user = req.user;

    const leave = new Leave({
      employeeId: user._id,
      createdBy: user.createdBy,
      ...req.body,
    });

    await leave.save();

    res.json({ message: "Leave request submitted", leave });
  } catch (err) {
    res.status(500).json({ message: "Error submitting leave" });
  }
};

// EMPLOYEE VIEW LEAVE HISTORY
export const myLeaves = async (req, res) => {
  try {
    const list = await Leave.find({ employeeId: req.user._id });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Error loading leave history" });
  }
};

// ADMIN SEES LEAVE REQUESTS
export const adminLeaveRequests = async (req, res) => {
  try {
    const list = await Leave.find({ createdBy: req.user._id })
      .populate("employeeId", "profile.name");

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Error loading leave requests" });
  }
};

// ADMIN APPROVES OR REJECTS LEAVE
export const approveLeave = async (req, res) => {
  try {
    await Leave.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
    });

    res.json({ message: "Leave updated" });
  } catch (err) {
    res.status(500).json({ message: "Error approving leave" });
  }
};
