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
} from "../controllers/attendanceController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

// SETTINGS
router.post("/settings", saveSettings);
router.get("/settings", getSettings);

// EMPLOYEE
router.get("/today", getTodayAttendance);
router.post("/mark", markAttendance);

// MANAGE (ADMIN + permitted EMPLOYEE)
router.get("/manage", getManageAttendanceAllEmployees);
router.get("/manage/employees", getManageEmployeesAll);

// ADMIN ONLY
router.put("/manage/:id", updateAttendance);
router.delete("/manage/:id", deleteAttendance);

export default router;
