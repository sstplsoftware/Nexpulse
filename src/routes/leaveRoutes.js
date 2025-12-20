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
   getLeaveHistory, // ✅ IMPORT
} from "../controllers/leaveController.js";

const router = express.Router();
router.use(authMiddleware);

// EMPLOYEE
router.post(
  "/request",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_REQUEST),
  requestLeave
);

router.get(
  "/my",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_REQUEST),
  getMyLeaves
);

// ADMIN / APPROVER
router.get(
  "/pending",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_APPROVAL),
  getPendingLeaves
);

router.put(
  "/:id/status",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_APPROVAL),
  updateLeaveStatus
);
router.get(
  "/balance",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_REQUEST),
  getLeaveBalance
);

// ✅ ADD THIS
router.get(
  "/history",
  adminOrEmployeePermission(PERMISSIONS.LEAVE_APPROVAL),
  getLeaveHistory
);

export default router;
