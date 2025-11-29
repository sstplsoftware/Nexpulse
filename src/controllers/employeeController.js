// C:\NexPulse\backend\src\controllers\employeeController.js

import User from "../models/User.js";

// PROFILE: return all employee data (except password)
export async function getMyProfile(req, res) {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-passwordHash").lean();
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.json({ profile: user });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// PLACEHOLDER HANDLERS

export async function taskUpdateHandler(req, res) {
  return res.json({ ok: true, message: "Task update endpoint (to be implemented)" });
}

// ✅ NEW: TASK VIEW HANDLER
export async function taskViewHandler(req, res) {
  return res.json({
    ok: true,
    message: "Task View of all employee (to be implemented)",
  });
}

export async function misManageHandler(req, res) {
  return res.json({ ok: true, message: "MIS manage endpoint (to be implemented)" });
}

export async function attendanceMarkHandler(req, res) {
  return res.json({ ok: true, message: "Attendance mark endpoint (to be implemented)" });
}

export async function attendanceManageHandler(req, res) {
  return res.json({ ok: true, message: "Attendance manage endpoint (to be implemented)" });
}

export async function salaryViewHandler(req, res) {
  return res.json({ ok: true, message: "Salary view endpoint (to be implemented)" });
}

export async function salaryManageHandler(req, res) {
  return res.json({ ok: true, message: "Salary manage endpoint (to be implemented)" });
}

export async function holidaysMarkHandler(req, res) {
  return res.json({ ok: true, message: "Holidays mark endpoint (to be implemented)" });
}

export async function attendanceViewHandler(req, res) {
  return res.json({ ok: true, message: "Attendance view endpoint (to be implemented)" });
}

export async function bellRingHandler(req, res) {
  return res.json({ ok: true, message: "Bell ring endpoint (to be implemented)" });
}

export async function generateSalarySlipHandler(req, res) {
  return res.json({ ok: true, message: "Generate salary slip endpoint (to be implemented)" });
}

export async function uploadDocumentsHandler(req, res) {
  return res.json({ ok: true, message: "Upload documents endpoint (to be implemented)" });
}

export async function leaveRequestHandler(req, res) {
  return res.json({ ok: true, message: "Leave request endpoint (to be implemented)" });
}

export async function leaveApprovalHandler(req, res) {
  return res.json({ ok: true, message: "Leave approval endpoint (to be implemented)" });
}

export async function chatWithEmployeeHandler(req, res) {
  return res.json({ ok: true, message: "Chat with employee endpoint (to be implemented)" });
}

export async function chatWithAdminHandler(req, res) {
  return res.json({ ok: true, message: "Chat with admin endpoint (to be implemented)" });
}

// Get list of employees current user is allowed to see
export async function getVisibleEmployees(req, res) {
  try {
    // current logged-in user (EMPLOYEE)
    const me = await User.findById(req.user._id).select("role createdBy");

    if (!me) {
      return res.status(404).json({ message: "User not found" });
    }

    // Basic rule:
    // - Employee sees other employees created by the same admin (createdBy)
    const filter = {
      role: "EMPLOYEE",
      createdBy: me.createdBy, // same admin
    };

    const employees = await User.find(filter)
      .select(
        "profile email employeeId officialPhone personalPhone otherEmail"
      )
      .sort({ "profile.name": 1 });

    return res.json({
      ok: true,
      employees,
    });
  } catch (err) {
    console.error("getVisibleEmployees error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
