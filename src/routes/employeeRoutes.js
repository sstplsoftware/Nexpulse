// C:\NexPulse\backend\src\routes\employeeRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";
import User from "../models/User.js";

import {
  getMyProfile,
  taskUpdateHandler,
  misManageHandler,
  attendanceMarkHandler,
  attendanceManageHandler,
  salaryViewHandler,
  salaryManageHandler,
  holidaysMarkHandler,
  attendanceViewHandler,
  bellRingHandler,
  generateSalarySlipHandler,
  uploadDocumentsHandler,
  leaveRequestHandler,
  leaveApprovalHandler,
  chatWithEmployeeHandler,
  chatWithAdminHandler,
  getVisibleEmployees,
} from "../controllers/employeeController.js";

import {
  saveTaskUpdateHandler,
  submitFinalTaskHandler,
  getLastTenTasksHandler,
  updateTaskHandler,
  getAllTasksForViewHandler,
  deleteTaskHandler,
} from "../controllers/taskController.js";

import {
  getAssignableEmployees,
  assignTaskToEmployee,
  getMyAssignedTasks,
  getTasksIAssigned,
  respondToAssignedTask,
} from "../controllers/assignedTaskController.js";

import {
  uploadHrmDocument,
  getMyHrmDocuments,
  sendHrmChatMessage,
  getHrmChatHistory,
  getUnreadHrmCount,
  markHrmChatRead
} from "../controllers/hrmController.js";

import { hrmUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// 🔥 APPLY ONLY AUTH — no role lock here
router.use(authMiddleware);

// ====================================================================
// EMPLOYEE-ONLY ROUTES
// ====================================================================
router.use(roleMiddleware("EMPLOYEE"));

// PROFILE
router.get("/profile", getMyProfile);

// HRM Documents
router.post(
  "/hrm/document/upload",
  employeePermission("UPLOAD_DOCUMENTS"),
  hrmUpload.single("file"),
  uploadHrmDocument
);

router.get("/hrm/document/my",
  employeePermission("UPLOAD_DOCUMENTS"),
  getMyHrmDocuments
);

// ====================================================================
// HRM CHAT ROUTES (ADMIN + EMPLOYEE BOTH)
// ====================================================================

// Send chat
router.post(
  "/hrm/chat/send",
  (req, res, next) => {
    if (req.user.role === "ADMIN") return next(); 
    return employeePermission("CHAT_EMPLOYEE")(req, res, next);
  },
  sendHrmChatMessage
);

// Chat history
router.get(
  "/hrm/chat/history",
  (req, res, next) => {
    if (req.user.role === "ADMIN") return next();
    return employeePermission("CHAT_EMPLOYEE")(req, res, next);
  },
  getHrmChatHistory
);

// Unread count
router.get(
  "/hrm/chat/unread",
  (req, res, next) => {
    if (req.user.role === "ADMIN") return next();
    return employeePermission("CHAT_EMPLOYEE")(req, res, next);
  },
  getUnreadHrmCount
);

// Mark read
router.post(
  "/hrm/chat/mark-read",
  (req, res, next) => {
    if (req.user.role === "ADMIN") return next();
    return employeePermission("CHAT_EMPLOYEE")(req, res, next);
  },
  markHrmChatRead
);

// Employee List for Chat
router.get(
  "/chat/employees",
  (req, res, next) => {
    if (req.user.role === "ADMIN") return next();
    return employeePermission("CHAT_EMPLOYEE")(req, res, next);
  },
  async (req, res) => {
    try {
      const user = req.user;
      const employees = await User.find({
        createdBy: user.createdBy,
        role: "EMPLOYEE",
        _id: { $ne: user._id }
      }).select("_id email profile.name");

      return res.json({ employees });
    } catch (err) {
      console.error("CHAT EMPLOYEE LIST ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// ====================================================================
// OLD EMPLOYEE MODULE ROUTES
// ====================================================================

router.post("/task-update",
  employeePermission("TASK_UPDATE"),
  taskUpdateHandler
);

router.post("/mis-manage",
  employeePermission("MIS_MANAGE"),
  misManageHandler
);

router.get("/tasks/view",
  employeePermission("TASK_VIEW"),
  getAllTasksForViewHandler
);

router.post("/attendance/mark",
  employeePermission("ATTENDANCE_MARK"),
  attendanceMarkHandler
);

router.post("/attendance/manage",
  employeePermission("ATTENDANCE_MANAGE"),
  attendanceManageHandler
);

router.get("/attendance/view",
  employeePermission("ATTENDANCE_VIEW"),
  attendanceViewHandler
);

router.get("/salary/view",
  employeePermission("SALARY_VIEW"),
  salaryViewHandler
);

router.post("/salary/manage",
  employeePermission("SALARY_MANAGE"),
  salaryManageHandler
);

router.post("/salary/generate-slip",
  employeePermission("GEN_SALARY_SLIP"),
  generateSalarySlipHandler
);

router.post("/holidays/mark",
  employeePermission("HOLIDAYS_MARK"),
  holidaysMarkHandler
);

router.post("/bell-ring",
  employeePermission("BELL_RING"),
  bellRingHandler
);

router.post("/leave/request",
  employeePermission("LEAVE_REQUEST"),
  leaveRequestHandler
);

router.post("/leave/approval",
  employeePermission("LEAVE_APPROVAL"),
  leaveApprovalHandler
);

// DAILY TASK CRUD
router.post("/task-update/save",
  employeePermission("TASK_UPDATE"),
  saveTaskUpdateHandler
);

router.post("/task-update/final",
  employeePermission("TASK_UPDATE"),
  submitFinalTaskHandler
);

router.get("/task-update/history",
  employeePermission("TASK_UPDATE"),
  getLastTenTasksHandler
);

router.patch("/task-update/:taskId",
  employeePermission("TASK_UPDATE"),
  updateTaskHandler
);

router.delete("/task/:taskId",
  employeePermission("TASK_VIEW"),
  deleteTaskHandler
);

// ASSIGNED TASK SYSTEM
router.get("/assignable/employees",
  employeePermission("TASK_ASSIGN"),
  getAssignableEmployees
);

router.post("/assigned/create",
  (req, res, next) => {
    if (req.user.role === "ADMIN") return next();
    return employeePermission("TASK_ASSIGN")(req, res, next);
  },
  assignTaskToEmployee
);

router.get("/assigned/outbox",
  employeePermission("TASK_ASSIGN"),
  getTasksIAssigned
);

router.get("/assigned/inbox",
  employeePermission("TASK_INBOX"),
  getMyAssignedTasks
);

router.patch("/assigned/:taskId/respond",
  employeePermission("TASK_INBOX"),
  respondToAssignedTask
);

export default router;
