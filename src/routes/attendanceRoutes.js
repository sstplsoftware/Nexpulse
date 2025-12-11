import express from "express";
import {
  saveSettings,
  getSettings,
  markAttendance,
  getTodayAttendance,
} from "../controllers/attendanceController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// ADMIN save settings
router.post("/settings", saveSettings);

// ADMIN or EMPLOYEE get settings
router.get("/settings", getSettings);

// EMPLOYEE get today's attendance
router.get("/today", getTodayAttendance);

// EMPLOYEE mark IN/OUT
router.post("/mark", markAttendance);

export default router;
