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

router.use(authMiddleware);

// fetch list of employee targets
router.get(
  "/targets",
  roleMiddleware("ADMIN", "EMPLOYEE"),
  employeePermission("BELL_RING"),
  getBellTargets
);

// send bell
router.post(
  "/ring",
  roleMiddleware("ADMIN", "EMPLOYEE"),
  employeePermission("BELL_RING"),
  sendBell
);

// check active bell
router.get(
  "/me/active",
  roleMiddleware("ADMIN", "EMPLOYEE"),
  getMyActiveBell
);

// stop bell
router.post(
  "/stop/:bellId",
  roleMiddleware("ADMIN", "EMPLOYEE"),
  stopBell
);

export default router;
