// C:\NexPulse\backend\src\routes\holidayRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOrEmployeePermission } from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

import {
  markHoliday,
  getHolidays,
  deleteHoliday,
} from "../controllers/holidayController.js";

const router = express.Router();

// 🔐 AUTH REQUIRED
router.use(authMiddleware);

/* ================= VIEW ================= */

// Employee + Admin can view
router.get(
  "/",
  adminOrEmployeePermission(PERMISSIONS.HOLIDAYS_VIEW),
  getHolidays
);

/* ================= ADMIN ================= */

// Mark holiday
router.post(
  "/",
  adminOrEmployeePermission(PERMISSIONS.HOLIDAYS_MARK),
  markHoliday
);

// Delete holiday
router.delete(
  "/:id",
  adminOrEmployeePermission(PERMISSIONS.HOLIDAYS_MARK),
  deleteHoliday
);

export default router;
