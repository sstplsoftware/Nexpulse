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

// get list of employees/admins that can receive bell
router.get(
  "/targets",
  roleMiddleware(["admin", "employee"]),
  employeePermission("BELL_RING"),
  getBellTargets
);

// send bell from admin/employee -> others
router.post(
  "/ring",
  roleMiddleware(["admin", "employee"]),
  employeePermission("BELL_RING"),
  sendBell
);

// current user: check if any active bell for me
router.get(
  "/me/active",
  roleMiddleware(["admin", "employee"]),
  getMyActiveBell
);

// stop bell (current user)
router.post(
  "/stop/:bellId",
  roleMiddleware(["admin", "employee"]),
  stopBell
);

export default router;
