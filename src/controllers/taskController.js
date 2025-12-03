// C:\NexPulse\backend\src\controllers\taskController.js

import Task from "../models/Task.js";
import User from "../models/User.js";

// =============================
// SAVE TASK (DRAFT)
// =============================
export async function saveTaskUpdateHandler(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const { morningTask, eveningUpdate } = req.body;

    let todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Find today's task
    let task = await Task.findOne({
      employeeId: user._id,
      createdAt: { $gte: todayStart },
    });

    // Create new task
    if (!task) {
      task = new Task({
        employeeId: user._id,
        createdBy: user.createdBy,              // 🔥 FIX: link task to admin
        employeeName: user.profile.name,
        employeeCustomId: user.employeeId,
        morningTask,
        eveningUpdate,
        isFinal: false,
        editCount: 0,
        finalSubmittedAt: null,
      });
    } else {
      // Prevent editing if final
      if (task.isFinal) {
        return res
          .status(400)
          .json({ message: "Final submitted, cannot edit." });
      }

      task.morningTask = morningTask;
      task.eveningUpdate = eveningUpdate;
    }

    await task.save();

    return res.json({ ok: true, task });
  } catch (err) {
    console.log("saveTaskUpdateHandler error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
}

// =============================
// FINAL SUBMIT (LOCK)
// =============================
export async function submitFinalTaskHandler(req, res) {
  try {
    let todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let task = await Task.findOne({
      employeeId: req.user._id,
      createdAt: { $gte: todayStart },
    });

    if (!task) {
      return res.status(400).json({ message: "No task found today" });
    }

    task.isFinal = true;
    task.finalSubmittedAt = new Date();
    task.editCount = 0;
    await task.save();

    return res.json({ ok: true, message: "Task Final Submitted" });
  } catch (err) {
    console.log("submitFinalTaskHandler error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
}

// =============================
// GET LAST 10 TASKS (SELF)
// =============================
export async function getLastTenTasksHandler(req, res) {
  try {
    const tasks = await Task.find({ employeeId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({ ok: true, tasks });
  } catch (err) {
    console.log("getLastTenTasksHandler error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
}

// =============================
// UPDATE OLD TASK WITH LIMITS
// =============================
export async function updateTaskHandler(req, res) {
  try {
    const { taskId } = req.params;
    const { morningTask, eveningUpdate } = req.body;

    const task = await Task.findById(taskId);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.employeeId)
      return res.status(400).json({ message: "Invalid task" });

    // Check ownership
    if (task.employeeId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not allowed" });

    // Check edit limit
    if (task.editCount >= 2) {
      return res
        .status(400)
        .json({ message: "You have reached your 2 edits limit for this task" });
    }

    // Check final submit restriction
    if (task.finalSubmittedAt) {
      const hoursPassed =
        (Date.now() - new Date(task.finalSubmittedAt).getTime()) /
        (1000 * 60 * 60);

      if (hoursPassed > 6) {
        return res.status(400).json({
          message: "Editing closed. Final submit passed 6 hours ago.",
        });
      }
    }

    task.morningTask = morningTask;
    task.eveningUpdate = eveningUpdate;
    task.isFinal = false;
    task.editCount = (task.editCount || 0) + 1;

    await task.save();

    return res.json({
      ok: true,
      message: "Task updated successfully",
      task,
    });
  } catch (err) {
    console.error("updateTaskHandler ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// =============================
// TASK VIEW (ADMIN + EMPLOYEE ONLY)
// =============================
export async function getAllTasksForViewHandler(req, res) {
  try {
    const user = req.user;

    let filter = {};

    // -----------------------------
    // ADMIN → sees tasks ONLY from his employees
    // -----------------------------
    if (user.role === "ADMIN") {
      filter = { createdBy: user._id };          // 🔥 FIX
    }

    // -----------------------------
    // EMPLOYEE → sees tasks of employees under same admin
    // -----------------------------
    if (user.role === "EMPLOYEE") {
      filter = { createdBy: user.createdBy };    // 🔥 FIX
    }

    // GET tasks of that admin group
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ ok: true, tasks });
  } catch (err) {
    console.error("getAllTasksForViewHandler ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// =============================
// DELETE TASK
// =============================
export async function deleteTaskHandler(req, res) {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await task.deleteOne();

    return res.json({ ok: true, message: "Task deleted successfully" });
  } catch (err) {
    console.error("deleteTaskHandler ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
