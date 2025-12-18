import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { employeePermission } from "../middleware/permissionMiddleware.js";
import {
  markHoliday,
  listHolidays,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";

const router = express.Router();

router.use(authMiddleware);

/* CREATE */
router.post(
  "/mark",
  employeePermission("HOLIDAYS_MARK"),
  markHoliday
);

/* READ */
router.get(
  "/",
  employeePermission("HOLIDAYS_MARK"),
  listHolidays
);

/* UPDATE */
router.put(
  "/:id",
  employeePermission("HOLIDAYS_MARK"),
  updateHoliday
);

/* DELETE */
router.delete(
  "/:id",
  employeePermission("HOLIDAYS_MARK"),
  deleteHoliday
);

export default router;
