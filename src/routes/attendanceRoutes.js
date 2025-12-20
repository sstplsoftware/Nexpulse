// C:\NexPulse\backend\src\routes\attendanceRoutes.js

import express from "express";
import {
  saveSettings,
  getSettings,
  markAttendance,
  getTodayAttendance,
  getManageAttendance,       // ✅ SINGLE unified controller
  getManageEmployeesAll,
  updateAttendance,
  deleteAttendance,
  getMyMonthlyAttendance,
} from "../controllers/attendanceController.js";

import { employeePermission } from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 AUTH REQUIRED
router.use(authMiddleware);

// ===============================
// SETTINGS (ADMIN)
// ===============================
router.post(
  "/settings",
  employeePermission(PERMISSIONS.ATTENDANCE_MANAGE),
  saveSettings
);

router.get(
  "/settings",
  employeePermission(PERMISSIONS.ATTENDANCE_MARK),
  getSettings
);

// ===============================
// EMPLOYEE SELF
// ===============================
router.get(
  "/today",
  employeePermission(PERMISSONS.ATTENDANCE_VIEW),
  getTodayAttendance
);

router.post(
  "/mark",
  employeePermission(PERMISSONS.ATTENDANCE_MARK),
  markAttendance
);

router.get(
  "/my",
  employeePermission(PERMISSONS.ATTENDANCE_VIEW),
  getMyMonthlyAttendance
);

// ===============================
// ADMIN / HR
// ===============================
router.get(
  "/manage",
  employeePermission(PERMISSONS.ATTENDANCE_MANAGE),
  getManageAttendance // 🔥 handles ALL / single employee / month
);

router.get(
  "/manage/employees",
  employeePermission(PERMISSONS.ATTENDANCE_MANAGE),
  getManageEmployeesAll
);

// ✅ ALIAS (frontend compatibility)
router.get(
  "/employees",
  employeePermission(PERMISSONS.ATTENDANCE_MANAGE),
  getManageEmployeesAll
);

// ===============================
// ADMIN EDIT
// ===============================
router.put(
  "/manage/:id",
  employeePermission(PERMISSONS.ATTENDANCE_MANAGE),
  updateAttendance
);

router.delete(
  "/manage/:id",
  employeePermission(PERMISSONS.ATTENDANCE_MANAGE),
  deleteAttendance
);

export default router;
