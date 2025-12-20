// C:\NexPulse\backend\src\routes\attendanceRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

import {
  saveSettings,
  getSettings,
  markAttendance,
  getTodayAttendance,
  getMyMonthlyAttendance,
  getManageAttendance,
  getManageEmployeesAll,
  updateAttendance,
  deleteAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

// 🔐 AUTH REQUIRED
router.use(authMiddleware);

/* ================= SETTINGS ================= */
router.post("/settings", saveSettings);
router.get("/settings", getSettings);

/* ================= EMPLOYEE ================= */

// Monthly self attendance
router.get("/my", getMyMonthlyAttendance);

// Today status
router.get(
  "/today",
  employeePermission(PERMISSIONS.ATTENDANCE_VIEW),
  getTodayAttendance
);

// Mark IN / OUT
router.post(
  "/mark",
  employeePermission(PERMISSIONS.ATTENDANCE_MARK),
  markAttendance
);

/* ================= ADMIN / HR ================= */

// 🔥 SINGLE SOURCE OF TRUTH
// ?month=YYYY-MM
// ?employeeId=optional
router.get(
  "/manage",
  employeePermission(PERMISSIONS.ATTENDANCE_MANAGE),
  getManageAttendance
);

// Employee dropdown
router.get("/employees", getManageEmployeesAll);

/* ================= ADMIN ONLY ================= */

router.put("/manage/:id", updateAttendance);
router.delete("/manage/:id", deleteAttendance);

export default router;
