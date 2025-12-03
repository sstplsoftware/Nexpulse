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
  getHrmDocumentsForAdmin,
  sendHrmChatMessage,
  getHrmChatHistory,
  getUnreadHrmCount,
  markHrmChatRead,
} from "../controllers/hrmController.js";

// ✅ REPLACE OLD WRONG CONTROLLERS WITH FIXED ONES
import {
  getAllTasksForViewHandler,
  deleteTaskHandler,
} from "../controllers/taskController.js";

import {
  getTasksIAssigned,
  getMyAssignedTasks,
  assignTaskToEmployee,
} from "../controllers/assignedTaskController.js";

const router = express.Router();

router.use(authMiddleware, roleMiddleware("ADMIN"));

// ======================================================
// EMPLOYEE CRUD
// ======================================================
router.get("/employees", getEmployees);
router.post("/employees", createEmployee);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
router.get("/employees/:id", getSingleEmployee);

// View all employee docs (UNDER THIS ADMIN ONLY)
router.get("/hrm/documents", getHrmDocumentsForAdmin);

// Admin chat with employee
router.post("/hrm/chat/send", sendHrmChatMessage);
router.get("/hrm/chat/history", getHrmChatHistory);

// ======================================================
// ADMIN TASK VIEW  (🔥 FIXED)
// ======================================================

// ✔ Admin sees ALL tasks of ALL employees under him
router.get("/tasks/all", getAllTasksForViewHandler);

// ✔ Admin deletes a task
router.delete("/task/:taskId", deleteTaskHandler);


router.get("/hrm/chat/unread", getUnreadHrmCount);
router.post("/hrm/chat/mark-read", markHrmChatRead);


// ======================================================
// ADMIN ASSIGNED TASK SYSTEM
// ======================================================

// ✔ Tasks assigned TO admin (Inbox)
router.get("/assigned/inbox", getMyAssignedTasks);

// ✔ Tasks admin assigned to employees (Outbox)
router.get("/assigned/outbox", getTasksIAssigned);

// ✔ Assign new task to employee
router.post(
  "/task/assign",
  authMiddleware,
  roleMiddleware("ADMIN"),
  assignTaskToEmployee
);

export default router;
