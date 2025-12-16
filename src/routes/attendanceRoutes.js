// C:\NexPulse\backend\src\routes\attendanceRoutes.js

import express from "express";
import {
  saveSettings,
  getSettings,
  markAttendance,
  getTodayAttendance,

  getManageAttendanceAllEmployees,
  getManageEmployeesAll,
  updateAttendance,
  deleteAttendance,
  getMyMonthlyAttendance,
} from "../controllers/attendanceController.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 AUTH REQUIRED FOR ALL
router.use(authMiddleware);

// ===============================
// SETTINGS
// ===============================
router.post("/settings", saveSettings);
router.get("/settings", getSettings);

router.get("/my", getMyMonthlyAttendance);
// ===============================
// EMPLOYEE
// ===============================

// EMPLOYEE SELF
router.get(
  "/today",
  employeePermission(PERMISSIONS.ATTENDANCE_VIEW),
  getTodayAttendance
);

router.post(
  "/mark",
  employeePermission(PERMISSIONS.ATTENDANCE_MARK),
  markAttendance
);

// ADMIN / MANAGER
router.get(
  "/manage",
  employeePermission(PERMISSIONS.ATTENDANCE_MANAGE),
  getManageAttendanceAllEmployees
);

router.get("/manage/employees", getManageEmployeesAll);

// ✅ ALIAS (IMPORTANT FIX)
// This fixes: GET /api/attendance/employees
router.get("/employees", getManageEmployeesAll);

// ===============================
// ADMIN ONLY
// ===============================
router.put("/manage/:id", updateAttendance);
router.delete("/manage/:id", deleteAttendance);

export default router;
