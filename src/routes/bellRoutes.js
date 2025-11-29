// C:\NexPulse\backend\src\routes\bellRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

import {
  getBellTargets,
  sendBell,
  getMyActiveBell,
  stopBell,
} from "../controllers/bellController.js";

const router = express.Router();

// All bell routes require login
router.use(authMiddleware);

// ======================================
// 🔥 SUPER ADMIN → can ring all employees
// 🔥 ADMIN → can ring employees created by HIM
// 🔥 EMPLOYEE → ring other employees
// No permissionMiddleware needed anymore
// ======================================

// Get employees
router.get(
  "/targets",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getBellTargets
);

// Ring bell
router.post(
  "/ring",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  sendBell
);

// Get active bell
router.get(
  "/me/active",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getMyActiveBell
);

// Stop bell
router.post(
  "/stop/:bellId",
  roleMiddleware("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  stopBell
);

export default router;
