import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";
import {
  markHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";

const router = express.Router();

// 🔐 Auth required
router.use(authMiddleware);

// CREATE
router.post(
  "/mark",
  employeePermission("HOLIDAYS_MARK"),
  markHoliday
);

// READ  ✅ THIS WAS MISSING
router.get(
  "/",
  employeePermission("HOLIDAYS_VIEW"),
  getHolidays
);

// UPDATE
router.put(
  "/:id",
  employeePermission("HOLIDAYS_MARK"),
  updateHoliday
);

// DELETE
router.delete(
  "/:id",
  employeePermission("HOLIDAYS_MARK"),
  deleteHoliday
);

export default router;
