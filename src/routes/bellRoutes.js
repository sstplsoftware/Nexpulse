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

// All bell routes need user logged in
router.use(authMiddleware);

// =============================
// ONLY send & targets need permission
// =============================

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

// =============================
// DO NOT REQUIRE PERMISSION
// =============================

router.get(
  "/me/active",
  roleMiddleware(["ADMIN", "EMPLOYEE"]),
  getMyActiveBell
);

router.post(
  "/stop/:bellId",
  roleMiddleware(["ADMIN", "EMPLOYEE"]),
  stopBell
);

export default router;
