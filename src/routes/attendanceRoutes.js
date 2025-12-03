import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  markAttendance,
  manageAttendance,
  viewAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/mark", authMiddleware, markAttendance);
router.get("/manage", authMiddleware, manageAttendance);
router.get("/view", authMiddleware, viewAttendance);

export default router;
