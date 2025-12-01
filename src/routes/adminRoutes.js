// C:\NexPulse\backend\src\routes\adminRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getSingleEmployee,
} from "../controllers/adminController.js";

import {
  getAllTasksForAdmin,
  deleteTaskByAdmin,
} from "../controllers/adminTaskController.js";

import {
  getTasksIAssigned,
  getMyAssignedTasks,
  assignTaskToEmployee,
} from "../controllers/assignedTaskController.js";

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN"));

// EMPLOYEE CRUD
router.get("/employees", getEmployees);
router.post("/employees", createEmployee);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
router.get("/employees/:id", getSingleEmployee);

// Admin all task view
router.get("/tasks/all", getAllTasksForAdmin);

// Admin delete a task
router.delete("/task/:taskId", deleteTaskByAdmin);

// ==========================
// ADMIN TASK MODULE FIX
// ==========================

// ✔ Inbox (tasks assigned TO admin)
router.get("/assigned/inbox", getMyAssignedTasks);

// ✔ Outbox (tasks admin assigned to others)
router.get("/assigned/outbox", getTasksIAssigned);

router.post("/task/assign",authMiddleware,roleMiddleware("ADMIN"),assignTaskToEmployee);

export default router;
