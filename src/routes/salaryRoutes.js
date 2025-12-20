import express from "express";
import {
  upsertSalary,
  adminSalaryList,
  mySalaryByMonth,
  mySalaryHistory,
  deleteSalary,
} from "../controllers/salaryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

/* ================= EMPLOYEE ================= */
router.get(
  "/my",
  authMiddleware,
  roleMiddleware("employee"),
  mySalaryByMonth
);

router.get(
  "/my/history",
  authMiddleware,
  roleMiddleware("employee"),
  mySalaryHistory
);

/* ================= ADMIN ================= */
router.post(
  "/manage",
  authMiddleware,
  roleMiddleware("admin"),
  upsertSalary
);

router.get(
  "/admin",
  authMiddleware,
  roleMiddleware("admin"),
  adminSalaryList
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  deleteSalary
);

export default router;
