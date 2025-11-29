// C:\NexPulse\backend\src\routes\bellRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";

import {
  getBellTargets,
  sendBell,
  getMyActiveBell,
  stopBell,
} from "../controllers/bellController.js";

const router = express.Router();

// all bell routes require login
router.use(authMiddleware);

// ===============================
// ONLY THESE REQUIRE PERMISSION
// ===============================

router.get(
  "/targets",
  roleMiddleware(["ADMIN", "EMPLOYEE"]),
  employeePermission("BELL_RING"),
  getBellTargets
);

router.post(
  "/ring",
  roleMiddleware(["ADMIN", "EMPLOYEE"]),
  employeePermission("BELL_RING"),
  sendBell
);

// ===============================
// ❌ NO PERMISSION REQUIRED HERE
// ===============================

// anyone logged in can check bell status
router.get(
  "/me/active",
  roleMiddleware(["ADMIN", "EMPLOYEE"]),
  getMyActiveBell
);

// anyone logged in can stop ringing
router.post(
  "/stop/:bellId",
  roleMiddleware(["ADMIN", "EMPLOYEE"]),
  stopBell
);

export default router;
