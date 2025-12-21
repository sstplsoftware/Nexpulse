// C:\NexPulse\backend\src\controllers\leaveController.js

import Leave from "../models/Leave.js";
import User from "../models/User.js";
import { resolveAdminId } from "../utils/resolveAdminId.js";

/* =====================================================
   HELPERS
===================================================== */
function daysBetween(from, to) {
  const d1 = new Date(from);
  const d2 = new Date(to);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

/* =====================================================
   EMPLOYEE: REQUEST LEAVE
===================================================== */
export async function requestLeave(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { type, from, to, days, isPaid, reason } = req.body;

    if (!type || !from || !to || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const computedDays = daysBetween(from, to);
    if (computedDays !== days) {
      return res.status(400).json({ message: "Invalid day count" });
    }

    const leave = await Leave.create({
      employeeId: req.user._id,
      adminId,
      type,
      fromDate: from,
      toDate: to,
      days,
      isPaid,
      reason,
    });

    return res.json({ ok: true, leave });
  } catch (err) {
    console.error("requestLeave error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =====================================================
   EMPLOYEE: MY LEAVES
===================================================== */
export async function getMyLeaves(req, res) {
  try {
    const adminId = resolveAdminId(req.user);

    const leaves = await Leave.find({
      employeeId: req.user._id,
      adminId,
    })
      .sort({ createdAt: -1 })
      .populate("approvedBy", "profile role")
      .lean();

    return res.json({ leaves });
  } catch (err) {
    console.error("getMyLeaves error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =====================================================
   ADMIN: PENDING LEAVES
===================================================== */
export async function getPendingLeaves(req, res) {
  try {
    const adminId = resolveAdminId(req.user);

    const leaves = await Leave.find({
      adminId,
      status: "PENDING",
    })
      .populate("employeeId", "profile employeeId")
      .lean();

    return res.json({ leaves });
  } catch (err) {
    console.error("getPendingLeaves error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =====================================================
   ADMIN: APPROVE / REJECT
===================================================== */
export async function updateLeaveStatus(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const leave = await Leave.findOne({
      _id: id,
      adminId,
    });

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status !== "PENDING") {
      return res.status(400).json({ message: "Leave already processed" });
    }

    leave.status = status;
    leave.rejectionReason = status === "REJECTED" ? rejectionReason || "" : "";
    leave.approvedBy = req.user._id;

    await leave.save();

    // ❗ IMPORTANT:
    // We DO NOT write Attendance here.
    // AttendanceController resolver will apply this leave automatically.

    return res.json({ ok: true });
  } catch (err) {
    console.error("updateLeaveStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* =====================================================
   LEAVE BALANCE (BASIC VERSION)
===================================================== */
export async function getLeaveBalance(req, res) {
  try {
    const adminId = resolveAdminId(req.user);
    const employeeId = req.user._id;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const currentYear = now.getFullYear();

    const approvedLeaves = await Leave.find({
      employeeId,
      adminId,
      status: "APPROVED",
    }).lean();

    let usedCLThisMonth = 0;
    let usedSLThisMonth = 0;
    let unusedCLCarry = 0;

    approvedLeaves.forEach((l) => {
      const leaveMonth = l.fromDate.slice(0, 7);
      const leaveYear = new Date(l.fromDate).getFullYear();

      // Monthly usage
      if (leaveMonth === currentMonth) {
        if (l.type === "CL") usedCLThisMonth += l.days;
        if (l.type === "SL") usedSLThisMonth += l.days;
      }

      // Carry-forward CL (unused months in same year)
      if (
        l.type === "CL" &&
        leaveYear === currentYear &&
        leaveMonth < currentMonth
      ) {
        unusedCLCarry += Math.max(0, 1 - l.days);
      }
    });

    const CL = Math.max(0, unusedCLCarry + (1 - usedCLThisMonth));
    const SL = Math.max(0, 1 - usedSLThisMonth);

    return res.json({
      CL,
      SL,
    });
  } catch (err) {
    console.error("getLeaveBalance error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}


/* =====================================================
   ADMIN: LEAVE HISTORY
===================================================== */
export async function getLeaveHistory(req, res) {
  try {
    const adminId = resolveAdminId(req.user);

    const leaves = await Leave.find({
      adminId,
      status: { $ne: "PENDING" },
    })
      .populate("employeeId", "profile")
      .populate("approvedBy", "profile role")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ leaves });
  } catch (err) {
    console.error("getLeaveHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
