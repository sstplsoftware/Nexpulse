import Task from "../models/Task.js";

export async function getAllTasksForAdmin(req, res) {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json({ ok: true, tasks });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteTaskByAdmin(req, res) {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await task.deleteOne();
    res.json({ ok: true, message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}
