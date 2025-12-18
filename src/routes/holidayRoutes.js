import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

import {
  markHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";

const router = express.Router();

// 🔐 Auth required
router.use(authMiddleware);

// CREATE – Admin OR Employee with HOLIDAYS_MARK
router.post(
  "/mark",
  employeePermission(PERMISSIONS.HOLIDAYS_MARK),
  markHoliday
);

// READ – Admin OR Employee with HOLIDAYS_VIEW
router.get(
  "/",
  employeePermission(PERMISSIONS.HOLIDAYS_VIEW),
  getHolidays
);

// UPDATE
router.put(
  "/:id",
  employeePermission(PERMISSIONS.HOLIDAYS_MARK),
  updateHoliday
);

// DELETE
router.delete(
  "/:id",
  employeePermission(PERMISSIONS.HOLIDAYS_MARK),
  deleteHoliday
);

export default router;
