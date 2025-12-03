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

// HRM Controller
import {
  uploadHrmDocument,
  getMyHrmDocuments,
  sendHrmChatMessage,
  getHrmChatHistory,
  getUnreadHrmCount,
  markHrmChatRead,
} from "../controllers/hrmController.js";

import { hrmUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// =======================================
// GLOBAL GUARD → Must be logged-in Employee
// =======================================
router.use(authMiddleware, roleMiddleware("EMPLOYEE"));

// =======================================
// PROFILE
// =======================================
router.get("/profile", getMyProfile);

// =======================================
// HRM DOCUMENT UPLOAD
// =======================================
router.post(
  "/hrm/document/upload",
  employeePermission("UPLOAD_DOCUMENTS"),
  hrmUpload.single("file"),
  uploadHrmDocument
);

router.get(
  "/hrm/document/my",
  employeePermission("UPLOAD_DOCUMENTS"),
  getMyHrmDocuments
);

// =======================================
// HRM CHAT SYSTEM
// =======================================
router.get(
  "/hrm/chat/unread",
  employeePermission("CHAT_EMPLOYEE"),
  getUnreadHrmCount
);

router.post(
  "/hrm/chat/mark-read",
  employeePermission("CHAT_EMPLOYEE"),
  markHrmChatRead
);

router.post(
  "/hrm/chat/send",
  employeePermission("CHAT_EMPLOYEE"),
  sendHrmChatMessage
);

router.get(
  "/hrm/chat/history",
  employeePermission("CHAT_EMPLOYEE"),
  getHrmChatHistory
);

// =======================================
// EMPLOYEE INFO VIEW
// =======================================
router.get(
  "/employees",
  employeePermission("EMPLOYE_INFO_VIEW"),
  getVisibleEmployees
);

// =======================================
// PERMISSION BASED ROUTES
// =======================================
router.post(
  "/task-update",
  employeePermission("TASK_UPDATE"),
  taskUpdateHandler
);

router.post("/mis-manage", employeePermission("MIS_MANAGE"), misManageHandler);

router.get(
  "/tasks/view",
  employeePermission("TASK_VIEW"),
  getAllTasksForViewHandler
);

router.post(
  "/attendance/mark",
  employeePermission("ATTENDANCE_MARK"),
  attendanceMarkHandler
);

router.post(
  "/attendance/manage",
  employeePermission("ATTENDANCE_MANAGE"),
  attendanceManageHandler
);

router.get(
  "/attendance/view",
  employeePermission("ATTENDANCE_VIEW"),
  attendanceViewHandler
);

router.get(
  "/salary/view",
  employeePermission("SALARY_VIEW"),
  salaryViewHandler
);

router.post(
  "/salary/manage",
  employeePermission("SALARY_MANAGE"),
  salaryManageHandler
);

router.post(
  "/salary/generate-slip",
  employeePermission("GEN_SALARY_SLIP"),
  generateSalarySlipHandler
);

router.post(
  "/holidays/mark",
  employeePermission("HOLIDAYS_MARK"),
  holidaysMarkHandler
);

router.post(
  "/bell-ring",
  employeePermission("BELL_RING"),
  bellRingHandler
);

router.post(
  "/leave/request",
  employeePermission("LEAVE_REQUEST"),
  leaveRequestHandler
);

router.post(
  "/leave/approval",
  employeePermission("LEAVE_APPROVAL"),
  leaveApprovalHandler
);

router.post(
  "/chat/employee",
  employeePermission("CHAT_EMPLOYEE"),
  chatWithEmployeeHandler
);

router.post(
  "/chat/admin",
  employeePermission("CHAT_ADMIN"),
  chatWithAdminHandler
);

// =======================================
// DAILY TASK UPDATE SYSTEM
// =======================================
router.post(
  "/task-update/save",
  employeePermission("TASK_UPDATE"),
  saveTaskUpdateHandler
);

router.post(
  "/task-update/final",
  employeePermission("TASK_UPDATE"),
  submitFinalTaskHandler
);

router.get(
  "/task-update/history",
  employeePermission("TASK_UPDATE"),
  getLastTenTasksHandler
);

router.patch(
  "/task-update/:taskId",
  employeePermission("TASK_UPDATE"),
  updateTaskHandler
);

router.delete(
  "/task/:taskId",
  employeePermission("TASK_VIEW"),
  deleteTaskHandler
);

// =======================================
// ASSIGNED TASK SYSTEM
// =======================================
router.get(
  "/assignable/employees",
  employeePermission("TASK_ASSIGN"),
  getAssignableEmployees
);

router.post(
  "/assigned/create",
  employeePermission("TASK_ASSIGN"),
  assignTaskToEmployee
);

router.get(
  "/assigned/outbox",
  employeePermission("TASK_ASSIGN"),
  getTasksIAssigned
);

router.get(
  "/assigned/inbox",
  employeePermission("TASK_INBOX"),
  getMyAssignedTasks
);

router.patch(
  "/assigned/:taskId/respond",
  employeePermission("TASK_INBOX"),
  respondToAssignedTask
);

// =======================================
// EMPLOYEE CHAT → DROPDOWN LIST
// =======================================
router.get(
  "/chat/employees",
  employeePermission("CHAT_EMPLOYEE"),
  async (req, res) => {
    try {
      const user = req.user;

      const employees = await User.find({
        createdBy: user.createdBy,
        role: "EMPLOYEE",
        _id: { $ne: user._id },
      }).select("_id email profile.name");

      return res.json({ employees });
    } catch (err) {
      console.error("CHAT EMPLOYEE LIST ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
