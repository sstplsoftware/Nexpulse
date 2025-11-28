// C:\NexPulse\backend\src\controllers\assignedTaskController.js

import User from "../models/User.js";
import AssignedTask from "../models/AssignedTask.js";

/**
 * GET /api/employee/assignable/employees
 * Employees in same company (same createdBy)
 */
export async function getAssignableEmployees(req, res) {
  try {
    const me = await User.findById(req.user._id);

    if (!me) return res.status(401).json({ message: "User not found" });

    // If EMPLOYEE → same admin (createdBy)
    // If ADMIN (later) → their own employees
    const managerId =
      me.role === "ADMIN" ? me._id : me.createdBy || me._id;

    const employees = await User.find({
      role: "EMPLOYEE",
      createdBy: managerId,
      _id: { $ne: me._id }, // exclude self
    })
      .select("_id profile.name employeeId email")
      .sort({ "profile.name": 1 });

    return res.json({ employees });
  } catch (err) {
    console.error("getAssignableEmployees error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/employee/assigned/create
 * Body: { assignedTo, title, description, dueDate }
 */
export async function assignTaskToEmployee(req, res) {
  try {
    const { assignedTo, title, description, dueDate } = req.body;

    if (!assignedTo || !title) {
      return res.status(400).json({ message: "Employee and title are required" });
    }

    const fromUser = await User.findById(req.user._id);
    const toUser = await User.findById(assignedTo);

    if (!toUser || toUser.role !== "EMPLOYEE") {
      return res.status(400).json({ message: "Target employee not found" });
    }

    const task = await AssignedTask.create({
      title,
      description: description || "",
      dueDate: dueDate ? new Date(dueDate) : null,

      assignedBy: fromUser._id,
      assignedByName: fromUser.profile?.name || fromUser.email,
      assignedByEmployeeId: fromUser.employeeId || "",

      assignedTo: toUser._id,
      assignedToName: toUser.profile?.name || toUser.email,
      assignedToEmployeeId: toUser.employeeId || "",
    });

    return res.json({ ok: true, task });
  } catch (err) {
    console.error("assignTaskToEmployee error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /api/employee/assigned/inbox
 * Tasks assigned TO me
 */
export async function getMyAssignedTasks(req, res) {
  try {
    const tasks = await AssignedTask.find({ assignedTo: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ tasks });
  } catch (err) {
    console.error("getMyAssignedTasks error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /api/employee/assigned/outbox
 * Tasks I assigned to others
 */
export async function getTasksIAssigned(req, res) {
  try {
    const tasks = await AssignedTask.find({ assignedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ tasks });
  } catch (err) {
    console.error("getTasksIAssigned error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * PATCH /api/employee/assigned/:taskId/respond
 * Body: { status: "ACCEPTED" | "REJECTED", rejectReason? }
 */
export async function respondToAssignedTask(req, res) {
  try {
    const { taskId } = req.params;
    const { status, rejectReason } = req.body;

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await AssignedTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    task.status = status;
    task.respondedAt = new Date();
    task.rejectReason = status === "REJECTED" ? rejectReason || "" : "";
    await task.save();

    return res.json({ ok: true, task });
  } catch (err) {
    console.error("respondToAssignedTask error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
