// C:\NexPulse\backend\src\routes\employeeRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";

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
} from "../controllers/employeeController.js";

import {
  saveTaskUpdateHandler,
  submitFinalTaskHandler,
  getLastTenTasksHandler,
  updateTaskHandler,
  getAllTasksForViewHandler,
  deleteTaskHandler,
} from "../controllers/taskController.js";

const router = express.Router();

// ✅ All employee routes require valid token + EMPLOYEE role
router.use(authMiddleware, roleMiddleware("EMPLOYEE"));

// ==========================
// PROFILE
// ==========================
router.get("/profile", getMyProfile);

// ==========================
// PERMISSION-BASED MODULE ROUTES
// ==========================
router.post(
  "/task-update",
  employeePermission("TASK_UPDATE"),
  taskUpdateHandler
);

router.post(
  "/mis-manage",
  employeePermission("MIS_MANAGE"),
  misManageHandler
);

// ✅ TASK VIEW: ALL EMPLOYEES (for users having TASK_VIEW permission)
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
  "/documents/upload",
  employeePermission("UPLOAD_DOCUMENTS"),
  uploadDocumentsHandler
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

// ==========================
// TASK UPDATE SYSTEM (SELF CRUD)
// ==========================

// SAVE (DRAFT)
router.post(
  "/task-update/save",
  employeePermission("TASK_UPDATE"),
  saveTaskUpdateHandler
);

// FINAL SUBMIT (LOCK)
router.post(
  "/task-update/final",
  employeePermission("TASK_UPDATE"),
  submitFinalTaskHandler
);

// HISTORY (LAST 10 DAYS)
router.get(
  "/task-update/history",
  employeePermission("TASK_UPDATE"),
  getLastTenTasksHandler
);

// UPDATE TASK (EDIT SELF)
router.patch(
  "/task-update/:taskId",
  employeePermission("TASK_UPDATE"),
  updateTaskHandler
);

// ==========================
// TASK DELETE (FOR VIEWERS / MANAGERS)
// ==========================
router.delete(
  "/task/:taskId",
  employeePermission("TASK_VIEW"),
  deleteTaskHandler
);

export default router;
