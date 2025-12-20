// C:\NexPulse\backend\src\routes\salaryRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

import {
  getMySalary,
  getSalaryHistory,
  getAdminSalaries,
  createOrUpdateSalary,
  deleteSalary,
  markSalaryPaid,
} from "../controllers/salaryController.js";

const router = express.Router();

router.use(authMiddleware);

/* ================= EMPLOYEE ================= */
router.get("/my", roleMiddleware("EMPLOYEE"), getMySalary);
router.get("/my/history", roleMiddleware("EMPLOYEE"), getSalaryHistory);

/* ================= ADMIN ================= */
router.get("/admin", roleMiddleware("ADMIN"), getAdminSalaries);
router.post("/manage", roleMiddleware("ADMIN"), createOrUpdateSalary);
router.delete("/:id", roleMiddleware("ADMIN"), deleteSalary);
router.patch("/:id/pay", roleMiddleware("ADMIN"), markSalaryPaid);

export default router;
