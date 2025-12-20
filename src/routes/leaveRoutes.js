// C:\NexPulse\backend\src\routes\leaveRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOrEmployeePermission } from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

import {
  requestLeave,
  getMyLeaves,
  getPendingLeaves,
  updateLeaveStatus,
  getLeaveBalance,
  getLeaveHistory,
} from "../controllers/leaveController.js";

const router = express.Router();

// 🔐 AUTH REQUIRED
router.use(authMiddleware);

/* ================= EMPLOYEE ================= */

// Apply leave
router.post(
  "/request",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_REQUEST),
  requestLeave
);

// Employee leave history
router.get(
  "/my",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_REQUEST),
  getMyLeaves
);

// Leave balance
router.get(
  "/balance",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_REQUEST),
  getLeaveBalance
);

/* ================= ADMIN / APPROVER ================= */

// Pending approvals
router.get(
  "/pending",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_APPROVAL),
  getPendingLeaves
);

// Approve / Reject
router.put(
  "/:id/status",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_APPROVAL),
  updateLeaveStatus
);

// Approval history
router.get(
  "/history",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_APPROVAL),
  getLeaveHistory
);

export default router;
