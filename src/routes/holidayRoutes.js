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

router.use(authMiddleware);

// VIEW holidays
router.get(
  "/",
  adminOrEmployeePermission(PERMISSIONS.HOLIDAYS_VIEW),
  getHolidays
);

// MARK holiday
router.post(
  "/",
  adminOrEmployeePermission(PERMISSIONS.HOLIDAYS_MARK),
  markHoliday
);

// DELETE holiday
router.delete(
  "/:id",
  adminOrEmployeePermission(PERMISSIONS.HOLIDAYS_MARK),
  deleteHoliday
);

export default router;
