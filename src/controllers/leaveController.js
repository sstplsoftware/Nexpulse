import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";

/* =========================
   REQUEST LEAVE (EMPLOYEE)
========================= */
export const requestLeave = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE") {
      return res.status(403).json({ message: "EMPLOYEE only" });
    }

    const adminId = resolveAdminId(req.user);
    const employeeId = req.user._id;

    const { type, from, to, days, isPaid, reason } = req.body;

    if (!type || !from || !to || !days || !reason) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const leave = await Leave.create({
      employeeId,
      adminId,
      type,
      fromDate: from,
      toDate: to,
      days,
      isPaid,
      reason,
    });

    res.json({ ok: true, leave });
  } catch (err) {
    console.error("requestLeave", err);
    res.status(500).json({ message: "Failed to request leave" });
  }
};

/* =========================
   LIST MY LEAVES (EMPLOYEE)
========================= */
export const getMyLeaves = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const leaves = await Leave.find({ employeeId })
      .populate("approvedBy", "profile.name role") // ✅ ADD THIS
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ok: true, leaves });
  } catch (err) {
    res.status(500).json({ message: "Failed to load leaves" });
  }
};


/* =========================
   ADMIN: LIST PENDING LEAVES
========================= */
export const getPendingLeaves = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);

    const leaves = await Leave.find({
      adminId,
      status: "PENDING",
    })
      .populate("employeeId", "profile.name employeeId")
      .sort({ createdAt: -1 });

    res.json({ ok: true, leaves });
  } catch (err) {
    res.status(500).json({ message: "Failed to load requests" });
  }
};

/* =========================
   APPROVE / REJECT LEAVE
========================= */
export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const adminId = resolveAdminId(req.user);

    const leave = await Leave.findOne({ _id: id, adminId });
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    leave.status = status;
    leave.approvedBy = req.user._id;

    if (status === "REJECTED") {
      leave.rejectionReason = rejectionReason || "";
    }

    await leave.save();

    // 🔥 ATTENDANCE INTEGRATION (ONLY ON APPROVE)
    if (status === "APPROVED") {
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);

      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const dateKey = d.toISOString().slice(0, 10);

        await Attendance.findOneAndUpdate(
          {
            employeeId: leave.employeeId,
            adminId,
            date: dateKey,
          },
          {
            employeeId: leave.employeeId,
            adminId,
            date: dateKey,
            status: leave.isPaid
              ? `${leave.type}_PAID`
              : "Absent",
          },
          { upsert: true }
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("updateLeaveStatus", err);
    res.status(500).json({ message: "Failed to update leave" });
  }
};
/* =========================
   GET LEAVE BALANCE (EMPLOYEE)
========================= */
export const getLeaveBalance = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE") {
      return res.status(403).json({ message: "EMPLOYEE only" });
    }

    const employeeId = req.user._id;
    const adminId = resolveAdminId(req.user);

    const MONTHLY_CL = 1;
    const MONTHLY_SL = 1;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ✅ ONLY approved + paid leaves of current month
    const leaves = await Leave.find({
      employeeId,
      adminId,
      status: "APPROVED",
      isPaid: true,
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    let usedCL = 0;
    let usedSL = 0;

    leaves.forEach((l) => {
      if (l.type === "CL") usedCL += l.days;
      if (l.type === "SL") usedSL += l.days;
    });

    res.json({
      CL: Math.max(0, MONTHLY_CL - usedCL),
      SL: Math.max(0, MONTHLY_SL - usedSL),
    });
  } catch (err) {
    console.error("getLeaveBalance", err);
    res.status(500).json({ message: "Failed to load balance" });
  }
};
/* =========================
   GET LEAVE HISTORY (EMPLOYEE)
========================= */

export const getLeaveHistory = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);

    const leaves = await Leave.find({
      adminId,
      status: { $in: ["APPROVED", "REJECTED"] },
    })
      .populate("employeeId", "profile.name designation")
      .populate("approvedBy", "profile.name role")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ ok: true, leaves });
  } catch (err) {
    console.error("getLeaveHistory", err);
    res.status(500).json({ message: "Failed to load leave history" });
  }
};


