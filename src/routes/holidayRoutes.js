import { PERMISSIONS } from "../constants/permissions.js";

router.use(authMiddleware);

// CREATE
router.post(
  "/mark",
  employeePermission(PERMISSIONS.HOLIDAYS_MARK),
  markHoliday
);

// READ
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
