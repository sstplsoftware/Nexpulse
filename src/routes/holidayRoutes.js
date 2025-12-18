import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";
import { markHoliday } from "../controllers/holidayController.js";

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/mark",
  employeePermission("HOLIDAYS_MARK"),
  markHoliday
);

export default router;
